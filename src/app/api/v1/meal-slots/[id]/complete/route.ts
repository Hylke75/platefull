import { leftoverUseBy } from '@/domain/pantry';
import { requireHousehold } from '@/server/context';
import { ApiError, expectedRevision, handler, idempotencyKey, ok, parseJson, uuid } from '@/server/http';
import { commit } from '@/server/planning';
import { loadSlot } from '@/server/repo';
import { completeSchema } from '@/server/schemas';
import { RECIPE_MAP } from '@/domain/catalog/recipes';

/** 'Gekookt' (S-11): slot afronden, optioneel restjes en feedback. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  const slotId = uuid.parse((await params).id);
  const idem = idempotencyKey(req)!;
  const body = await parseJson(req, completeSchema);
  const { slot } = await loadSlot(ctx.supabase, ctx.householdId, slotId);
  let revision = expectedRevision(req);
  if (slot.state === 'completed') return ok({ slot_id: slotId, revision: slot.revision, state: 'completed' });
  if (!['accepted', 'changed', 'cooking'].includes(slot.state)) throw new ApiError('unsafe_or_unavailable', 'Bevestig eerst de maaltijd.');
  if (slot.state !== 'cooking') {
    revision = (await commit(ctx, { slotId, expectedRevision: revision, idempotencyKey: `${idem}-c`, event: 'start_cooking', newState: 'cooking' })).revision;
  }
  const res = await commit(ctx, { slotId, expectedRevision: revision, idempotencyKey: idem, event: 'complete', newState: 'completed' });
  if (body.leftovers) {
    const storedAt = new Date();
    const { error } = await ctx.supabase.from('leftovers').insert({
      household_id: ctx.householdId, source_slot_id: slotId, label: RECIPE_MAP.get(slot.recipe_id ?? '')?.name ?? 'Restjes',
      portions: body.leftovers.portions, storage: body.leftovers.storage, stored_at: storedAt.toISOString(), use_by: leftoverUseBy(storedAt, body.leftovers.storage).toISOString(),
    });
    if (error) throw error;
  }
  if (body.feedback?.length) {
    // Eén waardering per eter per maaltijd; een tweede verzoek (retry) wordt genegeerd.
    const { data: prior } = await ctx.supabase.from('meal_feedback').select('profile_id').eq('slot_id', slotId);
    const seen = new Set((prior ?? []).map((f) => f.profile_id));
    const rows = body.feedback.filter((f) => !seen.has(f.profile_id)).map((f) => ({ household_id: ctx.householdId, slot_id: slotId, profile_id: f.profile_id, rating: f.rating, created_by: ctx.user.id }));
    if (rows.length) {
      const { error } = await ctx.supabase.from('meal_feedback').insert(rows);
      if (error) throw error;
    }
  }
  return ok(res);
});
