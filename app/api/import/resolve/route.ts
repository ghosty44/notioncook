import { withSession } from '@/lib/api';
import { resolveCandidates } from '@/lib/domain/import';
import { resolveCandidatesInput } from '@/lib/schemas/import';

export async function POST(request: Request) {
  const body = await request.json();
  return withSession((session) =>
    resolveCandidates(session.householdId, resolveCandidatesInput.parse(body)),
  );
}
