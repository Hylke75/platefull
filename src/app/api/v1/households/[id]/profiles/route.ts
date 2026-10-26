import { assertSameHousehold, requireHousehold } from '@/server/context';
import { handler, ok, parseJson } from '@/server/http';
import { loadProfiles } from '@/server/repo';
import { createProfileSchema } from '@/server/schemas';

export const GET = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  assertSameHousehold(ctx, (await params).id);
  const archived = new URL(req.url).searchParams.get('archived') === '1';
  return ok({ profiles: await loadProfiles(ctx.supabase, ctx.householdId, archived) });
});

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  assertSameHousehold(ctx, (await params).id);
  const body = await parseJson(req, createProfileSchema);
  const count = (await loadProfiles(ctx.supabase, ctx.householdId)).length;
  const { data, error } = await ctx.supabase.from('profiles')
    .insert({ household_id: ctx.householdId, display_name: body.display_name, age_band: body.age_band, avatar: body.avatar ?? `p${(count % 4) + 1}` })
    .select('id, display_name, age_band, avatar, active, parent_decides, restrictions_status').single();
  if (error) throw error;
  // Nieuwe eter ook toevoegen aan toekomstige, nog niet afgeronde slots (aanwezigheid 'onbekend').
  return ok({ profile: data }, { status: 201 });
});
