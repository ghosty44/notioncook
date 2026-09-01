import { daysBetween, normalize } from './text';

export type LibraryMeal = {
  id: string;
  name: string;
  kind: 'recipe' | 'combo' | 'leftover_base';
  effort: 'express' | 'standard' | 'projet';
  tags: string[];
  notes: string | null;
  lastLoggedAt: string | null;
  logCount: number;
};

export type LibraryFilters = {
  query?: string;
  kind?: LibraryMeal['kind'];
  effort?: LibraryMeal['effort'];
  tags?: string[];
};

/**
 * Recherche plein texte simple sur nom, tags et notes. Faite en mémoire : la
 * bibliothèque d'un foyer se compte en centaines de lignes, pas en millions.
 */
export function matchesFilters(meal: LibraryMeal, filters: LibraryFilters): boolean {
  if (filters.kind && meal.kind !== filters.kind) return false;
  if (filters.effort && meal.effort !== filters.effort) return false;

  if (filters.tags?.length) {
    const mealTags = meal.tags.map(normalize);
    if (!filters.tags.every((t) => mealTags.includes(normalize(t)))) return false;
  }

  const query = filters.query?.trim();
  if (query) {
    const haystack = normalize([meal.name, meal.tags.join(' '), meal.notes ?? ''].join(' '));
    const terms = normalize(query).split(' ').filter(Boolean);
    if (!terms.every((term) => haystack.includes(term))) return false;
  }

  return true;
}

/**
 * Tri par défaut de la bibliothèque : « pas fait depuis longtemps » d'abord.
 * Un repas jamais fait passe en tête, c'est exactement ce qu'on cherche à
 * ressortir un soir de semaine.
 */
export function sortByLeastRecentlyCooked(meals: LibraryMeal[], todayIso: string): LibraryMeal[] {
  return [...meals].sort((a, b) => {
    const da = a.lastLoggedAt === null ? Infinity : daysBetween(a.lastLoggedAt, todayIso);
    const db = b.lastLoggedAt === null ? Infinity : daysBetween(b.lastLoggedAt, todayIso);
    if (da !== db) return db - da;
    return a.name.localeCompare(b.name, 'fr');
  });
}
