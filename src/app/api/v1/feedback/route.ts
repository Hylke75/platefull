import { requireHousehold } from '@/server/context';
import { ApiError, handler, ok, parseJson } from '@/server/http';
import { loadSlot } from '@/server/repo';
import { feedbackSchema } from '@/server/schemas';

/** 'Voor herhaling', 'prima', 'liever anders' (F-017). Verbetert de ranking, maakt nooit een uitsluiting (R-08). */
export const POST = handler(async (req: Request) => {
  const ctx = await requireHousehold();
  const body = await parseJson(req, feedbackSchema);
  await loadSlot(ctx.supabase, ctx.householdId, body.slot_id);
  if (body.profile_id) {
    const p = await ctx.supabase.from('profiles').select('id').eq('id', body.profile_id).eq('household_id', ctx.householdId).maybeSingle();
    if (!p.data) throw new ApiError('not_found');
  }
  const q = ctx.supabase.from('meal_feedback').select('id').eq('slot_id', body.slot_id);
  const existing = await (body.profile_id ? q.eq('profile_id', body.profile_id) : q.is('profile_id', null)).maybeSingle();
  if (existing.error) throw existing.error;
  const res = existing.data
    ? await ctx.supabase.from('meal_feedback').update({ rating: body.rating, comment: body.comment ?? null }).eq('id', existing.data.id)
    : await ctx.supabase.from('meal_feedback').insert({ household_id: ctx.householdId, slot_id: body.slot_id, profile_id: body.profile_id, rating: body.rating, comment: body.comment ?? null, created_by: ctx.user.id });
  if (res.error) throw res.error;
  return ok({ saved: true }, { status: 201 });
});
