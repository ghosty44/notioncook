import { withSession } from '@/lib/api';
import { setListItemChecked } from '@/lib/domain/shopping';
import { toggleListItemInput } from '@/lib/schemas/shopping';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json();
  return withSession((session) =>
    setListItemChecked(session.householdId, id, toggleListItemInput.parse(body).isChecked),
  );
}
