import { readSession } from '@/lib/auth/session';
import { listLogs } from '@/lib/domain/meals';
import { getHousehold } from '@/lib/domain/households';
import { Journal } from '@/components/Journal';

export default async function JournalPage() {
  const session = await readSession();
  if (!session) return null;

  const [logs, household] = await Promise.all([
    listLogs(session.householdId),
    getHousehold(session.householdId),
  ]);

  return (
    <Journal
      logs={logs}
      inviteCode={household?.inviteCode ?? null}
      hasMcpToken={Boolean(household?.mcpTokenHash)}
    />
  );
}
