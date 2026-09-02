import { withSession } from '@/lib/api';
import { createMeal, listMeals } from '@/lib/domain/meals';
import { createMealInput, searchMealsInput } from '@/lib/schemas/meals';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return withSession((session) =>
    listMeals(
      session.householdId,
      searchMealsInput.parse({
        query: params.get('query') ?? undefined,
        kind: params.get('kind') ?? undefined,
        effort: params.get('effort') ?? undefined,
        tags: params.getAll('tag').length ? params.getAll('tag') : undefined,
        includeArchived: params.get('includeArchived') === 'true' ? true : undefined,
      }),
    ),
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  return withSession((session) => createMeal(session.householdId, createMealInput.parse(body)));
}
