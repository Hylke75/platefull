import { savePreferences } from '@/core/actions';
import { actionCtx, requireHousehold } from '@/server/context';
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
  return ok(await savePreferences(actionCtx(ctx), pid, body.rules, body.source));
});
