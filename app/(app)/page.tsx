import { readSession } from '@/lib/auth/session';
import { listLogs, listMeals } from '@/lib/domain/meals';
import { QuickCapture } from '@/components/QuickCapture';

export default async function CapturePage() {
  const session = await readSession();
  if (!session) return null;

  const [meals, logs] = await Promise.all([
    listMeals(session.householdId),
    listLogs(session.householdId, 6),
  ]);

  return <QuickCapture meals={meals} recentLogs={logs} />;
}
