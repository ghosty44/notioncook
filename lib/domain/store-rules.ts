import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  avoidances,
  brandPreferences,
  households,
  ingredients,
  storeRules,
  stores,
} from '@/lib/db/schema';
import { DomainError } from '@/lib/errors';
import type {
  SetAvoidanceInput,
  SetBrandPreferenceInput,
  SetStoreRuleInput,
} from '@/lib/schemas/cowork';
import { defaultStore, ensureIngredient } from './products';

/**
 * Limites non négociables de la section 9, rappelées dans la sortie de
 * get_store_rules : le panier rempli est le livrable final.
 */
export const COWORK_LIMITS = [
  'Jamais de réservation de créneau de retrait.',
  'Jamais de paiement ni de validation de commande.',
  "Jamais de saisie d'identifiants : la session du navigateur est déjà ouverte.",
  'En cas de rupture, signaler par report_unavailable plutôt que substituer en silence.',
  'Un produit écarté par reject_product ne doit jamais être reproposé.',
] as const;

export type StoreContext = Awaited<ReturnType<typeof getStoreContext>>;

async function resolveStore(householdId: string, storeId?: string) {
  const store = storeId
    ? (
        await db()
          .select()
          .from(stores)
          .where(and(eq(stores.householdId, householdId), eq(stores.id, storeId)))
          .limit(1)
      )[0]
    : await defaultStore(householdId);

  if (!store) throw new DomainError('Aucune enseigne enregistrée pour ce foyer', 404);
  return store;
}

/**
 * Tout ce que Cowork doit lire au début d'une session : les règles de choix
 * ordonnées, les marques distributeur, les préférences de marque, les
 * évitements, et les limites à respecter.
 */
export async function getStoreContext(householdId: string, storeId?: string) {
  const store = await resolveStore(householdId, storeId);

  const [rules, brands, avoided, [household]] = await Promise.all([
    db()
      .select({ id: storeRules.id, priority: storeRules.priority, rule: storeRules.rule })
      .from(storeRules)
      .where(eq(storeRules.storeId, store.id))
      .orderBy(asc(storeRules.priority)),
    db()
      .select({
        id: brandPreferences.id,
        brand: brandPreferences.brand,
        aisle: brandPreferences.aisle,
        priority: brandPreferences.priority,
        ingredientName: ingredients.name,
      })
      .from(brandPreferences)
      .leftJoin(ingredients, eq(ingredients.id, brandPreferences.ingredientId))
      .where(eq(brandPreferences.householdId, householdId))
      .orderBy(asc(brandPreferences.priority)),
    db().select().from(avoidances).where(eq(avoidances.householdId, householdId)),
    db()
      .select({ constraints: households.constraints })
      .from(households)
      .where(eq(households.id, householdId))
      .limit(1),
  ]);

  return {
    store,
    rules,
    brandPreferences: brands,
    avoidances: avoided,
    constraints: household?.constraints ?? null,
    limits: COWORK_LIMITS,
  };
}

export async function setStoreRule(householdId: string, input: SetStoreRuleInput) {
  const store = await resolveStore(householdId, input.storeId);

  const [rule] = await db()
    .insert(storeRules)
    .values({ storeId: store.id, rule: input.rule, priority: input.priority ?? 0 })
    .returning();

  return rule;
}

export async function deleteStoreRule(householdId: string, ruleId: string) {
  const [rule] = await db()
    .select({ id: storeRules.id })
    .from(storeRules)
    .innerJoin(stores, eq(stores.id, storeRules.storeId))
    .where(and(eq(storeRules.id, ruleId), eq(stores.householdId, householdId)))
    .limit(1);

  if (!rule) throw new DomainError('Règle introuvable', 404);
  await db().delete(storeRules).where(eq(storeRules.id, ruleId));
}

/**
 * Une préférence peut être large (tout le rayon crémerie en Marque Repère) ou
 * ciblée (le beurre en telle marque). La plus spécifique gagne : on l'exprime
 * par la priorité, qu'on abaisse d'office pour une préférence ciblée.
 */
export async function setBrandPreference(householdId: string, input: SetBrandPreferenceInput) {
  const ingredient = input.ingredientName
    ? await ensureIngredient(householdId, input.ingredientName, input.aisle)
    : null;

  const [preference] = await db()
    .insert(brandPreferences)
    .values({
      householdId,
      storeId: input.storeId,
      aisle: ingredient ? null : (input.aisle ?? null),
      ingredientId: ingredient?.id ?? null,
      brand: input.brand,
      priority: input.priority ?? (ingredient ? 0 : 10),
    })
    .returning();

  return { preference, ingredient };
}

export async function setAvoidance(householdId: string, input: SetAvoidanceInput) {
  const [avoidance] = await db()
    .insert(avoidances)
    .values({
      householdId,
      scope: input.scope,
      value: input.value,
      reason: input.reason,
      isHard: input.isHard ?? input.reason === 'allergie',
    })
    .returning();

  return avoidance;
}

export async function listAvoidances(householdId: string) {
  return db().select().from(avoidances).where(eq(avoidances.householdId, householdId));
}

export async function deleteAvoidance(householdId: string, id: string) {
  const removed = await db()
    .delete(avoidances)
    .where(and(eq(avoidances.householdId, householdId), eq(avoidances.id, id)))
    .returning({ id: avoidances.id });

  if (removed.length === 0) throw new DomainError('Évitement introuvable', 404);
}

/** Contraintes du foyer en texte libre, exposées au MCP (section 10.1). */
export async function setHouseholdConstraints(householdId: string, constraints: string) {
  const [household] = await db()
    .update(households)
    .set({ constraints })
    .where(eq(households.id, householdId))
    .returning();

  if (!household) throw new DomainError('Foyer introuvable', 404);
  return household;
}
