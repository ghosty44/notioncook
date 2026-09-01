import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ingredients, mealIngredients, mealLogs, meals } from '@/lib/db/schema';
import { DomainError } from './households';
import { matchesFilters, sortByLeastRecentlyCooked, type LibraryMeal } from './library';
import { slugify, today } from './text';
import type {
  CreateMealInput,
  LogMealInput,
  SearchMealsInput,
  UpdateMealInput,
} from '@/lib/schemas/meals';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MealDetail = Awaited<ReturnType<typeof getMeal>>;

/**
 * Bibliothèque du foyer, chaque repas accompagné de la date de son dernier log
 * et du nombre de fois qu'il a été fait. Filtrage et tri sont faits par les
 * fonctions pures de library.ts, partagées avec les outils MCP.
 */
export async function listMeals(
  householdId: string,
  input: SearchMealsInput = {},
): Promise<LibraryMeal[]> {
  const rows = await db()
    .select({
      id: meals.id,
      name: meals.name,
      kind: meals.kind,
      effort: meals.effort,
      tags: meals.tags,
      notes: meals.notes,
      lastLoggedAt: sql<string | null>`max(${mealLogs.date})`,
      logCount: sql<number>`count(${mealLogs.id})::int`,
    })
    .from(meals)
    .leftJoin(mealLogs, eq(mealLogs.mealId, meals.id))
    .where(
      input.includeArchived
        ? eq(meals.householdId, householdId)
        : and(eq(meals.householdId, householdId), eq(meals.isArchived, false)),
    )
    .groupBy(meals.id);

  const filtered = rows.filter((meal) => matchesFilters(meal, input));
  const sorted = sortByLeastRecentlyCooked(filtered, today());
  return input.limit ? sorted.slice(0, input.limit) : sorted;
}

export async function getMeal(householdId: string, mealId: string) {
  const [meal] = await db()
    .select()
    .from(meals)
    .where(and(eq(meals.id, mealId), eq(meals.householdId, householdId)))
    .limit(1);

  if (!meal) throw new DomainError('Repas introuvable', 404);

  const lines = await db()
    .select({
      id: mealIngredients.id,
      quantity: mealIngredients.quantity,
      unit: mealIngredients.unit,
      isPantryStaple: mealIngredients.isPantryStaple,
      freeText: mealIngredients.freeText,
      position: mealIngredients.position,
      ingredientId: ingredients.id,
      ingredientName: ingredients.name,
      aisle: ingredients.aisle,
    })
    .from(mealIngredients)
    .leftJoin(ingredients, eq(ingredients.id, mealIngredients.ingredientId))
    .where(eq(mealIngredients.mealId, meal.id))
    .orderBy(mealIngredients.position);

  const logs = await db()
    .select()
    .from(mealLogs)
    .where(eq(mealLogs.mealId, meal.id))
    .orderBy(desc(mealLogs.date), desc(mealLogs.createdAt))
    .limit(50);

  return { ...meal, ingredients: lines, logs };
}

/**
 * Création volontairement tolérante : le nom seul suffit. Tout le reste peut
 * rester vide et être complété plus tard, ou jamais. C'est la condition pour
 * que la capture rapide tienne sous les 20 secondes.
 */
export async function createMeal(householdId: string, input: CreateMealInput) {
  const slug = slugify(input.name);
  const [existing] = await db()
    .select({ id: meals.id })
    .from(meals)
    .where(and(eq(meals.householdId, householdId), eq(meals.slug, slug)))
    .limit(1);

  if (existing) throw new DomainError('Ce repas existe déjà dans la bibliothèque', 409);

  const [meal] = await db()
    .insert(meals)
    .values({
      householdId,
      name: input.name,
      slug,
      kind: input.kind ?? 'combo',
      effort: input.effort ?? 'standard',
      steps: input.steps,
      notes: input.notes,
      babyNote: input.babyNote,
      tags: input.tags ?? [],
      season: input.season ?? [],
      sourceUrl: input.sourceUrl,
      rating: input.rating,
    })
    .returning();

  if (input.ingredients?.length) {
    await replaceIngredients(householdId, meal.id, input.ingredients);
  }

  return meal;
}

export async function updateMeal(householdId: string, mealId: string, input: UpdateMealInput) {
  const [meal] = await db()
    .select()
    .from(meals)
    .where(and(eq(meals.id, mealId), eq(meals.householdId, householdId)))
    .limit(1);

  if (!meal) throw new DomainError('Repas introuvable', 404);

  const [updated] = await db()
    .update(meals)
    .set({
      name: input.name ?? meal.name,
      slug: input.name ? slugify(input.name) : meal.slug,
      kind: input.kind ?? meal.kind,
      effort: input.effort ?? meal.effort,
      steps: input.steps ?? meal.steps,
      notes: input.notes ?? meal.notes,
      babyNote: input.babyNote ?? meal.babyNote,
      tags: input.tags ?? meal.tags,
      season: input.season ?? meal.season,
      sourceUrl: input.sourceUrl ?? meal.sourceUrl,
      rating: input.rating ?? meal.rating,
      isArchived: input.isArchived ?? meal.isArchived,
      updatedAt: new Date(),
    })
    .where(eq(meals.id, meal.id))
    .returning();

  if (input.ingredients) {
    await replaceIngredients(householdId, meal.id, input.ingredients);
  }

  return updated;
}

