import { withSession } from '@/lib/api';
import { listAvoidances, setAvoidance } from '@/lib/domain/store-rules';
import { setAvoidanceInput } from '@/lib/schemas/cowork';

export async function GET() {
  return withSession((session) => listAvoidances(session.householdId));
}

export async function POST(request: Request) {
  const body = await request.json();
  return withSession((session) => setAvoidance(session.householdId, setAvoidanceInput.parse(body)));
}
