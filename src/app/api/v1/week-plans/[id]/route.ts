import { countEaters } from '@/domain/engine';
import { requireHousehold } from '@/server/context';
import { ApiError, handler, idempotencyKey, ok, parseJson, uuid } from '@/server/http';
import { commit, loadBundle, postValidate, recomputeShopping } from '@/server/planning';
import { loadPlanSlots, loadSlot, toAttendees } from '@/server/repo';
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
  const { slot, attendees: rows } = await loadSlot(ctx.supabase, ctx.householdId, body.slot_id);
  if (slot.plan_id !== p.id) throw new ApiError('not_found');
  if (body.recipe_id === null) {
    const target = ['accepted', 'changed', 'cooking'].includes(slot.state) ? 'cancelled' : 'dismissed';
    const shopping = target === 'cancelled' ? await recomputeShopping(ctx, p.id, { slotId: slot.id, state: 'cancelled' }) : null;
    return ok(await commit(ctx, { slotId: slot.id, expectedRevision: body.revision, idempotencyKey: idempotencyKey(req, false), event: 'cancel', newState: target, shopping }));
  }
  const bundle = await loadBundle(ctx, slot.local_date);
  const attendees = toAttendees(rows);
  postValidate({ recipeId: body.recipe_id, variantIds: [] }, attendees, bundle);
  const shopping = slot.state === 'accepted' ? await recomputeShopping(ctx, p.id, { slotId: slot.id, state: 'proposed' }) : null;
  return ok(await commit(ctx, {
    slotId: slot.id, expectedRevision: body.revision, idempotencyKey: idempotencyKey(req, false), event: 'manual_plan', newState: 'proposed',
    recipeId: body.recipe_id, variantIds: [], servings: countEaters(attendees), shopping,
  }));
});
