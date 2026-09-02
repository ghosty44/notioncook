import { and, asc, between, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  ingredients,
  mealIngredients,
  planEntries,
  products,
  recurringItems,
  shoppingListItems,
  shoppingLists,
  stores,
} from '@/lib/db/schema';
import { DomainError } from '@/lib/errors';
import type { AddToShoppingListInput, GenerateShoppingListInput } from '@/lib/schemas/shopping';
import { aisleRank, type Aisle } from './aisles';
import { defaultStore, ensureIngredient, preferredProductsFor } from './products';
import {
  aggregateShoppingList,
  formatQuantities,
  isRecurringDue,
  type PlannedIngredient,
  type RecurringLine,
} from './shopping-list';
import { slugify } from './text';

export type ShoppingListView = Awaited<ReturnType<typeof getShoppingList>>;

/**
 * Génère la liste depuis le planning de la période, en suivant pas à pas la
 * logique d'agrégation de la section 4.6, puis la persiste : la liste devient
 * un objet partagé que les deux adultes cochent en parallèle.
 */
export async function generateShoppingList(householdId: string, input: GenerateShoppingListInput) {
  const store = input.storeId
    ? (
        await db()
          .select()
          .from(stores)
          .where(and(eq(stores.householdId, householdId), eq(stores.id, input.storeId)))
          .limit(1)
      )[0]
    : await defaultStore(householdId);

  if (input.storeId && !store) throw new DomainError('Enseigne introuvable', 404);

  const planned = await plannedIngredients(householdId, input.fromDate, input.toDate);

  const due = input.includeRecurring === false ? [] : await dueRecurringLines(householdId);

  const ingredientIds = [
    ...new Set(
      [...planned, ...due].map((line) => line.ingredientId).filter((id): id is string => !!id),
    ),
  ];

  const preferred = store ? await preferredProductsFor(householdId, store.id, ingredientIds) : [];

  const items = aggregateShoppingList({
    planned,
    recurring: due,
    preferredProducts: preferred,
  });

  if (items.length === 0) {
    throw new DomainError(
      'Rien à acheter : aucun repas planifié sur la période, et aucun récurrent échu.',
      422,
    );
  }

  const [list] = await db()
    .insert(shoppingLists)
    .values({ householdId, storeId: store?.id ?? null, status: 'draft' })
    .returning();

  await db()
    .insert(shoppingListItems)
    .values(
      items.map((item) => ({
        listId: list.id,
        ingredientId: item.ingredientId,
        productId: item.product?.id ?? item.productId,
        label: item.product?.label ?? item.label,
        quantity: null,
        unit: formatQuantities(item.quantities) || null,
        aisle: item.aisle,
        source: item.source,
      })),
    );

  // last_added_at dit quand le récurrent a été mis sur une liste, pas quand il
  // a été commandé : c'est ici qu'il se met à jour.
  const addedRecurring = due.map((line) => line.productId);
  if (addedRecurring.length > 0) {
    await db()
      .update(recurringItems)
      .set({ lastAddedAt: new Date() })
      .where(
        and(
          eq(recurringItems.householdId, householdId),
          inArray(recurringItems.productId, addedRecurring),
        ),
      );
  }

  return getShoppingList(householdId, list.id);
}

/** Ingrédients de tous les repas planifiés sur la période. */
async function plannedIngredients(
  householdId: string,
  fromDate: string,
  toDate: string,
): Promise<PlannedIngredient[]> {
  const rows = await db()
    .select({
      ingredientId: ingredients.id,
      ingredientName: ingredients.name,
      aisle: ingredients.aisle,
      quantity: mealIngredients.quantity,
      unit: mealIngredients.unit,
      isPantryStaple: mealIngredients.isPantryStaple,
      freeText: mealIngredients.freeText,
    })
    .from(planEntries)
    .innerJoin(mealIngredients, eq(mealIngredients.mealId, planEntries.mealId))
    .leftJoin(ingredients, eq(ingredients.id, mealIngredients.ingredientId))
    .where(
      and(
        eq(planEntries.householdId, householdId),
        isNotNull(planEntries.mealId),
        between(planEntries.date, fromDate, toDate),
      ),
    );

  return rows
    .map((row) => ({
      ingredientId: row.ingredientId,
      label: row.ingredientName ?? row.freeText ?? '',
      aisle: (row.aisle ?? 'autre') as Aisle,
      quantity: row.quantity === null ? null : Number(row.quantity),
      unit: row.unit,
      isPantryStaple: row.isPantryStaple,
    }))
    .filter((row) => row.label !== '');
}

