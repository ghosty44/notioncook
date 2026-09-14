import { readSession } from '@/lib/auth/session';
import { DomainError } from '@/lib/errors';
import { listStores } from '@/lib/domain/products';
import { getStoreContext, type StoreContext } from '@/lib/domain/store-rules';
import { getRecurringItems } from '@/lib/domain/shopping';
import { Preferences } from '@/components/Preferences';

export default async function PreferencesPage() {
  const session = await readSession();
  if (!session) return null;

  const stores = await listStores(session.householdId);

  let context: StoreContext | null = null;
  try {
    context = await getStoreContext(session.householdId);
  } catch (error) {
    if (!(error instanceof DomainError) || error.status !== 404) throw error;
  }

  const recurring = await getRecurringItems(session.householdId);

  return (
    <Preferences
      hasStore={stores.length > 0}
      context={context}
      recurring={recurring.map((item) => ({
        id: item.id,
        label: item.label,
        frequencyWeeks: item.frequencyWeeks,
        isDue: item.isDue,
      }))}
    />
  );
}
