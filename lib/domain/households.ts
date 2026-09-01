import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { households, users } from '@/lib/db/schema';
import { canonicalInviteCode, generateInviteCode } from '@/lib/auth/codes';
import type { Session } from '@/lib/auth/session';
import type { CreateHouseholdInput, JoinHouseholdInput } from '@/lib/schemas/auth';

export class DomainError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export async function createHousehold(input: CreateHouseholdInput): Promise<Session> {
  const [household] = await db()
    .insert(households)
    .values({ name: input.householdName, inviteCode: generateInviteCode() })
    .returning();

  const [user] = await db()
    .insert(users)
    .values({ householdId: household.id, email: input.email, name: input.name })
    .returning();

  return { userId: user.id, householdId: household.id, name: user.name };
}

export async function joinHousehold(input: JoinHouseholdInput): Promise<Session> {
  const code = canonicalInviteCode(input.code);
  const [household] = await db()
    .select()
    .from(households)
    .where(eq(households.inviteCode, code))
    .limit(1);

  if (!household) throw new DomainError("Ce code d'invitation ne correspond à aucun foyer", 404);

  // Un même email qui revient sur le foyer reprend son compte au lieu d'en créer un second.
  const existing = await findUser(household.id, input.email);
  if (existing) return { userId: existing.id, householdId: household.id, name: existing.name };

  const [user] = await db()
    .insert(users)
    .values({ householdId: household.id, email: input.email, name: input.name })
    .returning();

  return { userId: user.id, householdId: household.id, name: user.name };
}

async function findUser(householdId: string, email: string) {
  const rows = await db().select().from(users).where(eq(users.householdId, householdId));
  return rows.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function getHousehold(householdId: string) {
  const [household] = await db()
    .select()
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  return household ?? null;
}