async function dueRecurringLines(householdId: string): Promise<RecurringLine[]> {
  const rows = await db()
    .select({
      productId: products.id,
      frequencyWeeks: recurringItems.frequencyWeeks,
      lastAddedAt: recurringItems.lastAddedAt,
      defaultQuantity: recurringItems.defaultQuantity,
      label: products.label,
      ingredientId: ingredients.id,
      aisle: ingredients.aisle,
    })
    .from(recurringItems)
    .innerJoin(products, eq(products.id, recurringItems.productId))
    .innerJoin(ingredients, eq(ingredients.id, products.ingredientId))
    .where(eq(recurringItems.householdId, householdId));

  // filter passe l'index en second argument : il finirait dans le paramètre now.
  return rows
    .filter((row) => isRecurringDue(row))
    .map((row) => ({
      productId: row.productId,
      ingredientId: row.ingredientId,
      label: row.label,
      aisle: row.aisle as Aisle,
      quantity: row.defaultQuantity === null ? null : Number(row.defaultQuantity),
      unit: null,
    }));
}

/** Liste demandée, ou la dernière liste en brouillon du foyer. */
export async function getShoppingList(householdId: string, listId?: string) {
  const [list] = listId
    ? await db()
        .select()
        .from(shoppingLists)
        .where(and(eq(shoppingLists.householdId, householdId), eq(shoppingLists.id, listId)))
        .limit(1)
    : await db()
        .select()
        .from(shoppingLists)
        .where(and(eq(shoppingLists.householdId, householdId), eq(shoppingLists.status, 'draft')))
        .orderBy(desc(shoppingLists.createdAt))
        .limit(1);

  if (!list) throw new DomainError('Aucune liste de courses en cours', 404);

  const items = await db()
    .select({
      id: shoppingListItems.id,
      label: shoppingListItems.label,
      unit: shoppingListItems.unit,
      aisle: shoppingListItems.aisle,
      isChecked: shoppingListItems.isChecked,
      source: shoppingListItems.source,
      ingredientId: shoppingListItems.ingredientId,
      productId: shoppingListItems.productId,
      productLabel: products.label,
      brand: products.brand,
      format: products.format,
      productUrl: products.productUrl,
    })
    .from(shoppingListItems)
    .leftJoin(products, eq(products.id, shoppingListItems.productId))
    .where(eq(shoppingListItems.listId, list.id));

  const [store] = list.storeId
    ? await db().select().from(stores).where(eq(stores.id, list.storeId)).limit(1)
    : [];

  const sorted = items.sort(
    (a, b) =>
      aisleRank(a.aisle as Aisle) - aisleRank(b.aisle as Aisle) ||
      a.label.localeCompare(b.label, 'fr'),
  );

  return {
    ...list,
    store: store ?? null,
    items: sorted,
    unmapped: sorted.filter((item) => item.productId === null),
  };
}

/**
 * Ajoute des lignes en texte libre, en résolvant vers le produit préféré dès que
 * l'ingrédient est connu du foyer.
 */
