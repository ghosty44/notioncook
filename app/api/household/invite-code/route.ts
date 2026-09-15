import { withSession } from '@/lib/api';
import { rotateInviteCode } from '@/lib/domain/households';

/** Régénère le code du foyer, ce qui invalide immédiatement l'ancien. */
export async function POST() {
  return withSession((session) => rotateInviteCode(session.householdId));
}
