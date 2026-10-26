import { requireHousehold } from '@/server/context';
import { ApiError, handler, idempotencyKey, ok, parseJson, uuid } from '@/server/http';
import { planDay } from '@/core/actions';
import { loadPlanSlots } from '@/server/repo';
import { weekPlanPatchSchema } from '@/server/schemas';

async function plan(id: string) {
  const ctx = await requireHousehold();
  const planId = uuid.parse(id);
  const { data, error } = await ctx.supabase.from('meal_plans').select('id, week_start, status, revision').eq('id', planId).eq('household_id', ctx.householdId).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError('not_found');
  return { ctx, plan: data };
}

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { ctx, plan: p } = await plan((await params).id);
  const { slots, attendees } = await loadPlanSlots(ctx.supabase, p.id);
  return ok({ plan: p, slots: slots.map((s) => ({ ...s, attendees: attendees.get(s.id) ?? [] })) });
});

/** Handmatig een dag wijzigen (F-009). Ook handmatige keuzes gaan door dezelfde veiligheidscontrole. */
export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { ctx, plan: p } = await plan((await params).id);
  const body = await parseJson(req, weekPlanPatchSchema);
  return ok(await planDay(ctx, p.id, body.slot_id, body.recipe_id, body.revision, idempotencyKey(req, false)));
});