export async function addToShoppingList(householdId: string, input: AddToShoppingListInput) {
  const list = await getShoppingList(householdId, input.listId);
  if (list.status === 'ordered') {
    throw new DomainError('Cette liste est déjà commandée, génères-en une nouvelle', 409);
  }

  const slugs = input.items.map(slugify);
  const known = await db()
    .select({
      id: ingredients.id,
      slug: ingredients.slug,
      name: ingredients.name,
      aisle: ingredients.aisle,
    })
    .from(ingredients)
    .where(and(eq(ingredients.householdId, householdId), inArray(ingredients.slug, slugs)));

  const bySlug = new Map(known.map((row) => [row.slug, row]));
  const preferred = list.storeId
    ? await preferredProductsFor(
        householdId,
        list.storeId,
        known.map((row) => row.id),
      )
    : [];
  const byIngredient = new Map(preferred.map((product) => [product.ingredientId, product]));

  const values = input.items.map((raw) => {
    const ingredient = bySlug.get(slugify(raw));
    const product = ingredient ? byIngredient.get(ingredient.id) : undefined;

    return {
      listId: list.id,
      ingredientId: ingredient?.id ?? null,
      productId: product?.id ?? null,
      label: product?.label ?? ingredient?.name ?? raw,
      aisle: ingredient?.aisle ?? ('autre' as const),
      source: 'manual' as const,
    };
  });

  await db().insert(shoppingListItems).values(values);
  return getShoppingList(householdId, list.id);
}

/** Mode course : l'état coché est persisté à chaque tap, les deux adultes le voient. */
export async function setListItemChecked(householdId: string, itemId: string, isChecked: boolean) {
  const [item] = await db()
    .select({ id: shoppingListItems.id })
    .from(shoppingListItems)
    .innerJoin(shoppingLists, eq(shoppingLists.id, shoppingListItems.listId))
    .where(and(eq(shoppingListItems.id, itemId), eq(shoppingLists.householdId, householdId)))
    .limit(1);

  if (!item) throw new DomainError('Ligne introuvable', 404);

  const [updated] = await db()
    .update(shoppingListItems)
    .set({ isChecked })
    .where(eq(shoppingListItems.id, itemId))
    .returning();

  return updated;
}

export async function listShoppingLists(householdId: string, limit = 20) {
  return db()
    .select()
    .from(shoppingLists)
    .where(eq(shoppingLists.householdId, householdId))
    .orderBy(desc(shoppingLists.createdAt))
    .limit(limit);
}

export async function getRecurringItems(householdId: string) {
  const rows = await db()
    .select({
      id: recurringItems.id,
      frequencyWeeks: recurringItems.frequencyWeeks,
      lastAddedAt: recurringItems.lastAddedAt,
      defaultQuantity: recurringItems.defaultQuantity,
      productId: products.id,
      label: products.label,
      brand: products.brand,
      format: products.format,
      ingredientName: ingredients.name,
      aisle: ingredients.aisle,
    })
    .from(recurringItems)
    .innerJoin(products, eq(products.id, recurringItems.productId))
    .innerJoin(ingredients, eq(ingredients.id, products.ingredientId))
    .where(eq(recurringItems.householdId, householdId))
    .orderBy(asc(ingredients.name));

  return rows.map((row) => ({ ...row, isDue: isRecurringDue(row) }));
}

export async function addRecurringItem(
  householdId: string,
  input: { productId: string; frequencyWeeks?: number; defaultQuantity?: number },
) {
  const [product] = await db()
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.householdId, householdId), eq(products.id, input.productId)))
    .limit(1);

  if (!product) throw new DomainError('Produit introuvable', 404);

  const [item] = await db()
    .insert(recurringItems)
    .values({
      householdId,
      productId: input.productId,
      frequencyWeeks: input.frequencyWeeks ?? 1,
      defaultQuantity: input.defaultQuantity?.toString(),
    })
    .returning();

  return item;
}

export async function removeRecurringItem(householdId: string, id: string) {
  const removed = await db()
    .delete(recurringItems)
    .where(and(eq(recurringItems.householdId, householdId), eq(recurringItems.id, id)))
    .returning({ id: recurringItems.id });

  if (removed.length === 0) throw new DomainError('Récurrent introuvable', 404);
}

export { ensureIngredient };
