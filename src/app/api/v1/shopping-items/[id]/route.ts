import { setShoppingItemState } from '@/core/actions';
import { actionCtx, requireHousehold } from '@/server/context';
import { handler, idempotencyKey, ok, parseJson, uuid } from '@/server/http';
import { itemPatchSchema } from '@/server/schemas';

/** Afvinken met optimistische versiecontrole: een gelijktijdige wijziging geeft 409, geen stille overschrijving. */
export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  idempotencyKey(req);
  const body = await parseJson(req, itemPatchSchema);
  return ok({ item: await setShoppingItemState(actionCtx(ctx), uuid.parse((await params).id), body.state, body.version) });
});

export const DELETE = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  idempotencyKey(req);
  const id = uuid.parse((await params).id);
  const res = await ctx.supabase.from('shopping_items').delete().eq('id', id).eq('household_id', ctx.householdId).eq('origin', 'manual');
  if (res.error) throw res.error;
  return ok({ deleted: true });
});
