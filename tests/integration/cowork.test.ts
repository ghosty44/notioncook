import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from './harness';
import { createHousehold } from '@/lib/domain/households';
import { createMeal } from '@/lib/domain/meals';
import { setPlanEntry } from '@/lib/domain/plan';
import {
  createStore,
  listProducts,
  rejectProduct,
  reportUnavailable,
  setProductPreference,
} from '@/lib/domain/products';
import { generateShoppingList, getShoppingList, markListOrdered } from '@/lib/domain/shopping';
import {
  getStoreContext,
  setAvoidance,
  setBrandPreference,
  setHouseholdConstraints,
  setStoreRule,
} from '@/lib/domain/store-rules';
import { formatStoreContext } from '@/lib/mcp/format';
import { DomainError } from '@/lib/errors';
import type { Session } from '@/lib/auth/session';

let teardown: () => Promise<void>;
let session: Session;
let storeId: string;

const MONDAY = '2026-09-07';
const SUNDAY = '2026-09-13';

beforeAll(async () => {
  teardown = await createTestDatabase();
  session = await createHousehold({
    householdName: 'Maison',
    name: 'Camille',
    email: 'camille@exemple.fr',
  });

  storeId = (
    await createStore(session.householdId, {
      name: 'E.Leclerc Drive',
      houseBrands: ['Marque Repère', 'Eco+'],
    })
  ).id;

  const meal = await createMeal(session.householdId, {
    name: 'Curry de lentilles coco',
    ingredients: [{ name: 'Lentilles corail', quantity: 200, unit: 'g' }],
  });
  await setPlanEntry(session.householdId, { date: MONDAY, slot: 'soir', mealId: meal.id });
});

afterAll(async () => {
  await teardown();
});

describe('contexte de magasin', () => {
  it('rend les règles dans leur ordre de priorité', async () => {
    await setStoreRule(session.householdId, { storeId, rule: 'Respecter la marque demandée', priority: 0 });
    await setStoreRule(session.householdId, { storeId, rule: 'Sinon marque distributeur', priority: 1 });
    await setStoreRule(session.householdId, { storeId, rule: 'Départager au prix au kilo', priority: 2 });

    const context = await getStoreContext(session.householdId);
    expect(context.rules.map((rule) => rule.rule)).toEqual([
      'Respecter la marque demandée',
      'Sinon marque distributeur',
      'Départager au prix au kilo',
    ]);
  });

  it('rappelle toujours les limites du run', async () => {
    const rendu = formatStoreContext(await getStoreContext(session.householdId));
    expect(rendu).toContain('Jamais de réservation de créneau');
    expect(rendu).toContain('Jamais de paiement');
    expect(rendu).toContain("Jamais de saisie d'identifiants");
    expect(rendu).toContain('Marque Repère, Eco+');
  });

  it('met les évitements bloquants en tête, séparés des souples', async () => {
    await setAvoidance(session.householdId, {
      scope: 'ingredient',
      value: 'Arachide',
      reason: 'allergie',
    });
    await setAvoidance(session.householdId, {
      scope: 'brand',
      value: 'Marque X',
      reason: 'gout',
    });

    const rendu = formatStoreContext(await getStoreContext(session.householdId));
    const bloquant = rendu.indexOf('À NE JAMAIS ACHETER');
    const souple = rendu.indexOf('À éviter si possible');
    expect(bloquant).toBeGreaterThan(-1);
    expect(souple).toBeGreaterThan(bloquant);
    expect(rendu.slice(bloquant, souple)).toContain('Arachide');
  });

  it('rend une allergie bloquante sans avoir à le demander', async () => {
    const context = await getStoreContext(session.householdId);
    expect(context.avoidances.find((a) => a.value === 'Arachide')?.isHard).toBe(true);
    expect(context.avoidances.find((a) => a.value === 'Marque X')?.isHard).toBe(false);
  });

  it('expose les marques préférées et les contraintes du foyer', async () => {
    await setBrandPreference(session.householdId, {
      brand: 'Marque Repère',
      storeId,
      aisle: 'cremerie',
    });
    await setBrandPreference(session.householdId, {
      brand: 'Bordier',
      storeId,
      ingredientName: 'Beurre demi-sel',
    });
    await setHouseholdConstraints(session.householdId, 'Textures lisses pour la petite. Budget 120 € max.');

    const rendu = formatStoreContext(await getStoreContext(session.householdId));
    expect(rendu).toContain('Marque Repère pour tout le rayon Crèmerie');
    expect(rendu).toContain('Bordier pour Beurre demi-sel');
    expect(rendu).toContain('Budget 120 € max.');
  });

  it('refuse un contexte quand le foyer n’a aucune enseigne', async () => {
    const vide = await createHousehold({
      householdName: 'Vide',
      name: 'X',
      email: 'x@exemple.fr',
    });
    await expect(getStoreContext(vide.householdId)).rejects.toBeInstanceOf(DomainError);
  });
});

