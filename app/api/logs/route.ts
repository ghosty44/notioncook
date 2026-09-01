import { withSession } from '@/lib/api';
import { listLogs, logMeal } from '@/lib/domain/meals';
import { logMealInput } from '@/lib/schemas/meals';

export async function GET() {
  return withSession((session) => listLogs(session.householdId));
}

export async function POST(request: Request) {
  const body = await request.json();
  return withSession((session) => logMeal(session.householdId, logMealInput.parse(body)));
}
