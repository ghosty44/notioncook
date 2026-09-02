import { readSession } from '@/lib/auth/session';
import { listMeals } from '@/lib/domain/meals';
import { getWeekPlan, weekStartOf } from '@/lib/domain/plan';
import { WeekPlan } from '@/components/WeekPlan';

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>;
}) {
  const session = await readSession();
  if (!session) return null;

  const { semaine } = await searchParams;
  const weekStart = weekStartOf(semaine);

  const [cells, meals] = await Promise.all([
    getWeekPlan(session.householdId, weekStart),
    listMeals(session.householdId),
  ]);

  return <WeekPlan cells={cells} meals={meals} weekStart={weekStart} />;
}
