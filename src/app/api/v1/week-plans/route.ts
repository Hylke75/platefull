import { weekStart } from '@/domain/dates';
import { requireHousehold } from '@/server/context';
import { ApiError, handler, ok } from '@/server/http';
import { loadHousehold } from '@/server/repo';
import { todayFor } from '@/server/planning';

/** Uitbreiding op §10: het (idempotent aangemaakte) weekplan voor een week opvragen. */
export const GET = handler(async (req: Request) => {
  const ctx = await requireHousehold();
  const household = await loadHousehold(ctx.supabase, ctx.householdId);
  const param = new URL(req.url).searchParams.get('week_start');
  if (param && !/^\d{4}-\d{2}-\d{2}$/.test(param)) throw new ApiError('invalid_input');
  const start = weekStart(param ?? todayFor(household));
  const { data, error } = await ctx.supabase.rpc('ensure_week_plan', { p_week_start: start });
  if (error) throw error;
  return ok({ plan_id: data, week_start: start });
});
