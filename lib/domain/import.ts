import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ingredients, productCandidates, products } from '@/lib/db/schema';
import { DomainError } from '@/lib/errors';
import type {
  ImportProductsInput,
  ResolveCandidatesInput,
  SuggestRecurringItemsInput,
} from '@/lib/schemas/import';
import { ensureIngredient, requireStore } from './products';
import { normalize, slugify } from './text';

export type RawImportItem = {
  rawLabel: string;
  ingredientName?: string;
  brand?: string;
  format?: string;
  externalId?: string;
  price?: number;
  date?: string;
};

export type Confidence = 'high' | 'medium' | 'low';

/**
 * Clé de rapprochement de la section 10.2 : l'identifiant du drive s'il existe,
 * sinon le libellé normalisé. Un doublon incrémente les occurrences au lieu de
 * créer une ligne.
 */
export function dedupeKeyOf(item: { rawLabel: string; externalId?: string | null }): string {
  return item.externalId?.trim()
    ? `id:${item.externalId.trim()}`
    : `label:${normalize(item.rawLabel)}`;
}

/**
 * `high` quand on tient un identifiant produit, ou quand le nom canonique
 * apparaît tel quel dans le libellé du drive. `medium` quand le rapprochement
 * est plausible sans être prouvé. `low` sinon : ces candidats attendront une
 * validation humaine.
 */
export function confidenceFor(input: {
  externalId?: string | null;
  rawLabel: string;
  guessedIngredientName?: string | null;
  matchedIngredientName?: string | null;
}): Confidence {
  if (input.externalId?.trim()) return 'high';

  const label = normalize(input.rawLabel);

  if (input.matchedIngredientName) {
    const matched = normalize(input.matchedIngredientName);
    if (matched && label.includes(matched)) return 'high';
    return 'medium';
  }

  if (input.guessedIngredientName?.trim()) return 'medium';
  return 'low';
}

/**
 * Fréquence déduite de l'historique : écart médian entre deux achats, exprimé en
 * semaines. La médiane et non la moyenne, pour qu'un achat oublié ou un
 * doublement ponctuel ne déplace pas la valeur.
 */
export function medianWeeksBetween(dates: string[]): number | null {
  const timestamps = [...new Set(dates)]
    .map((date) => Date.parse(`${date}T00:00:00Z`))
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b);

  if (timestamps.length < 2) return null;

  const gaps = timestamps
    .slice(1)
    .map((value, index) => (value - timestamps[index]) / 86_400_000)
    .sort((a, b) => a - b);

  const middle = Math.floor(gaps.length / 2);
  const medianDays = gaps.length % 2 === 0 ? (gaps[middle - 1] + gaps[middle]) / 2 : gaps[middle];

  return Math.max(1, Math.round(medianDays / 7));
}

export type ImportReport = {
  batchId: string;
  dryRun: boolean;
  received: number;
  created: number;
  merged: number;
  alreadyMapped: number;
  autoPromoted: number;
  byConfidence: Record<Confidence, number>;
  conflicts: string[];
};

export function emptyReport(batchId: string, dryRun: boolean, received: number): ImportReport {
  return {
    batchId,
    dryRun,
    received,
    created: 0,
    merged: 0,
    alreadyMapped: 0,
    autoPromoted: 0,
    byConfidence: { high: 0, medium: 0, low: 0 },
    conflicts: [],
  };
}

/**
 * Amorçage de la base depuis un historique de drive. Rien n'est jamais écrit
 * directement dans `product` : tout passe par la table de staging
 * `product_candidate`, et `dryRun` permet de présenter le rapport avant
 * d'écrire quoi que ce soit. C'est le garde-fou principal contre un historique
 * mal parsé.
 */
