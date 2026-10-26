import { assertSameHousehold, requireHousehold } from '@/server/context';
import { handler, ok, parseJson } from '@/server/http';
import { loadHousehold } from '@/server/repo';
import { patchHouseholdSchema } from '@/server/schemas';

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  assertSameHousehold(ctx, (await params).id);
  return ok({ household: await loadHousehold(ctx.supabase, ctx.householdId), role: ctx.role });
});

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  assertSameHousehold(ctx, (await params).id);
  const body = await parseJson(req, patchHouseholdSchema);
  const { error } = await ctx.supabase.from('households').update(body).eq('id', ctx.householdId);
  if (error) throw error;
  return ok({ household: await loadHousehold(ctx.supabase, ctx.householdId) });
});
