import { withSession } from '@/lib/api';
import { importProducts, suggestRecurringItems } from '@/lib/domain/import';
import { importProductsInput, suggestRecurringItemsInput } from '@/lib/schemas/import';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const minOccurrences = params.get('minOccurrences');

  return withSession((session) =>
    suggestRecurringItems(
      session.householdId,
      suggestRecurringItemsInput.parse({
        storeId: params.get('storeId') ?? undefined,
        minOccurrences: minOccurrences ? Number(minOccurrences) : undefined,
      }),
    ),
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  return withSession((session) =>
    importProducts(session.householdId, importProductsInput.parse(body)),
  );
}
