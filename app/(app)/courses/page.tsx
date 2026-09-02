import { readSession } from '@/lib/auth/session';
import { DomainError } from '@/lib/errors';
import { listStores } from '@/lib/domain/products';
import { weekStartOf, weekDays } from '@/lib/domain/plan';
import { getShoppingList, type ShoppingListView } from '@/lib/domain/shopping';
import { ShoppingList } from '@/components/ShoppingList';

export default async function CoursesPage() {
  const session = await readSession();
  if (!session) return null;

  let list: ShoppingListView | null = null;
  try {
    list = await getShoppingList(session.householdId);
  } catch (error) {
    if (!(error instanceof DomainError) || error.status !== 404) throw error;
  }

  const stores = await listStores(session.householdId);
  const days = weekDays(weekStartOf());

  return (
    <ShoppingList
      list={list}
      stores={stores.map((store) => ({ id: store.id, name: store.name }))}
      defaultRange={{ fromDate: days[0], toDate: days[6] }}
    />
  );
}
