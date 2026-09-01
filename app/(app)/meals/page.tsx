import { readSession } from '@/lib/auth/session';
import { listMeals } from '@/lib/domain/meals';
import { MealLibrary } from '@/components/MealLibrary';

export default async function MealsPage() {
  const session = await readSession();
  if (!session) return null;

  const meals = await listMeals(session.householdId);
  return <MealLibrary meals={meals} />;
}
