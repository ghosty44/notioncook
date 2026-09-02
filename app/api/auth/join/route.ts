import { NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/api';
import { createSession } from '@/lib/auth/session';
import { joinHousehold } from '@/lib/domain/households';
import { joinHouseholdInput } from '@/lib/schemas/auth';

export async function POST(request: Request) {
  try {
    const input = joinHouseholdInput.parse(await request.json());
    const session = await joinHousehold(input);
    await createSession(session);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