describe('boucle de remplissage', () => {
  it('écarte un produit, qui voyage ensuite avec la liste', async () => {
    await setProductPreference(session.householdId, {
      ingredientName: 'Lentilles corail',
      storeId,
      label: 'Lentilles corail premier prix',
      aisle: 'epicerie_salee',
    });

    await rejectProduct(session.householdId, {
      ingredientName: 'Lentilles corail',
      storeId,
      label: 'Lentilles corail premier prix',
      reason: 'Sachet de 250 g, trop cher au kilo',
    });

    const list = await generateShoppingList(session.householdId, {
      fromDate: MONDAY,
      toDate: SUNDAY,
    });

    expect(list.rejected.map((item) => item.label)).toContain('Lentilles corail premier prix');
  });

  it('retire le statut de choix par défaut au produit écarté', async () => {
    const produits = await listProducts(session.householdId, storeId);
    const ecarte = produits.find((p) => p.label === 'Lentilles corail premier prix')!;
    expect(ecarte.isPreferred).toBe(false);
  });

  it('force un nouveau choix quand une rupture est signalée', async () => {
    await setProductPreference(session.householdId, {
      ingredientName: 'Lentilles corail',
      storeId,
      label: 'Lentilles corail bio 500 g',
      aisle: 'epicerie_salee',
    });

    const produits = await listProducts(session.householdId, storeId);
    const bio = produits.find((p) => p.label === 'Lentilles corail bio 500 g')!;
    expect(bio.isPreferred).toBe(true);

    await reportUnavailable(session.householdId, { productId: bio.id, note: 'Rupture au drive' });

    const apres = (await listProducts(session.householdId, storeId)).find((p) => p.id === bio.id)!;
    expect(apres.isUnavailable).toBe(true);
    expect(apres.isPreferred).toBe(false);

    // La ligne repasse à mapper : aucune substitution silencieuse.
    const list = await generateShoppingList(session.householdId, {
      fromDate: MONDAY,
      toDate: SUNDAY,
    });
    expect(list.unmapped.map((item) => item.label)).toContain('Lentilles corail');
  });

  it('marque la liste commandée, une seule fois', async () => {
    const list = await getShoppingList(session.householdId);
    const ordered = await markListOrdered(session.householdId, {
      listId: list.id,
      notes: 'Retrait samedi matin',
    });

    expect(ordered.status).toBe('ordered');
    expect(ordered.orderedAt).not.toBeNull();
    expect(ordered.notes).toBe('Retrait samedi matin');

    await expect(
      markListOrdered(session.householdId, { listId: list.id }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it('isole refus et ruptures entre foyers', async () => {
    const voisins = await createHousehold({
      householdName: 'Voisins',
      name: 'Dominique',
      email: 'd@exemple.fr',
    });
    const produits = await listProducts(session.householdId, storeId);

    await expect(
      reportUnavailable(voisins.householdId, { productId: produits[0].id }),
    ).rejects.toBeInstanceOf(DomainError);

    await expect(
      rejectProduct(voisins.householdId, {
        ingredientName: 'Lentilles corail',
        storeId,
        label: 'Peu importe',
        reason: 'test',
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
