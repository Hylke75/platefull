import { requireHousehold } from '@/server/context';
import { ApiError, handler, ok, parseJson, uuid } from '@/server/http';
import { hardRuleSchema } from '@/server/schemas';

/** Harde beperking na volwassen autorisatie + toestemming (F-005). Alleen volwassen accounts kunnen inloggen (§2). */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  const pid = uuid.parse((await params).id);
  const { data } = await ctx.supabase.from('profiles').select('id').eq('id', pid).eq('household_id', ctx.householdId).maybeSingle();
  if (!data) throw new ApiError('not_found');
  const body = await parseJson(req, hardRuleSchema);
  const res = await ctx.supabase.rpc('add_hard_rule', { p_profile_id: pid, p_target_type: body.target_type, p_target_id: body.target_id, p_severity: body.severity });
  if (res.error) throw res.error;
  return ok(res.data, { status: 201 });
});
