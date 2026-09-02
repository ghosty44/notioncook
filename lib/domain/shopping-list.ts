import { aisleRank, type Aisle } from './aisles';
import { canCombine, combine, formatQuantity, type Quantity } from './units';

export type PlannedIngredient = {
  ingredientId: string | null;
  /** Nom canonique, ou texte libre si la ligne n'est pas normalisable. */
  label: string;
  aisle: Aisle;
  quantity: number | null;
  unit: string | null;
  isPantryStaple: boolean;
};

export type RecurringLine = {
  productId: string;
  ingredientId: string | null;
  label: string;
  aisle: Aisle;
  quantity: number | null;
  unit: string | null;
};

export type ResolvedProduct = {
  id: string;
  ingredientId: string;
  label: string;
  brand: string | null;
  format: string | null;
  productUrl: string | null;
};

export type AggregatedItem = {
  ingredientId: string | null;
  productId: string | null;
  label: string;
  aisle: Aisle;
  quantities: Quantity[];
  source: 'plan' | 'recurring' | 'manual';
  product: ResolvedProduct | null;
};

/** Clé de regroupement : l'ingrédient canonique, à défaut son libellé normalisé. */
function keyOf(item: { ingredientId: string | null; label: string }): string {
  return item.ingredientId ?? `texte:${item.label.toLowerCase()}`;
}

function addQuantity(quantities: Quantity[], quantity: Quantity): Quantity[] {
  const index = quantities.findIndex((existing) => canCombine(existing, quantity));
  if (index === -1) return [...quantities, quantity];

  const next = [...quantities];
  next[index] = combine(next[index], quantity);
  return next;
}

/**
 * Agrégation de la section 4.6, dans l'ordre :
 * 1. les ingrédients des repas planifiés
 * 2. moins ceux marqués « on en a toujours »
 * 3. regroupés par ingrédient, quantités sommées quand les unités le permettent
 * 4. plus le socle récurrent échu
 * 5. chaque ingrédient résolu vers le produit préféré de l'enseigne
 * 6. triés dans l'ordre de parcours du magasin
 *
 * Les quantités inconnues n'empêchent pas la ligne d'exister : mieux vaut « des
 * lentilles » sans quantité qu'un oubli dans le panier.
 */
export function aggregateShoppingList(input: {
  planned: PlannedIngredient[];
  recurring?: RecurringLine[];
  preferredProducts?: ResolvedProduct[];
}): AggregatedItem[] {
  const byIngredient = new Map<string, ResolvedProduct>();
  for (const product of input.preferredProducts ?? []) {
    byIngredient.set(product.ingredientId, product);
  }

  const items = new Map<string, AggregatedItem>();

  for (const line of input.planned) {
    if (line.isPantryStaple) continue;

    const key = keyOf(line);
    const existing = items.get(key);
    const quantity: Quantity | null =
      line.quantity === null ? null : { value: line.quantity, unit: line.unit };

    if (existing) {
      if (quantity) existing.quantities = addQuantity(existing.quantities, quantity);
      continue;
    }

    items.set(key, {
      ingredientId: line.ingredientId,
      productId: null,
      label: line.label,
      aisle: line.aisle,
      quantities: quantity ? [quantity] : [],
      source: 'plan',
      product: line.ingredientId ? (byIngredient.get(line.ingredientId) ?? null) : null,
    });
  }

  for (const line of input.recurring ?? []) {
    const key = keyOf(line);
    const quantity: Quantity | null =
      line.quantity === null ? null : { value: line.quantity, unit: line.unit };
    const existing = items.get(key);

    if (existing) {
      if (quantity) existing.quantities = addQuantity(existing.quantities, quantity);
      existing.productId = line.productId;
      continue;
    }

    items.set(key, {
      ingredientId: line.ingredientId,
      productId: line.productId,
      label: line.label,
      aisle: line.aisle,
      quantities: quantity ? [quantity] : [],
      source: 'recurring',
      product: line.ingredientId ? (byIngredient.get(line.ingredientId) ?? null) : null,
    });
  }

  return [...items.values()].sort(
    (a, b) => aisleRank(a.aisle) - aisleRank(b.aisle) || a.label.localeCompare(b.label, 'fr'),
  );
}

/** Une ligne sans produit résolu part dans la section « à mapper », en haut. */
export function isUnmapped(item: AggregatedItem): boolean {
  return item.product === null && item.productId === null;
}

export function formatQuantities(quantities: Quantity[]): string {
  return quantities.map(formatQuantity).join(' + ');
}

/**
 * Un récurrent est dû si on ne l'a jamais ajouté, ou si sa fréquence est écoulée
 * depuis le dernier ajout.
 */
export function isRecurringDue(
  item: { frequencyWeeks: number; lastAddedAt: Date | string | null },
  now: Date = new Date(),
): boolean {
  if (!item.lastAddedAt) return true;

  const last = item.lastAddedAt instanceof Date ? item.lastAddedAt : new Date(item.lastAddedAt);
  if (Number.isNaN(last.getTime())) return true;

  const weeks = (now.getTime() - last.getTime()) / (7 * 86_400_000);
  return weeks >= item.frequencyWeeks;
}
