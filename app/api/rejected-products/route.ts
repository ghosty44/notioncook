import { withSession } from '@/lib/api';
import { rejectProduct } from '@/lib/domain/products';
import { rejectProductInput } from '@/lib/schemas/cowork';

export async function POST(request: Request) {
  const body = await request.json();
  return withSession((session) =>
    rejectProduct(session.householdId, rejectProductInput.parse(body)),
  );
}
