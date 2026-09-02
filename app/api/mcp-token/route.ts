import { withSession } from '@/lib/api';
import { issueMcpToken, revokeMcpToken } from '@/lib/auth/mcp-token';

/** Génère un jeton de foyer et remplace le précédent. Le jeton clair n'apparaît qu'ici. */
export async function POST() {
  return withSession(async (session) => ({ token: await issueMcpToken(session.householdId) }));
}

export async function DELETE() {
  return withSession(async (session) => {
    await revokeMcpToken(session.householdId);
    return { ok: true };
  });
}
