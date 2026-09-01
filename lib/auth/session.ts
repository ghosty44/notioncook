import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

const COOKIE = 'repas_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90;

export type Session = {
  userId: string;
  householdId: string;
  name: string;
};

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      'AUTH_SECRET manquante ou trop courte (32 caractères minimum). ' +
        'Génère-la avec `openssl rand -base64 32` et mets-la dans .env.local.',
    );
  }
  return new TextEncoder().encode(value);
}

export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    const { userId, householdId, name } = payload as Partial<Session>;
    if (!userId || !householdId || !name) return null;
    return { userId, householdId, name };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
