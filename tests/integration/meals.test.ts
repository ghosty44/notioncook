import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from './harness';
import { createHousehold, DomainError, getHousehold, joinHousehold } from '@/lib/domain/households';
import {
  createMeal,
  deleteLog,
  getMeal,
  listLogs,
  listMeals,
  logMeal,
  updateMeal,
} from '@/lib/domain/meals';
import type { Session } from '@/lib/auth/session';

let teardown: () => Promise<void>;
let session: Session;

beforeAll(async () => {
  teardown = await createTestDatabase();
  session = await createHousehold({
    householdName: 'Maison',
    name: 'Camille',
    email: 'camille@exemple.fr',
  });
});

afterAll(async () => {
  await teardown();
});

describe('foyer', () => {
  it('rejoint un foyer avec son code et partage les données', async () => {
    const household = await getHousehold(session.householdId);

    const second = await joinHousehold({
      code: household!.inviteCode,
      name: 'Alex',
      email: 'alex@exemple.fr',
    });

    expect(second.householdId).toBe(session.householdId);
    expect(second.userId).not.toBe(session.userId);
  });

  it('accepte le code en minuscules et avec des tirets', async () => {
    const household = await getHousehold(session.householdId);
    const messy = household!.inviteCode.toLowerCase().split('').join('-');
    const again = await joinHousehold({ code: messy, name: 'Alex', email: 'alex@exemple.fr' });
    expect(again.householdId).toBe(session.householdId);
  });

  it('refuse un code inconnu', async () => {
    await expect(
      joinHousehold({ code: 'ZZZZZZ', name: 'Inconnu', email: 'x@exemple.fr' }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});

describe('repas', () => {
  it('crée un repas avec ses ingrédients et les relit', async () => {
    const meal = await createMeal(session.householdId, {
      name: 'Curry de lentilles coco',
      kind: 'recipe',
      effort: 'standard',
      tags: ['végé', 'une seule casserole'],
      babyNote: 'Portion prélevée avant de saler, écrasée à la fourchette',
      ingredients: [
        { name: 'Lentilles corail', quantity: 200, unit: 'g' },
        { name: 'Lait de coco', quantity: 1, unit: 'boîte' },
        { name: 'Huile olive', isPantryStaple: true },
      ],
    });

    const detail = await getMeal(session.householdId, meal.id);
    expect(detail.name).toBe('Curry de lentilles coco');
    expect(detail.tags).toEqual(['végé', 'une seule casserole']);
    expect(detail.ingredients).toHaveLength(3);
    expect(detail.ingredients[0].ingredientName).toBe('Lentilles corail');
    expect(detail.ingredients[2].isPantryStaple).toBe(true);
  });

  it('refuse un doublon, même écrit différemment', async () => {
    await expect(
      createMeal(session.householdId, { name: 'curry de LENTILLES coco' }),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it('réutilise un ingrédient canonique déjà connu du foyer', async () => {
    const meal = await createMeal(session.householdId, {
      name: 'Dahl express',
      ingredients: [{ name: 'lentilles corail', quantity: 150, unit: 'g' }],
    });

    const [dahl, curry] = await Promise.all([
      getMeal(session.householdId, meal.id),
      listMeals(session.householdId, { query: 'curry de lentilles' }),
    ]);

    const curryDetail = await getMeal(session.householdId, curry[0].id);
    const shared = curryDetail.ingredients.find((i) => i.ingredientName === 'Lentilles corail');
    expect(dahl.ingredients[0].ingredientId).toBe(shared?.ingredientId);
  });

  it('remplace les ingrédients à la mise à jour', async () => {
    const [meal] = await listMeals(session.householdId, { query: 'dahl' });
    await updateMeal(session.householdId, meal.id, {
      effort: 'express',
      ingredients: [{ name: 'Lentilles corail', quantity: 100, unit: 'g' }],
    });

    const detail = await getMeal(session.householdId, meal.id);
    expect(detail.effort).toBe('express');
    expect(detail.ingredients).toHaveLength(1);
  });

  it('isole les foyers', async () => {
    const autre = await createHousehold({
      householdName: 'Voisins',
      name: 'Dominique',
      email: 'dominique@exemple.fr',
    });

    expect(await listMeals(autre.householdId)).toHaveLength(0);
    const [mien] = await listMeals(session.householdId);
    await expect(getMeal(autre.householdId, mien.id)).rejects.toBeInstanceOf(DomainError);
  });
});

describe('journal', () => {
  it('logge un repas connu sans le dupliquer', async () => {
    const result = await logMeal(session.householdId, {
      mealNameOrId: 'Curry de lentilles coco',
      date: '2026-08-20',
      slot: 'soir',
      likedByBaby: true,
    });

    expect(result.mealCreated).toBe(false);
    expect(result.log.likedByBaby).toBe(true);
  });

  it('crée le repas à la volée en combo quand le nom est inconnu', async () => {
    const result = await logMeal(session.householdId, {
      mealNameOrId: 'Œufs au plat courgettes riz',
      date: '2026-08-28',
    });

    expect(result.mealCreated).toBe(true);
    expect(result.meal.kind).toBe('combo');

    // La ligature ne doit pas créer un second repas.
    const again = await logMeal(session.householdId, {
      mealNameOrId: 'oeufs au plat courgettes riz',
      date: '2026-08-29',
    });
    expect(again.mealCreated).toBe(false);
    expect(again.meal.id).toBe(result.meal.id);
  });

  it('remonte le dernier log et le compte dans la bibliothèque', async () => {
    const meals = await listMeals(session.householdId);
    const oeufs = meals.find((m) => m.name.startsWith('Œufs'));
    expect(oeufs?.logCount).toBe(2);
    expect(oeufs?.lastLoggedAt).toBe('2026-08-29');
  });

  it('trie la bibliothèque du plus ancien au plus récent, jamais faits en tête', async () => {
    const names = (await listMeals(session.householdId)).map((m) => m.name);
    expect(names[0]).toBe('Dahl express');
    expect(names.at(-1)).toBe('Œufs au plat courgettes riz');
  });

  it('supprime une entrée de journal', async () => {
    const logs = await listLogs(session.householdId);
    await deleteLog(session.householdId, logs[0].id);
    expect(await listLogs(session.householdId)).toHaveLength(logs.length - 1);
  });

  it("refuse de supprimer l'entrée d'un autre foyer", async () => {
    const [log] = await listLogs(session.householdId);
    const autre = await createHousehold({
      householdName: 'Ailleurs',
      name: 'Sacha',
      email: 'sacha@exemple.fr',
    });
    await expect(deleteLog(autre.householdId, log.id)).rejects.toBeInstanceOf(DomainError);
  });
});
