import { withSession } from '@/lib/api';
import { getMeal, updateMeal } from '@/lib/domain/meals';
import { updateMealInput } from '@/lib/schemas/meals';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  return withSession((session) => getMeal(session.householdId, id));
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json();
  return withSession((session) => updateMeal(session.householdId, id, updateMealInput.parse(body)));
}