/**
 * Enregistre ce qui a été mangé. Si le nom ne correspond à rien, le repas est
 * créé à la volée en `combo` et l'appelant en est informé : c'est ce qui permet
 * de logger un plat inconnu sans quitter le champ de saisie.
 */
export async function logMeal(householdId: string, input: LogMealInput) {
  let meal = await resolveMeal(householdId, input.mealNameOrId);
  let created = false;

  if (!meal) {
    meal = await createMeal(householdId, { name: input.mealNameOrId, kind: 'combo' });
    created = true;
  }

  const [log] = await db()
    .insert(mealLogs)
    .values({
      householdId,
      mealId: meal.id,
      date: input.date ?? today(),
      slot: input.slot ?? 'soir',
      likedByBaby: input.likedByBaby ?? null,
      comment: input.comment,
    })
    .returning();

  return { log, meal, mealCreated: created };
}

export async function listLogs(householdId: string, limit = 60) {
  return db()
    .select({
      id: mealLogs.id,
      date: mealLogs.date,
      slot: mealLogs.slot,
      likedByBaby: mealLogs.likedByBaby,
      comment: mealLogs.comment,
      mealId: meals.id,
      mealName: meals.name,
      mealKind: meals.kind,
      mealEffort: meals.effort,
    })
    .from(mealLogs)
    .innerJoin(meals, eq(meals.id, mealLogs.mealId))
    .where(eq(mealLogs.householdId, householdId))
    .orderBy(desc(mealLogs.date), desc(mealLogs.createdAt))
    .limit(limit);
}

export async function deleteLog(householdId: string, logId: string) {
  const deleted = await db()
    .delete(mealLogs)
    .where(and(eq(mealLogs.id, logId), eq(mealLogs.householdId, householdId)))
    .returning({ id: mealLogs.id });

  if (deleted.length === 0) throw new DomainError('Entrée de journal introuvable', 404);
}

/** Accepte un identifiant ou un nom, ce dernier rapproché par slug. */
async function resolveMeal(householdId: string, nameOrId: string) {
  if (UUID.test(nameOrId)) {
    const [byId] = await db()
      .select()
      .from(meals)
      .where(and(eq(meals.id, nameOrId), eq(meals.householdId, householdId)))
      .limit(1);
    if (byId) return byId;
  }

  const [bySlug] = await db()
    .select()
    .from(meals)
    .where(and(eq(meals.householdId, householdId), eq(meals.slug, slugify(nameOrId))))
    .limit(1);

  return bySlug ?? null;
}

/** Les ingrédients canoniques sont créés à la demande, un par slug et par foyer. */
async function replaceIngredients(
  householdId: string,
  mealId: string,
  lines: NonNullable<CreateMealInput['ingredients']>,
) {
  await db().delete(mealIngredients).where(eq(mealIngredients.mealId, mealId));
  if (lines.length === 0) return;

  const slugs = [...new Set(lines.map((line) => slugify(line.name)))];
  const known = await db()
    .select({ id: ingredients.id, slug: ingredients.slug })
    .from(ingredients)
    .where(and(eq(ingredients.householdId, householdId), inArray(ingredients.slug, slugs)));

  const bySlug = new Map(known.map((row) => [row.slug, row.id]));
  const missing = lines.filter((line) => !bySlug.has(slugify(line.name)));

  if (missing.length > 0) {
    const inserted = await db()
      .insert(ingredients)
      .values(
        [...new Map(missing.map((l) => [slugify(l.name), l])).values()].map((line) => ({
          householdId,
          name: line.name,
          slug: slugify(line.name),
        })),
      )
      .returning({ id: ingredients.id, slug: ingredients.slug });
    for (const row of inserted) bySlug.set(row.slug, row.id);
  }

  await db()
    .insert(mealIngredients)
    .values(
      lines.map((line, index) => ({
        mealId,
        ingredientId: bySlug.get(slugify(line.name)) ?? null,
        quantity: line.quantity?.toString(),
        unit: line.unit,
        isPantryStaple: line.isPantryStaple ?? false,
        freeText: line.freeText,
        position: index,
      })),
    );
}

export async function updateLog(
  householdId: string,
  logId: string,
  patch: { likedByBaby?: boolean | null; comment?: string },
) {
  const [updated] = await db()
    .update(mealLogs)
    .set({
      ...(patch.likedByBaby !== undefined ? { likedByBaby: patch.likedByBaby } : {}),
      ...(patch.comment !== undefined ? { comment: patch.comment } : {}),
    })
    .where(and(eq(mealLogs.id, logId), eq(mealLogs.householdId, householdId)))
    .returning();

  if (!updated) throw new DomainError('Entrée de journal introuvable', 404);
  return updated;
}
