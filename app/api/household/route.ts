import { z } from 'zod';
import { withSession } from '@/lib/api';
import { getHousehold } from '@/lib/domain/households';
import { setHouseholdConstraints } from '@/lib/domain/store-rules';

const patchInput = z.object({ constraints: z.string().trim().max(4000) });

export async function GET() {
  return withSession((session) => getHousehold(session.householdId));
}

export async function PATCH(request: Request) {
  const body = patchInput.parse(await request.json());
  return withSession((session) => setHouseholdConstraints(session.householdId, body.constraints));
}
