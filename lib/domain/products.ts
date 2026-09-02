import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ingredients, mealIngredients, products, stores } from '@/lib/db/schema';
import { DomainError } from '@/lib/errors';
import type { SetProductPreferenceInput } from '@/lib/schemas/shopping';
import { slugify } from './text';

export async function listStores(householdId: string) {
  return db()
    .select()
    .from(stores)
    .where(eq(stores.householdId, householdId))
    .orderBy(asc(stores.name));
}

export async function createStore(
  householdId: string,
  input: { name: string; baseUrl?: string; houseBrands?: string[] },
) {
  const [store] = await db()
    .insert(stores)
    .values({
      householdId,
      name: input.name,
      baseUrl: input.baseUrl,
      houseBrands: input.houseBrands ?? [],
    })
    .returning();
  return store;
}

/** Enseigne par défaut du foyer : la seule, ou la première par ordre alphabétique. */
export async function defaultStore(householdId: string) {
  const [store] = await listStores(householdId);
  return store ?? null;
}

async function requireStore(householdId: string, storeId: string) {
  const [store] = await db()
    .select()
    .from(stores)
    .where(and(eq(stores.householdId, householdId), eq(stores.id, storeId)))
    .limit(1);
  if (!store) throw new DomainError('Enseigne introuvable', 404);
  return store;
}

/** Crée l'ingrédient canonique à la demande, un seul par slug et par foyer. */
export async function ensureIngredient(
  householdId: string,
  name: string,
  aisle?: (typeof ingredients.aisle.enumValues)[number],
) {
  const slug = slugify(name);
  const [existing] = await db()
    .select()
    .from(ingredients)
    .where(and(eq(ingredients.householdId, householdId), eq(ingredients.slug, slug)))
    .limit(1);

  if (existing) {
    if (aisle && existing.aisle !== aisle) {
      const [updated] = await db()
        .update(ingredients)
        .set({ aisle })
        .where(eq(ingredients.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const [created] = await db()
    .insert(ingredients)
    .values({ householdId, name, slug, aisle: aisle ?? 'autre' })
    .returning();
  return created;
}

/**
 * Enregistre la correspondance entre un ingrédient et une référence réelle du
 * drive, et en fait le choix par défaut. C'est l'écriture la plus importante du
 * système : c'est elle qui fait disparaître la ligne de la section « à mapper ».
 */
export async function setProductPreference(householdId: string, input: SetProductPreferenceInput) {
  await requireStore(householdId, input.storeId);
  const ingredient = await ensureIngredient(householdId, input.ingredientName, input.aisle);

  const [existing] = await db()
    .select()
    .from(products)
    .where(
      and(
        eq(products.householdId, householdId),
        eq(products.ingredientId, ingredient.id),
        eq(products.storeId, input.storeId),
        eq(products.label, input.label),
      ),
    )
    .limit(1);

  const values = {
    householdId,
    ingredientId: ingredient.id,
    storeId: input.storeId,
    label: input.label,
    brand: input.brand,
    format: input.format,
    externalId: input.externalId,
    productUrl: input.productUrl,
    lastPrice: input.price?.toString(),
    lastSeenAt: new Date(),
    isPreferred: true,
    isUnavailable: false,
    note: input.note,
  };

  const [product] = existing
    ? await db().update(products).set(values).where(eq(products.id, existing.id)).returning()
    : await db().insert(products).values(values).returning();

  // Un seul produit préféré par ingrédient et par enseigne.
  await db()
    .update(products)
    .set({ isPreferred: false })
    .where(
      and(
        eq(products.householdId, householdId),
        eq(products.ingredientId, ingredient.id),
        eq(products.storeId, input.storeId),
      ),
    );
  await db().update(products).set({ isPreferred: true }).where(eq(products.id, product.id));

  return { product, ingredient };
}

export async function listProducts(householdId: string, storeId?: string) {
  const rows = await db()
    .select({
      id: products.id,
      label: products.label,
      brand: products.brand,
      format: products.format,
      productUrl: products.productUrl,
      isPreferred: products.isPreferred,
      isUnavailable: products.isUnavailable,
      note: products.note,
      storeId: products.storeId,
      storeName: stores.name,
      ingredientId: ingredients.id,
      ingredientName: ingredients.name,
      aisle: ingredients.aisle,
    })
    .from(products)
    .innerJoin(ingredients, eq(ingredients.id, products.ingredientId))
    .innerJoin(stores, eq(stores.id, products.storeId))
    .where(
      storeId
        ? and(eq(products.householdId, householdId), eq(products.storeId, storeId))
        : eq(products.householdId, householdId),
    )
    .orderBy(asc(ingredients.name), asc(products.label));

  return rows;
}

export async function preferredProductsFor(
  householdId: string,
  storeId: string,
  ingredientIds: string[],
) {
  if (ingredientIds.length === 0) return [];

  return db()
    .select({
      id: products.id,
      ingredientId: products.ingredientId,
      label: products.label,
      brand: products.brand,
      format: products.format,
      productUrl: products.productUrl,
    })
    .from(products)
    .where(
      and(
        eq(products.householdId, householdId),
        eq(products.storeId, storeId),
        eq(products.isPreferred, true),
        eq(products.isUnavailable, false),
        inArray(products.ingredientId, ingredientIds),
      ),
    );
}

/**
 * Ingrédients utilisés par au moins un repas et sans produit préféré chez
 * l'enseigne : la file de travail de l'écran Produits.
 */
export async function listUnmappedIngredients(householdId: string, storeId: string) {
  const used = await db()
    .selectDistinct({
      id: ingredients.id,
      name: ingredients.name,
      aisle: ingredients.aisle,
    })
    .from(ingredients)
    .innerJoin(mealIngredients, eq(mealIngredients.ingredientId, ingredients.id))
    .where(eq(ingredients.householdId, householdId))
    .orderBy(asc(ingredients.name));

  const mapped = new Set(
    (
      await preferredProductsFor(
        householdId,
        storeId,
        used.map((row) => row.id),
      )
    ).map((product) => product.ingredientId),
  );

  return used.filter((row) => !mapped.has(row.id));
}
