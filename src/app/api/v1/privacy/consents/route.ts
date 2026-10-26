import { CONSENT_VERSIONS } from '@/lib/env';
import { requireHousehold } from '@/server/context';
import { handler, ok, parseJson } from '@/server/http';
import { consentSchema } from '@/server/schemas';

export const GET = handler(async () => {
  const ctx = await requireHousehold();
  const { data, error } = await ctx.supabase.from('consents').select('id, purpose, consent_version, granted_at, withdrawn_at').eq('household_id', ctx.householdId).order('granted_at', { ascending: false });
  if (error) throw error;
  return ok({ consents: data, current_versions: CONSENT_VERSIONS });
});

/** Toestemming geven of intrekken (§2.1). Intrekken verwijdert harde regels en blokkeert 'veilig'-claims. */
export const PUT = handler(async (req: Request) => {
  const ctx = await requireHousehold();
  const body = await parseJson(req, consentSchema);
  const res = body.granted
    ? await ctx.supabase.rpc('grant_health_consent', { p_version: CONSENT_VERSIONS.health })
    : await ctx.supabase.rpc('withdraw_health_consent');
  if (res.error) throw res.error;
  return ok({ purpose: body.purpose, granted: body.granted });
});
