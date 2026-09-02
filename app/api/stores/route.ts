import { z } from 'zod';
import { withSession } from '@/lib/api';
import { createStore, listStores } from '@/lib/domain/products';

const createStoreInput = z.object({
  name: z.string().trim().min(1).max(80),
  baseUrl: z.url().optional(),
  houseBrands: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
});

export async function GET() {
  return withSession((session) => listStores(session.householdId));
}

export async function POST(request: Request) {
  const body = await request.json();
  return withSession((session) => createStore(session.householdId, createStoreInput.parse(body)));
}
