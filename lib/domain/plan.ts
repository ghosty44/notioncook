import { and, between, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { meals, planEntries } from '@/lib/db/schema';
import { DomainError } from '@/lib/errors';
import type { SetPlanEntryInput } from '@/lib/schemas/plan';
import { slugify, today } from './text';

export type PlanCell = {
  date: string;
  slot: 'midi' | 'soir';
  mealId: string | null;
  mealName: string | null;
  babyNote: string | null;
  freeText: string | null;
};

/** Lundi de la semaine contenant la date donnée. La semaine se lit du lundi. */
export function weekStartOf(dateIso: string = today()): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  const shift = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - shift);
  return date.toISOString().slice(0, 10);
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${weekStart}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

/** Grille de 7 jours et 2 créneaux, cases vides comprises. */
export async function getWeekPlan(householdId: string, weekStart?: string): Promise<PlanCell[]> {
  const start = weekStartOf(weekStart ?? today());
  const days = weekDays(start);

  const rows = await db()
    .select({
      date: planEntries.date,
      slot: planEntries.slot,
      freeText: planEntries.freeText,
      mealId: meals.id,
      mealName: meals.name,
      babyNote: meals.babyNote,
    })
    .from(planEntries)
    .leftJoin(meals, eq(meals.id, planEntries.mealId))
    .where(
      and(
        eq(planEntries.householdId, householdId),
        between(planEntries.date, days[0], days[6]),
      ),
    );

  const filled = new Map(rows.map((row) => [`${row.date}:${row.slot}`, row]));

  return days.flatMap((date) =>
    (['midi', 'soir'] as const).map((slot) => {
      const row = filled.get(`${date}:${slot}`);
      return {
        date,
        slot,
        mealId: row?.mealId ?? null,
        mealName: row?.mealName ?? null,
        babyNote: row?.babyNote ?? null,
        freeText: row?.freeText ?? null,
      };
    }),
  );
}

/** Une case ne contient qu'une chose : un repas, ou du texte libre, ou rien. */
export async function setPlanEntry(householdId: string, input: SetPlanEntryInput) {
  if (input.clear) {
    await db()
      .delete(planEntries)
      .where(
        and(
          eq(planEntries.householdId, householdId),
          eq(planEntries.date, input.date),
          eq(planEntries.slot, input.slot),
        ),
      );
    return { date: input.date, slot: input.slot, cleared: true as const };
  }

  let mealId = input.mealId ?? null;

  if (!mealId && input.mealName) {
    const [meal] = await db()
      .select({ id: meals.id })
      .from(meals)
      .where(and(eq(meals.householdId, householdId), eq(meals.slug, slugify(input.mealName))))
      .limit(1);

    if (!meal) {
      throw new DomainError(
        `Aucun repas nommé « ${input.mealName} ». Crée-le d'abord, ou passe par freeText.`,
        404,
      );
    }
    mealId = meal.id;
  }

  if (mealId) {
    const [meal] = await db()
      .select({ id: meals.id })
      .from(meals)
      .where(and(eq(meals.householdId, householdId), eq(meals.id, mealId)))
      .limit(1);
    if (!meal) throw new DomainError('Repas introuvable', 404);
  }

  const [entry] = await db()
    .insert(planEntries)
    .values({
      householdId,
      date: input.date,
      slot: input.slot,
      mealId,
      freeText: mealId ? null : (input.freeText ?? null),
    })
    .onConflictDoUpdate({
      target: [planEntries.householdId, planEntries.date, planEntries.slot],
      set: { mealId, freeText: mealId ? null : (input.freeText ?? null) },
    })
    .returning();

  return entry;
}
