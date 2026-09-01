import { z } from 'zod';
import { withSession } from '@/lib/api';
import { deleteLog, updateLog } from '@/lib/domain/meals';

type Context = { params: Promise<{ id: string }> };

const patchInput = z.object({
  likedByBaby: z.boolean().nullish(),
  comment: z.string().max(2_000).optional(),
});

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json();
  return withSession((session) => updateLog(session.householdId, id, patchInput.parse(body)));
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  return withSession(async (session) => {
    await deleteLog(session.householdId, id);
    return { ok: true };
  });
}
