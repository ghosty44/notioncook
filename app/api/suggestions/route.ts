import { withSession } from '@/lib/api';
import { suggestMeals } from '@/lib/domain/suggestions';
import { suggestMealsInput } from '@/lib/schemas/suggestions';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const timeAvailable = params.get('timeAvailable');
  const count = params.get('count');

  return withSession((session) =>
    suggestMeals(
      session.householdId,
      suggestMealsInput.parse({
        timeAvailable: timeAvailable ? Number(timeAvailable) : undefined,
        excludeIngredients: params.getAll('exclude').length ? params.getAll('exclude') : undefined,
        tags: params.getAll('tag').length ? params.getAll('tag') : undefined,
        count: count ? Number(count) : undefined,
      }),
    ),
  );
}
