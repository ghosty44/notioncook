import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ingredients, mealIngredients, mealLogs, meals } from '@/lib/db/schema';
import type { SuggestMealsInput } from '@/lib/schemas/suggestions';
import { normalize, today } from './text';

export type SuggestionCandidate = {
  id: string;
  name: string;
  kind: 'recipe' | 'combo' | 'leftover_base';
  effort: 'express' | 'standard' | 'projet';
  tags: string[];
  season: string[];
  rating: number | null;
  babyNote: string | null;
  lastLoggedAt: string | null;
  lastLogLikedByBaby: boolean | null;
  ingredientNames: string[];
};

export type SuggestionInput = {
  /** Minutes disponibles pour cuisiner. */
  timeAvailable?: number;
  excludeIngredients?: string[];
  tags?: string[];
  count?: number;
};

export type ScoredMeal = SuggestionCandidate & {
  score: number;
  /** Détail du score, renvoyé tel quel pour que la suggestion soit explicable. */
  reasons: string[];
};

const DAYS_CAP = 90;

/** Durée haute de chaque niveau d'effort, en minutes. */
const EFFORT_CEILING = { express: 10, standard: 30, projet: 45 } as const;

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** Saison de l'hémisphère nord, par mois (0 = janvier). */
function seasonOf(month: number): string {
  if (month <= 1 || month === 11) return 'hiver';
  if (month <= 4) return 'printemps';
  if (month <= 7) return 'été';
  return 'automne';
}

/**
 * Un repas « rentre » dans le temps disponible si sa durée haute y tient.
 * Avec 15 minutes annoncées, seul l'express marque le point ; avec une heure,
 * tout rentre et le critère cesse de discriminer, ce qui est le comportement
 * voulu.
 */
export function effortFits(effort: SuggestionCandidate['effort'], minutes: number): boolean {
  return minutes >= EFFORT_CEILING[effort];
}

export function daysSinceLastLog(lastLoggedAt: string | null, todayIso: string): number {
  if (!lastLoggedAt) return DAYS_CAP;
  const from = Date.parse(`${lastLoggedAt}T00:00:00Z`);
  const to = Date.parse(`${todayIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return DAYS_CAP;
  return Math.min(DAYS_CAP, Math.max(0, Math.round((to - from) / 86_400_000)));
}

/**
 * Score déterministe et explicable de la section 4.4 du spec. Aucune IA côté
 * serveur : la couche langage naturel est faite par Claude via le MCP.
 */
export function scoreMeal(
  meal: SuggestionCandidate,
  input: SuggestionInput,
  todayIso: string,
): ScoredMeal {
  const reasons: string[] = [];
  const days = daysSinceLastLog(meal.lastLoggedAt, todayIso);
  let score = days;
  reasons.push(
    meal.lastLoggedAt
      ? `+${days} pas fait depuis ${days} jour${days > 1 ? 's' : ''}`
      : `+${days} jamais fait`,
  );

  if (input.timeAvailable !== undefined && effortFits(meal.effort, input.timeAvailable)) {
    score += 20;
    reasons.push(`+20 tient dans ${input.timeAvailable} min`);
  }

  const month = Number(todayIso.slice(5, 7)) - 1;
  const current = [MONTHS[month], seasonOf(month)].map(normalize);
  if (meal.season.some((s) => current.includes(normalize(s)))) {
    score += 15;
    reasons.push('+15 de saison');
  }

  if ((meal.rating ?? 0) >= 4) {
    score += 10;
    reasons.push('+10 bien noté');
  }

  if (meal.lastLogLikedByBaby === true) {
    score += 10;
    reasons.push('+10 la petite avait aimé');
  }

  if (meal.lastLoggedAt && days < 7) {
    score -= 30;
    reasons.push('-30 fait il y a moins de 7 jours');
  }

  const excluded = (input.excludeIngredients ?? []).map(normalize).filter(Boolean);
  if (excluded.length > 0) {
    const hit = meal.ingredientNames
      .map(normalize)
      .find((name) => excluded.some((ex) => name.includes(ex) || ex.includes(name)));
    if (hit) {
      score -= 50;
      reasons.push(`-50 contient ${hit}`);
    }
  }

  return { ...meal, score, reasons };
}

export function rankMeals(
  meals: SuggestionCandidate[],
  input: SuggestionInput,
  todayIso: string,
): ScoredMeal[] {
  const tags = (input.tags ?? []).map(normalize).filter(Boolean);
  const eligible = tags.length
    ? meals.filter((meal) => {
        const mealTags = meal.tags.map(normalize);
        return tags.every((tag) => mealTags.includes(tag));
      })
    : meals;

  const ranked = eligible
    .map((meal) => scoreMeal(meal, input, todayIso))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'fr'));

  return input.count ? ranked.slice(0, input.count) : ranked;
}

/**
 * Charge les candidats du foyer et les classe. Le dernier log et son avis bébé
 * viennent de meal_log : un planning non suivi ne doit pas peser sur les
 * recommandations.
 */
export async function suggestMeals(
  householdId: string,
  input: SuggestMealsInput = {},
): Promise<ScoredMeal[]> {
  const rows = await db()
    .select({
      id: meals.id,
      name: meals.name,
      kind: meals.kind,
      effort: meals.effort,
      tags: meals.tags,
      season: meals.season,
      rating: meals.rating,
      babyNote: meals.babyNote,
      lastLoggedAt: sql<string | null>`max(${mealLogs.date})`,
      lastLogLikedByBaby: sql<
        boolean | null
      >`(array_agg(${mealLogs.likedByBaby} order by ${mealLogs.date} desc))[1]`,
      ingredientNames: sql<
        string[]
      >`coalesce(array_agg(distinct ${ingredients.name}) filter (where ${ingredients.name} is not null), '{}')`,
    })
    .from(meals)
    .leftJoin(mealLogs, eq(mealLogs.mealId, meals.id))
    .leftJoin(mealIngredients, eq(mealIngredients.mealId, meals.id))
    .leftJoin(ingredients, eq(ingredients.id, mealIngredients.ingredientId))
    .where(and(eq(meals.householdId, householdId), eq(meals.isArchived, false)))
    .groupBy(meals.id);

  return rankMeals(rows, input, today());
}
