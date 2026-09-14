import { withSession } from '@/lib/api';
import { listPendingCandidates } from '@/lib/domain/import';

export async function GET() {
  return withSession((session) => listPendingCandidates(session.householdId));
}
