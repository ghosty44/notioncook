import { NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/api';
import { createSession } from '@/lib/auth/session';
import { createHousehold } from '@/lib/domain/households';
import { createHouseholdInput } from '@/lib/schemas/auth';

export async function POST(request: Request) {
  try {
    const input = createHouseholdInput.parse(await request.json());
    const session = await createHousehold(input);
    await createSession(session);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
