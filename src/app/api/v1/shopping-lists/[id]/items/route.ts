import { requireHousehold } from '@/server/context';
import { ApiError, handler, idempotencyKey, ok, parseJson, uuid } from '@/server/http';
import { manualItemSchema } from '@/server/schemas';

/** Handmatig item toevoegen; blijft staan bij elke automatische herberekening (§8.3). */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  const listId = uuid.parse((await params).id);
  const idem = idempotencyKey(req)!;
  const list = await ctx.supabase.from('shopping_lists').select('id').eq('id', listId).eq('household_id', ctx.householdId).maybeSingle();
  if (!list.data) throw new ApiError('not_found');
  const prior = await ctx.supabase.from('idempotency_keys').select('response').eq('household_id', ctx.householdId).eq('key', idem).maybeSingle();
  if (prior.data) return ok(prior.data.response, { status: 201 });
  const body = await parseJson(req, manualItemSchema);
  const ins = await ctx.supabase.from('shopping_items').insert({
    household_id: ctx.householdId, list_id: listId, description: body.description, qty: body.qty ?? null, unit: body.unit ?? null,
    origin: 'manual', category: 'overig', updated_by: ctx.user.id,
  }).select('*').single();
  if (ins.error) throw ins.error;
  await ctx.supabase.from('idempotency_keys').insert({ household_id: ctx.householdId, key: idem, endpoint: 'shopping_item_add', response: { item: ins.data } });
  return ok({ item: ins.data }, { status: 201 });
});
