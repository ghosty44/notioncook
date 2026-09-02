import { describe, expect, it } from 'vitest';
import {
  aggregateShoppingList,
  formatQuantities,
  isRecurringDue,
  isUnmapped,
  type PlannedIngredient,
} from '@/lib/domain/shopping-list';

function planned(over: Partial<PlannedIngredient> = {}): PlannedIngredient {
  return {
    ingredientId: 'ing-lentilles',
    label: 'Lentilles corail',
    aisle: 'epicerie_salee',
    quantity: 200,
    unit: 'g',
    isPantryStaple: false,
    ...over,
  };
}

describe('aggregateShoppingList', () => {
  it('exclut les ingrédients du placard', () => {
    const items = aggregateShoppingList({
      planned: [
        planned(),
        planned({ ingredientId: 'ing-huile', label: 'Huile olive', isPantryStaple: true }),
      ],
    });

    expect(items.map((i) => i.label)).toEqual(['Lentilles corail']);
  });

  it('somme les quantités du même ingrédient venu de deux repas', () => {
    const items = aggregateShoppingList({
      planned: [planned({ quantity: 200 }), planned({ quantity: 300 })],
    });

    expect(items).toHaveLength(1);
    expect(formatQuantities(items[0].quantities)).toBe('500 g');
  });

  it('convertit avant de sommer', () => {
    const items = aggregateShoppingList({
      planned: [planned({ quantity: 800 }), planned({ quantity: 1, unit: 'kg' })],
    });

    expect(formatQuantities(items[0].quantities)).toBe('1,8 kg');
  });

  it('garde les unités incompatibles côte à côte plutôt que de les perdre', () => {
    const items = aggregateShoppingList({
      planned: [
        planned({ ingredientId: 'ing-coco', label: 'Lait de coco', quantity: 40, unit: 'cl' }),
        planned({ ingredientId: 'ing-coco', label: 'Lait de coco', quantity: 1, unit: 'boîte' }),
      ],
    });

    expect(items).toHaveLength(1);
    expect(formatQuantities(items[0].quantities)).toBe('40 cl + 1 boîte');
  });

  it('garde une ligne sans quantité, un oubli coûte plus cher qu’une imprécision', () => {
    const items = aggregateShoppingList({
      planned: [planned({ quantity: null, unit: null })],
    });

    expect(items).toHaveLength(1);
    expect(items[0].quantities).toEqual([]);
  });

  it('regroupe les lignes en texte libre sur leur libellé', () => {
    const items = aggregateShoppingList({
      planned: [
        planned({ ingredientId: null, label: 'Herbes fraîches', quantity: 1, unit: 'botte' }),
        planned({ ingredientId: null, label: 'herbes fraîches', quantity: 2, unit: 'botte' }),
      ],
    });

    expect(items).toHaveLength(1);
    expect(formatQuantities(items[0].quantities)).toBe('3 botte');
  });

  it('trie dans l’ordre de parcours du magasin, pas alphabétiquement', () => {
    const items = aggregateShoppingList({
      planned: [
        planned({ ingredientId: 'a', label: 'Ananas', aisle: 'fruits_legumes' }),
        planned({ ingredientId: 'b', label: 'Bavette', aisle: 'boucherie' }),
        planned({ ingredientId: 'c', label: 'Couches', aisle: 'bebe' }),
        planned({ ingredientId: 'd', label: 'Crème', aisle: 'cremerie' }),
      ],
    });

    expect(items.map((i) => i.label)).toEqual(['Ananas', 'Bavette', 'Crème', 'Couches']);
  });

  it('résout le produit préféré de l’enseigne', () => {
    const items = aggregateShoppingList({
      planned: [planned()],
      preferredProducts: [
        {
          id: 'prod-1',
          ingredientId: 'ing-lentilles',
          label: 'Lentilles corail bio 500 g',
          brand: 'Marque Repère',
          format: '500 g',
          productUrl: 'https://drive.example/p/1',
        },
      ],
    });

    expect(items[0].product?.label).toBe('Lentilles corail bio 500 g');
    expect(isUnmapped(items[0])).toBe(false);
  });

  it('signale comme « à mapper » une ligne sans produit résolu', () => {
    const items = aggregateShoppingList({ planned: [planned()] });
    expect(isUnmapped(items[0])).toBe(true);
  });

  it('ajoute le socle récurrent et fusionne s’il double un ingrédient planifié', () => {
    const items = aggregateShoppingList({
      planned: [planned({ ingredientId: 'ing-lait', label: 'Lait', quantity: 1, unit: 'l' })],
      recurring: [
        {
          productId: 'prod-lait',
          ingredientId: 'ing-lait',
          label: 'Lait',
          aisle: 'cremerie',
          quantity: 2,
          unit: 'l',
        },
        {
          productId: 'prod-couches',
          ingredientId: 'ing-couches',
          label: 'Couches taille 4',
          aisle: 'bebe',
          quantity: 1,
          unit: 'paquet',
        },
      ],
    });

    const lait = items.find((i) => i.label === 'Lait')!;
    expect(formatQuantities(lait.quantities)).toBe('3 l');
    expect(lait.productId).toBe('prod-lait');
    expect(items.map((i) => i.source)).toContain('recurring');
  });
});

describe('isRecurringDue', () => {
  const now = new Date('2026-09-02T08:00:00Z');

  it('est dû si jamais ajouté', () => {
    expect(isRecurringDue({ frequencyWeeks: 2, lastAddedAt: null }, now)).toBe(true);
  });

  it('est dû quand la fréquence est écoulée', () => {
    expect(isRecurringDue({ frequencyWeeks: 1, lastAddedAt: '2026-08-25T08:00:00Z' }, now)).toBe(
      true,
    );
  });

  it('ne l’est pas avant', () => {
    expect(isRecurringDue({ frequencyWeeks: 2, lastAddedAt: '2026-08-29T08:00:00Z' }, now)).toBe(
      false,
    );
  });
});
