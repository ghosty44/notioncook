import { withSession } from '@/lib/api';
import { removeRecurringItem } from '@/lib/domain/shopping';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withSession(async (session) => {
    await removeRecurringItem(session.householdId, id);
    return { ok: true };
  });
}
