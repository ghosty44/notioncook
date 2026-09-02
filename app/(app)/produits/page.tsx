import { readSession } from '@/lib/auth/session';
import { listProducts, listStores, listUnmappedIngredients } from '@/lib/domain/products';
import { getRecurringItems } from '@/lib/domain/shopping';
import { ProductsManager } from '@/components/ProductsManager';

export default async function ProduitsPage() {
  const session = await readSession();
  if (!session) return null;

  const stores = await listStores(session.householdId);
  const storeId = stores[0]?.id;

  const [products, unmapped, recurring] = await Promise.all([
    listProducts(session.householdId, storeId),
    storeId ? listUnmappedIngredients(session.householdId, storeId) : Promise.resolve([]),
    getRecurringItems(session.householdId),
  ]);

  return (
    <ProductsManager
      stores={stores.map((store) => ({ id: store.id, name: store.name }))}
      products={products}
      unmapped={unmapped}
      recurring={recurring}
    />
  );
}
