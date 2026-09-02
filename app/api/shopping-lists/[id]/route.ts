import { withSession } from '@/lib/api';
import { addToShoppingList, getShoppingList } from '@/lib/domain/shopping';
import { addToShoppingListInput } from '@/lib/schemas/shopping';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  return withSession((session) =>
    getShoppingList(session.householdId, id === 'courante' ? undefined : id),
  );
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json();
  return withSession((session) =>
    addToShoppingList(
      session.householdId,
      addToShoppingListInput.parse({ ...body, listId: id === 'courante' ? undefined : id }),
    ),
  );
}
