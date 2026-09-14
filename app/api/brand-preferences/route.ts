import { withSession } from '@/lib/api';
import { setBrandPreference } from '@/lib/domain/store-rules';
import { setBrandPreferenceInput } from '@/lib/schemas/cowork';

export async function POST(request: Request) {
  const body = await request.json();
  return withSession((session) =>
    setBrandPreference(session.householdId, setBrandPreferenceInput.parse(body)),
  );
}
