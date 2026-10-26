import { requireHousehold } from '@/server/context';
import { ApiError, handler, ok, parseJson, uuid } from '@/server/http';
import { preferencesSchema } from '@/server/schemas';

const HARD = ['HARD_ALLERGY', 'HARD_MEDICAL', 'HARD_DIET'];

async function own(id: string) {
  const ctx = await requireHousehold();
  const pid = uuid.parse(id);
  const { data } = await ctx.supabase.from('profiles').select('id').eq('id', pid).eq('household_id', ctx.householdId).maybeSingle();
  if (!data) throw new ApiError('not_found');
  return { ctx, pid };
}

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { ctx, pid } = await own((await params).id);
  const { data, error } = await ctx.supabase.from('profile_rules').select('id, target_type, target_id, preparation, severity, source, updated_at').eq('profile_id', pid).order('created_at');
  if (error) throw error;
  return ok({ soft: data.filter((r) => !HARD.includes(r.severity)), hard: data.filter((r) => HARD.includes(r.severity)) });
});

/** Volledige set zachte voorkeuren vervangen. Harde regels blijven onaangetast (aparte functie, RLS weigert ze hier). */
export const PUT = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { ctx, pid } = await own((await params).id);
  const body = await parseJson(req, preferencesSchema);
  const { data: hard } = await ctx.supabase.from('profile_rules').select('target_type, target_id').eq('profile_id', pid).in('severity', HARD);
  const hardKeys = new Set((hard ?? []).map((h) => `${h.target_type}:${h.target_id}`));
  const rows = body.rules
    .filter((r) => !hardKeys.has(`${r.target_type}:${r.target_id}`))
    .map((r) => ({ household_id: ctx.householdId, profile_id: pid, target_type: r.target_type, target_id: r.target_id, preparation: r.preparation, severity: r.severity, source: body.source, created_by: ctx.user.id }));
  // Eerst upsert, dan pas overbodige zachte regels weg: een fout halverwege verliest geen voorkeuren.
  if (rows.length) {
    const up = await ctx.supabase.from('profile_rules').upsert(rows, { onConflict: 'profile_id,target_type,target_id,preparation' });
    if (up.error) throw up.error;
  }
  const keep = new Set(rows.map((r) => `${r.target_type}:${r.target_id}:${r.preparation}`));
  const { data: current, error } = await ctx.supabase.from('profile_rules').select('id, target_type, target_id, preparation, severity').eq('profile_id', pid);
  if (error) throw error;
  const remove = current.filter((r) => !HARD.includes(r.severity) && !keep.has(`${r.target_type}:${r.target_id}:${r.preparation}`)).map((r) => r.id);
  if (remove.length) {
    const del = await ctx.supabase.from('profile_rules').delete().in('id', remove);
    if (del.error) throw del.error;
  }
  return ok({ saved: rows.length, skipped_hard: body.rules.length - rows.length });
});