export async function importProducts(
  householdId: string,
  input: ImportProductsInput,
): Promise<ImportReport> {
  await requireStore(householdId, input.storeId);

  const batchId = crypto.randomUUID();
  const report = emptyReport(batchId, input.dryRun, input.items.length);

  const known = await db()
    .select({ id: ingredients.id, name: ingredients.name, slug: ingredients.slug })
    .from(ingredients)
    .where(eq(ingredients.householdId, householdId));

  const mapped = new Set(
    (
      await db()
        .select({ ingredientId: products.ingredientId })
        .from(products)
        .where(and(eq(products.householdId, householdId), eq(products.storeId, input.storeId)))
    ).map((row) => row.ingredientId),
  );

  const existing = await db()
    .select()
    .from(productCandidates)
    .where(
      and(
        eq(productCandidates.householdId, householdId),
        eq(productCandidates.storeId, input.storeId),
      ),
    );
  const byKey = new Map(existing.map((row) => [row.dedupeKey, row]));

  // Les doublons du lot lui-même sont fusionnés avant écriture : un historique
  // contient le même produit acheté dix fois.
  const grouped = new Map<string, { item: RawImportItem; dates: string[]; count: number }>();
  for (const item of input.items) {
    const key = dedupeKeyOf(item);
    const group = grouped.get(key);
    if (group) {
      group.count += 1;
      if (item.date) group.dates.push(item.date);
    } else {
      grouped.set(key, { item, dates: item.date ? [item.date] : [], count: 1 });
    }
  }

  for (const [key, group] of grouped) {
    const match = matchIngredient(group.item, known);
    const confidence = confidenceFor({
      externalId: group.item.externalId,
      rawLabel: group.item.rawLabel,
      guessedIngredientName: group.item.ingredientName,
      matchedIngredientName: match?.name,
    });

    report.byConfidence[confidence] += 1;
    if (match && mapped.has(match.id)) report.alreadyMapped += 1;

    const previous = byKey.get(key);
    const occurrences = (previous?.occurrences ?? 0) + group.count;

    if (
      previous &&
      previous.guessedIngredientId &&
      match &&
      previous.guessedIngredientId !== match.id
    ) {
      report.conflicts.push(
        `${group.item.rawLabel} : déjà rattaché à un autre ingrédient, à trancher à la main`,
      );
    }

    if (previous) report.merged += 1;
    else report.created += 1;

    const promotable = confidence === 'high' && occurrences >= 3 && match;
    if (promotable) report.autoPromoted += 1;

    if (input.dryRun) continue;

    const lastSeen = group.dates.sort().at(-1);

    // Une fusion n'écrase rien : le libellé retenu reste celui vu en premier,
    // sans quoi une variante en majuscules d'un second export dégraderait la
    // fiche. Les champs vides, eux, se complètent.
    const values = {
      householdId,
      storeId: input.storeId,
      rawLabel: previous?.rawLabel ?? group.item.rawLabel,
      dedupeKey: key,
      guessedIngredientName:
        previous?.guessedIngredientName ?? group.item.ingredientName ?? match?.name ?? null,
      guessedIngredientId: previous?.guessedIngredientId ?? match?.id ?? null,
      brand: previous?.brand ?? group.item.brand,
      format: previous?.format ?? group.item.format,
      externalId: previous?.externalId ?? group.item.externalId,
      price: group.item.price?.toString() ?? previous?.price ?? undefined,
      occurrences,
      lastSeenAt: lastSeen ? new Date(`${lastSeen}T12:00:00Z`) : new Date(),
      confidence,
      source: input.source,
      status: promotable ? ('accepted' as const) : ('pending' as const),
      batchId,
    };

    const [candidate] = previous
      ? await db()
          .update(productCandidates)
          .set(values)
          .where(eq(productCandidates.id, previous.id))
          .returning()
      : await db().insert(productCandidates).values(values).returning();

    // `high` avec au moins trois occurrences : promu sans validation humaine,
    // tout le reste attend l'écran de validation.
    if (promotable && match) await promote(householdId, candidate, match.id);
  }

  return report;
}

function matchIngredient(
  item: RawImportItem,
  known: { id: string; name: string; slug: string }[],
): { id: string; name: string } | null {
  if (item.ingredientName) {
    const slug = slugify(item.ingredientName);
    const exact = known.find((row) => row.slug === slug);
    if (exact) return exact;
  }

  const label = normalize(item.rawLabel);
  const contained = known
    .filter((row) => normalize(row.name).length > 3 && label.includes(normalize(row.name)))
    .sort((a, b) => b.name.length - a.name.length)[0];

  return contained ?? null;
}

/** Promotion en `product`, avec le plus fréquent des candidats comme préféré. */
async function promote(
  householdId: string,
  candidate: typeof productCandidates.$inferSelect,
  ingredientId: string,
) {
  const siblings = await db()
    .select({ id: productCandidates.id, occurrences: productCandidates.occurrences })
    .from(productCandidates)
    .where(
      and(
        eq(productCandidates.householdId, householdId),
        eq(productCandidates.storeId, candidate.storeId),
        eq(productCandidates.guessedIngredientId, ingredientId),
        eq(productCandidates.status, 'accepted'),
      ),
    );

  const best = siblings.sort((a, b) => b.occurrences - a.occurrences)[0];
  const isPreferred = !best || best.id === candidate.id;

  const [existing] = await db()
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.householdId, householdId),
        eq(products.storeId, candidate.storeId),
        eq(products.ingredientId, ingredientId),
        eq(products.label, candidate.rawLabel),
      ),
    )
    .limit(1);

  const values = {
    householdId,
    storeId: candidate.storeId,
    ingredientId,
    label: candidate.rawLabel,
    brand: candidate.brand,
    format: candidate.format,
    externalId: candidate.externalId,
    lastPrice: candidate.price,
    lastSeenAt: candidate.lastSeenAt,
    isPreferred,
    note: `Importé depuis ${candidate.source ?? 'un historique'}`,
  };

  if (existing) {
    await db().update(products).set(values).where(eq(products.id, existing.id));
  } else {
    await db().insert(products).values(values);
  }

  if (isPreferred) {
    await db()
      .update(products)
      .set({ isPreferred: false })
      .where(
        and(
          eq(products.householdId, householdId),
          eq(products.storeId, candidate.storeId),
          eq(products.ingredientId, ingredientId),
          ne(products.label, candidate.rawLabel),
        ),
      );
  }
}

