import { requireHousehold } from '@/server/context';
import { ApiError, handler, idempotencyKey, ok, parseJson, uuid } from '@/server/http';
import { itemPatchSchema } from '@/server/schemas';

/** Afvinken met optimistische versiecontrole: een gelijktijdige wijziging geeft 409, geen stille overschrijving. */
export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  idempotencyKey(req);
  const id = uuid.parse((await params).id);
  const body = await parseJson(req, itemPatchSchema);
  const res = await ctx.supabase.from('shopping_items')
    .update({ state: body.state, version: body.version + 1, updated_by: ctx.user.id })
    .eq('id', id).eq('household_id', ctx.householdId).eq('version', body.version).select('*').maybeSingle();
  if (res.error) throw res.error;
  if (!res.data) {
    const cur = await ctx.supabase.from('shopping_items').select('*').eq('id', id).eq('household_id', ctx.householdId).maybeSingle();
    if (!cur.data) throw new ApiError('not_found');
    // Zelfde eindtoestand = idempotent.
    if (cur.data.state === body.state) return ok({ item: cur.data });
    throw new ApiError('revision_conflict', undefined, { current: cur.data });
  }
  return ok({ item: res.data });
});

export const DELETE = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  idempotencyKey(req);
  const id = uuid.parse((await params).id);
  const res = await ctx.supabase.from('shopping_items').delete().eq('id', id).eq('household_id', ctx.householdId).eq('origin', 'manual');
  if (res.error) throw res.error;
  return ok({ deleted: true });
});
