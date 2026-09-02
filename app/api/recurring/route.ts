import { z } from 'zod';
import { withSession } from '@/lib/api';
import { addRecurringItem, getRecurringItems } from '@/lib/domain/shopping';

const addRecurringInput = z.object({
  productId: z.string().min(1),
  frequencyWeeks: z.number().int().min(1).max(12).optional(),
  defaultQuantity: z.number().positive().optional(),
});

export async function GET() {
  return withSession((session) => getRecurringItems(session.householdId));
}

export async function POST(request: Request) {
  const body = await request.json();
  return withSession((session) =>
    addRecurringItem(session.householdId, addRecurringInput.parse(body)),
  );
}
