import { requireHousehold } from '@/server/context';
import { ApiError, handler, idempotencyKey, ok, parseJson, uuid } from '@/server/http';
import { leftoverPatchSchema } from '@/server/schemas';

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  idempotencyKey(req);
  const body = await parseJson(req, leftoverPatchSchema);
  const res = await ctx.supabase.from('leftovers').update(body).eq('id', uuid.parse((await params).id)).eq('household_id', ctx.householdId).select('*').maybeSingle();
  if (res.error) throw res.error;
  if (!res.data) throw new ApiError('not_found');
  return ok({ item: res.data });
});
