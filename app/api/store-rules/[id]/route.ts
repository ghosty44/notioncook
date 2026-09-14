import { withSession } from '@/lib/api';
import { deleteStoreRule } from '@/lib/domain/store-rules';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withSession(async (session) => {
    await deleteStoreRule(session.householdId, id);
    return { ok: true };
  });
}
