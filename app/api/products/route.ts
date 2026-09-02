import { withSession } from '@/lib/api';
import { listProducts, listUnmappedIngredients, setProductPreference } from '@/lib/domain/products';
import { setProductPreferenceInput } from '@/lib/schemas/shopping';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const storeId = params.get('storeId') ?? undefined;

  return withSession(async (session) => ({
    products: await listProducts(session.householdId, storeId),
    unmapped: storeId ? await listUnmappedIngredients(session.householdId, storeId) : [],
  }));
}

export async function POST(request: Request) {
  const body = await request.json();
  return withSession((session) =>
    setProductPreference(session.householdId, setProductPreferenceInput.parse(body)),
  );
}
