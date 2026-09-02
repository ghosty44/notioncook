import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from './harness';
import { createHousehold } from '@/lib/domain/households';
import { createMeal } from '@/lib/domain/meals';
import { getWeekPlan, setPlanEntry, weekStartOf } from '@/lib/domain/plan';
import { createStore, listUnmappedIngredients, setProductPreference } from '@/lib/domain/products';
import {
  addRecurringItem,
  addToShoppingList,
  generateShoppingList,
  getRecurringItems,
  getShoppingList,
  setListItemChecked,
} from '@/lib/domain/shopping';
import { DomainError } from '@/lib/errors';
import type { Session } from '@/lib/auth/session';

let teardown: () => Promise<void>;
let session: Session;
let storeId: string;
let curryId: string;

const MONDAY = '2026-09-07';
const SUNDAY = '2026-09-13';

beforeAll(async () => {
  teardown = await createTestDatabase();
  session = await createHousehold({
    householdName: 'Maison',
    name: 'Camille',
    email: 'camille@exemple.fr',
  });

  storeId = (await createStore(session.householdId, { name: 'E.Leclerc Drive' })).id;

  const curry = await createMeal(session.householdId, {
    name: 'Curry de lentilles coco',
    ingredients: [
      { name: 'Lentilles corail', quantity: 200, unit: 'g' },
      { name: 'Lait de coco', quantity: 40, unit: 'cl' },
      { name: 'Huile olive', isPantryStaple: true },
    ],
  });
  curryId = curry.id;

  await createMeal(session.householdId, {
    name: 'Dahl express',
    ingredients: [{ name: 'Lentilles corail', quantity: 150, unit: 'g' }],
  });
});

afterAll(async () => {
  await teardown();
});

