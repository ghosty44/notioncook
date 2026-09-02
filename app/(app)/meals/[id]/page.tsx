import { notFound } from 'next/navigation';
import { readSession } from '@/lib/auth/session';
import { DomainError } from '@/lib/errors';
import { getMeal, type MealDetail } from '@/lib/domain/meals';
import { MealSheet } from '@/components/MealSheet';

export default async function MealPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return null;

  const { id } = await params;

  let meal: MealDetail;
  try {
    meal = await getMeal(session.householdId, id);
  } catch (error) {
    if (error instanceof DomainError && error.status === 404) notFound();
    throw error;
  }

  return <MealSheet meal={meal} />;
}
