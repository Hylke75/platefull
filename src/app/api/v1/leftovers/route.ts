import { leftoverState, leftoverUseBy } from '@/domain/pantry';
import { requireHousehold } from '@/server/context';
import { handler, idempotencyKey, ok, parseJson } from '@/server/http';
import { loadLeftovers } from '@/server/repo';
import { leftoverSchema } from '@/server/schemas';

export const GET = handler(async () => {
  const ctx = await requireHousehold();
  const now = new Date();
  const items = await loadLeftovers(ctx.supabase, ctx.householdId);
  return ok({ items: items.map((l) => ({ ...l, state: leftoverState(l, now) })) });
});

/** Bewaardatum wordt altijd server-side bepaald volgens de conservatieve termijn (R-07). */
export const POST = handler(async (req: Request) => {
  const ctx = await requireHousehold();
  idempotencyKey(req);
  const body = await parseJson(req, leftoverSchema);
  const storedAt = new Date();
  const res = await ctx.supabase.from('leftovers').insert({
    household_id: ctx.householdId, source_slot_id: body.source_slot_id ?? null, label: body.label, portions: body.portions,
    storage: body.storage, stored_at: storedAt.toISOString(), use_by: leftoverUseBy(storedAt, body.storage).toISOString(),
  }).select('*').single();
  if (res.error) throw res.error;
  return ok({ item: res.data }, { status: 201 });
});