export async function getImportBatch(householdId: string, batchId: string) {
  const rows = await db()
    .select({
      id: productCandidates.id,
      rawLabel: productCandidates.rawLabel,
      guessedIngredientName: productCandidates.guessedIngredientName,
      brand: productCandidates.brand,
      format: productCandidates.format,
      occurrences: productCandidates.occurrences,
      confidence: productCandidates.confidence,
      status: productCandidates.status,
      source: productCandidates.source,
    })
    .from(productCandidates)
    .where(
      and(eq(productCandidates.householdId, householdId), eq(productCandidates.batchId, batchId)),
    )
    .orderBy(desc(productCandidates.occurrences));

  if (rows.length === 0) throw new DomainError('Lot introuvable', 404);
  return rows;
}

export async function listPendingCandidates(householdId: string, limit = 200) {
  return db()
    .select({
      id: productCandidates.id,
      rawLabel: productCandidates.rawLabel,
      guessedIngredientName: productCandidates.guessedIngredientName,
      brand: productCandidates.brand,
      format: productCandidates.format,
      occurrences: productCandidates.occurrences,
      confidence: productCandidates.confidence,
      source: productCandidates.source,
      batchId: productCandidates.batchId,
    })
    .from(productCandidates)
    .where(
      and(eq(productCandidates.householdId, householdId), eq(productCandidates.status, 'pending')),
    )
    .orderBy(desc(productCandidates.occurrences))
    .limit(limit);
}

/** File de validation : accepter promeut en produit, rejeter écarte le candidat. */
export async function resolveCandidates(householdId: string, input: ResolveCandidatesInput) {
  const candidates = await db()
    .select()
    .from(productCandidates)
    .where(
      and(
        eq(productCandidates.householdId, householdId),
        inArray(productCandidates.id, input.candidateIds),
      ),
    );

  if (candidates.length === 0) throw new DomainError('Aucun candidat trouvé', 404);

  if (input.action === 'reject') {
    await db()
      .update(productCandidates)
      .set({ status: 'rejected' })
      .where(
        inArray(
          productCandidates.id,
          candidates.map((row) => row.id),
        ),
      );

    return { accepted: 0, rejected: candidates.length };
  }

  let accepted = 0;
  for (const candidate of candidates) {
    const name = input.ingredientName ?? candidate.guessedIngredientName ?? candidate.rawLabel;
    const ingredient = await ensureIngredient(householdId, name);

    const [updated] = await db()
      .update(productCandidates)
      .set({
        status: 'accepted',
        guessedIngredientId: ingredient.id,
        guessedIngredientName: ingredient.name,
      })
      .where(eq(productCandidates.id, candidate.id))
      .returning();

    await promote(householdId, updated, ingredient.id);
    accepted += 1;
  }

  return { accepted, rejected: 0 };
}

/**
 * L'information la plus utile de tout l'import : ce qu'on rachète
 * systématiquement. La fréquence vient de l'écart médian entre deux achats.
 */
export async function suggestRecurringItems(
  householdId: string,
  input: SuggestRecurringItemsInput = {},
) {
  const minOccurrences = input.minOccurrences ?? 3;

  const rows = await db()
    .select({
      id: productCandidates.id,
      rawLabel: productCandidates.rawLabel,
      occurrences: productCandidates.occurrences,
      firstSeenAt: productCandidates.firstSeenAt,
      lastSeenAt: productCandidates.lastSeenAt,
      ingredientName: productCandidates.guessedIngredientName,
      storeId: productCandidates.storeId,
    })
    .from(productCandidates)
    .where(
      input.storeId
        ? and(
            eq(productCandidates.householdId, householdId),
            eq(productCandidates.storeId, input.storeId),
          )
        : eq(productCandidates.householdId, householdId),
    )
    .orderBy(desc(productCandidates.occurrences));

  return rows
    .filter((row) => row.occurrences >= minOccurrences)
    .map((row) => {
      // Sans les dates individuelles, l'étendue divisée par le nombre d'achats
      // donne le meilleur estimateur disponible.
      const spanDays = (row.lastSeenAt.getTime() - row.firstSeenAt.getTime()) / 86_400_000;
      const frequencyWeeks = Math.max(1, Math.round(spanDays / (row.occurrences - 1) / 7));

      return {
        candidateId: row.id,
        label: row.rawLabel,
        ingredientName: row.ingredientName,
        occurrences: row.occurrences,
        frequencyWeeks,
      };
    });
}
