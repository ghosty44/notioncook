import { readSession } from '@/lib/auth/session';
import { listPendingCandidates } from '@/lib/domain/import';
import { CandidateQueue } from '@/components/CandidateQueue';

export default async function ValidationPage() {
  const session = await readSession();
  if (!session) return null;

  const candidates = await listPendingCandidates(session.householdId);
  return <CandidateQueue candidates={candidates} />;
}
