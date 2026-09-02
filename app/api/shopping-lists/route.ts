import { withSession } from '@/lib/api';
import { generateShoppingList, listShoppingLists } from '@/lib/domain/shopping';
import { generateShoppingListInput } from '@/lib/schemas/shopping';

export async function GET() {
  return withSession((session) => listShoppingLists(session.householdId));
}

export async function POST(request: Request) {
  const body = await request.json();
  return withSession((session) =>
    generateShoppingList(session.householdId, generateShoppingListInput.parse(body)),
  );
}
