import { withSession } from '@/lib/api';
import { getStoreContext, setStoreRule } from '@/lib/domain/store-rules';
import { setStoreRuleInput } from '@/lib/schemas/cowork';

export async function GET(request: Request) {
  const storeId = new URL(request.url).searchParams.get('storeId') ?? undefined;
  return withSession((session) => getStoreContext(session.householdId, storeId));
}

export async function POST(request: Request) {
  const body = await request.json();
  return withSession((session) => setStoreRule(session.householdId, setStoreRuleInput.parse(body)));
}
