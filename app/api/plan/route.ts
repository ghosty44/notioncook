import { withSession } from '@/lib/api';
import { getWeekPlan, setPlanEntry } from '@/lib/domain/plan';
import { setPlanEntryInput } from '@/lib/schemas/plan';

export async function GET(request: Request) {
  const weekStart = new URL(request.url).searchParams.get('weekStart') ?? undefined;
  return withSession((session) => getWeekPlan(session.householdId, weekStart));
}

export async function PUT(request: Request) {
  const body = await request.json();
  return withSession((session) => setPlanEntry(session.householdId, setPlanEntryInput.parse(body)));
}
