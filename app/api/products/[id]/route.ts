import { z } from 'zod';
import { withSession } from '@/lib/api';
import { reportUnavailable } from '@/lib/domain/products';

const patchInput = z.object({
  isUnavailable: z.literal(true),
  note: z.string().trim().max(300).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = patchInput.parse(await request.json());
  return withSession((session) =>
    reportUnavailable(session.householdId, { productId: id, note: body.note }),
  );
}
