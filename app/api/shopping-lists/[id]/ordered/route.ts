import { z } from 'zod';
import { withSession } from '@/lib/api';
import { markListOrdered } from '@/lib/domain/shopping';

const body = z.object({ notes: z.string().trim().max(1000).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = body.parse(await request.json().catch(() => ({})));
  return withSession((session) => markListOrdered(session.householdId, { listId: id, ...parsed }));
}