describe('planning', () => {
  it('rend une grille complète de 7 jours et 2 créneaux', async () => {
    const cells = await getWeekPlan(session.householdId, MONDAY);
    expect(cells).toHaveLength(14);
    expect(cells.every((cell) => cell.mealId === null)).toBe(true);
  });

  it('calcule le lundi de la semaine, quel que soit le jour donné', () => {
    expect(weekStartOf('2026-09-09')).toBe(MONDAY);
    expect(weekStartOf('2026-09-13')).toBe(MONDAY);
    expect(weekStartOf(MONDAY)).toBe(MONDAY);
  });

  it('planifie un repas puis le remplace sans doublonner la case', async () => {
    await setPlanEntry(session.householdId, { date: MONDAY, slot: 'soir', mealId: curryId });
    await setPlanEntry(session.householdId, {
      date: MONDAY,
      slot: 'soir',
      mealName: 'Dahl express',
    });

    const cells = await getWeekPlan(session.householdId, MONDAY);
    const cell = cells.find((c) => c.date === MONDAY && c.slot === 'soir')!;
    expect(cell.mealName).toBe('Dahl express');
    expect(cells.filter((c) => c.date === MONDAY && c.slot === 'soir')).toHaveLength(1);
  });

  it('accepte du texte libre et le vidage', async () => {
    await setPlanEntry(session.householdId, {
      date: '2026-09-08',
      slot: 'soir',
      freeText: 'resto',
    });
    let cells = await getWeekPlan(session.householdId, MONDAY);
    expect(cells.find((c) => c.date === '2026-09-08' && c.slot === 'soir')?.freeText).toBe('resto');

    await setPlanEntry(session.householdId, { date: '2026-09-08', slot: 'soir', clear: true });
    cells = await getWeekPlan(session.householdId, MONDAY);
    expect(cells.find((c) => c.date === '2026-09-08' && c.slot === 'soir')?.freeText).toBeNull();
  });

  it('refuse un repas inconnu', async () => {
    await expect(
      setPlanEntry(session.householdId, { date: MONDAY, slot: 'midi', mealName: 'Paella' }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});

describe('liste de courses', () => {
  beforeAll(async () => {
    await setPlanEntry(session.householdId, { date: MONDAY, slot: 'soir', mealId: curryId });
    await setPlanEntry(session.householdId, { date: '2026-09-09', slot: 'soir', mealId: curryId });
  });

  it('agrège les ingrédients des repas planifiés et exclut le placard', async () => {
    const list = await generateShoppingList(session.householdId, {
      fromDate: MONDAY,
      toDate: SUNDAY,
    });

    const labels = list.items.map((item) => item.label);
    expect(labels).toContain('Lentilles corail');
    expect(labels).toContain('Lait de coco');
    expect(labels).not.toContain('Huile olive');

    // Le curry est planifié deux fois : 200 g + 200 g.
    expect(list.items.find((i) => i.label === 'Lentilles corail')?.unit).toBe('400 g');
    expect(list.items.find((i) => i.label === 'Lait de coco')?.unit).toBe('80 cl');
  });

  it('signale les lignes sans produit du drive', async () => {
    const list = await getShoppingList(session.householdId);
    expect(list.unmapped.length).toBeGreaterThan(0);
  });

  it('résout le produit préféré une fois la correspondance enregistrée', async () => {
    await setProductPreference(session.householdId, {
      ingredientName: 'Lentilles corail',
      storeId,
      label: 'Lentilles corail bio 500 g',
      brand: 'Marque Repère',
      format: '500 g',
      productUrl: 'https://drive.example/p/lentilles',
      aisle: 'epicerie_salee',
    });

    const list = await generateShoppingList(session.householdId, {
      fromDate: MONDAY,
      toDate: SUNDAY,
    });

    const ligne = list.items.find((item) => item.label === 'Lentilles corail bio 500 g');
    expect(ligne?.brand).toBe('Marque Repère');
    expect(ligne?.productUrl).toBe('https://drive.example/p/lentilles');
    expect(list.unmapped.map((i) => i.label)).not.toContain('Lentilles corail bio 500 g');
  });

  it('retire l’ingrédient mappé de la file à mapper', async () => {
    const restants = await listUnmappedIngredients(session.householdId, storeId);
    expect(restants.map((i) => i.name)).not.toContain('Lentilles corail');
    expect(restants.map((i) => i.name)).toContain('Lait de coco');
  });

  it('trie dans l’ordre de parcours du magasin', async () => {
    await setProductPreference(session.householdId, {
      ingredientName: 'Lait de coco',
      storeId,
      label: 'Lait de coco 40 cl',
      aisle: 'epicerie_salee',
    });
    await setProductPreference(session.householdId, {
      ingredientName: 'Carottes',
      storeId,
      label: 'Carottes 1 kg',
      aisle: 'fruits_legumes',
    });

    const list = await generateShoppingList(session.householdId, {
      fromDate: MONDAY,
      toDate: SUNDAY,
    });
    await addToShoppingList(session.householdId, { listId: list.id, items: ['Carottes'] });

    const after = await getShoppingList(session.householdId, list.id);
    expect(after.items[0].aisle).toBe('fruits_legumes');
  });

  it('ajoute une ligne en texte libre en la résolvant si l’ingrédient est connu', async () => {
    const list = await getShoppingList(session.householdId);
    const after = await addToShoppingList(session.householdId, {
      listId: list.id,
      items: ['lentilles corail', 'papier toilette'],
    });

    const resolue = after.items.find((i) => i.label === 'Lentilles corail bio 500 g' && i.source === 'manual');
    expect(resolue?.productId).not.toBeNull();
    expect(after.items.some((i) => i.label === 'papier toilette')).toBe(true);
  });

  it('persiste l’état coché du mode course', async () => {
    const list = await getShoppingList(session.householdId);
    await setListItemChecked(session.householdId, list.items[0].id, true);

    const after = await getShoppingList(session.householdId, list.id);
    expect(after.items.find((i) => i.id === list.items[0].id)?.isChecked).toBe(true);
  });

  it('refuse de générer une liste vide', async () => {
    const vide = await createHousehold({
      householdName: 'Vide',
      name: 'Nobody',
      email: 'n@exemple.fr',
    });

    await expect(
      generateShoppingList(vide.householdId, { fromDate: MONDAY, toDate: SUNDAY }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it('isole les listes entre foyers', async () => {
    const voisins = await createHousehold({
      householdName: 'Voisins',
      name: 'Dominique',
      email: 'd@exemple.fr',
    });
    const list = await getShoppingList(session.householdId);

    await expect(getShoppingList(voisins.householdId, list.id)).rejects.toBeInstanceOf(DomainError);
    await expect(
      setListItemChecked(voisins.householdId, list.items[0].id, true),
    ).rejects.toBeInstanceOf(DomainError);
  });
});

describe('socle récurrent', () => {
  it('ajoute le récurrent échu à la liste générée, puis ne le redemande plus', async () => {
    await setProductPreference(session.householdId, {
      ingredientName: 'Couches taille 4',
      storeId,
      label: 'Couches taille 4 x58',
      aisle: 'bebe',
    });

    const [couches] = (await getRecurringItems(session.householdId)).filter(
      (item) => item.label === 'Couches taille 4 x58',
    );
    expect(couches).toBeUndefined();

    const { listProducts } = await import('@/lib/domain/products');
    const produits = await listProducts(session.householdId, storeId);
    const produit = produits.find((p) => p.label === 'Couches taille 4 x58')!;

    await addRecurringItem(session.householdId, { productId: produit.id, frequencyWeeks: 2 });

    const avant = await getRecurringItems(session.householdId);
    expect(avant.find((i) => i.label === 'Couches taille 4 x58')?.isDue).toBe(true);

    const list = await generateShoppingList(session.householdId, {
      fromDate: MONDAY,
      toDate: SUNDAY,
    });
    expect(list.items.some((i) => i.label === 'Couches taille 4 x58')).toBe(true);

    // last_added_at vient d'être posé : le récurrent n'est plus échu.
    const apres = await getRecurringItems(session.householdId);
    expect(apres.find((i) => i.label === 'Couches taille 4 x58')?.isDue).toBe(false);

    const suivante = await generateShoppingList(session.householdId, {
      fromDate: MONDAY,
      toDate: SUNDAY,
    });
    expect(suivante.items.some((i) => i.label === 'Couches taille 4 x58')).toBe(false);
  });
});
