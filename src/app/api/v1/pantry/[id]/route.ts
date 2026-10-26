import { requireHousehold } from '@/server/context';
import { ApiError, handler, idempotencyKey, ok, parseJson, uuid } from '@/server/http';
import { pantryPatchSchema } from '@/server/schemas';

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  idempotencyKey(req);
  const id = uuid.parse((await params).id);
  const { version, ...rest } = await parseJson(req, pantryPatchSchema);
  const patch: Record<string, unknown> = { ...rest, version: version + 1 };
  if (rest.status === 'confirmed' || (rest.status === undefined && rest.quantity !== undefined)) patch.verified_at = new Date().toISOString();
  if (rest.status === 'unknown') patch.verified_at = null;
  const res = await ctx.supabase.from('pantry_items').update(patch).eq('id', id).eq('household_id', ctx.householdId).eq('version', version).select('*').maybeSingle();
  if (res.error) throw res.error;
  if (!res.data) throw new ApiError('revision_conflict');
  return ok({ item: res.data });
});

export const DELETE = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  idempotencyKey(req);
  const res = await ctx.supabase.from('pantry_items').delete().eq('id', uuid.parse((await params).id)).eq('household_id', ctx.householdId);
  if (res.error) throw res.error;
  return ok({ deleted: true });
});
