import { requireHousehold } from '@/server/context';
import { ApiError, handler, ok, parseJson, uuid } from '@/server/http';
import { patchProfileSchema } from '@/server/schemas';

const COLS = 'id, household_id, display_name, age_band, avatar, active, parent_decides, restrictions_status';

async function own(id: string) {
  const ctx = await requireHousehold();
  const pid = uuid.parse(id);
  const { data, error } = await ctx.supabase.from('profiles').select(COLS).eq('id', pid).eq('household_id', ctx.householdId).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError('not_found');
  return { ctx, profile: data };
}

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { profile } = await own((await params).id);
  return ok({ profile });
});

export const PATCH = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { ctx, profile } = await own((await params).id);
  const body = await parseJson(req, patchProfileSchema);
  const { restrictions_status, ...rest } = body;
  if (restrictions_status) {
    const { error } = await ctx.supabase.rpc('set_restrictions_status', { p_profile_id: profile.id, p_status: restrictions_status });
    if (error) throw error;
  }
  if (Object.keys(rest).length) {
    const { error } = await ctx.supabase.from('profiles').update(rest).eq('id', profile.id);
    if (error) throw error;
  }
  return ok({ profile: (await own(profile.id)).profile });
});

/** Archiveren (soft delete, §9). Echte verwijdering loopt via /me/delete-request. */
export const DELETE = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { ctx, profile } = await own((await params).id);
  const { error } = await ctx.supabase.from('profiles').update({ active: false }).eq('id', profile.id);
  if (error) throw error;
  return ok({ archived: true });
});
