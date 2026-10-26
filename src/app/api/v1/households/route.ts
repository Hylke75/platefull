import { CONSENT_VERSIONS } from '@/lib/env';
import { getContext } from '@/server/context';
import { ApiError, handler, ok, parseJson } from '@/server/http';
import { loadHousehold } from '@/server/repo';
import { createHouseholdSchema } from '@/server/schemas';

export const GET = handler(async () => {
  const ctx = await getContext();
  if (!ctx.householdId) return ok({ household: null });
  return ok({ household: await loadHousehold(ctx.supabase, ctx.householdId), role: ctx.role });
});

export const POST = handler(async (req: Request) => {
  const ctx = await getContext();
  if (ctx.householdId) throw new ApiError('revision_conflict', 'Je hoort al bij een gezin.');
  const body = await parseJson(req, createHouseholdSchema);
  const { data, error } = await ctx.supabase.rpc('create_household', { p_name: body.name ?? '', p_usual_diners: body.usual_diners, p_terms_version: CONSENT_VERSIONS.terms });
  if (error) throw error;
  return ok({ household_id: data }, { status: 201 });
});
