import { requireHousehold } from '@/server/context';
import { ApiError, handler, ok, parseJson } from '@/server/http';
import { ingredientCheckSchema } from '@/server/schemas';

/** Etiketcontrole door een volwassene (R-01): alleen geldig voor dit gezin, kan nooit een bekend allergeen wegnemen. */
export const GET = handler(async () => {
  const ctx = await requireHousehold();
  const { data, error } = await ctx.supabase.from('household_ingredient_checks').select('*').eq('household_id', ctx.householdId);
  if (error) throw error;
  return ok({ checks: data });
});

export const POST = handler(async (req: Request) => {
  const ctx = await requireHousehold();
  const body = await parseJson(req, ingredientCheckSchema);
  const ing = await ctx.supabase.from('ingredients').select('id').eq('id', body.ingredient_id).maybeSingle();
  if (!ing.data) throw new ApiError('not_found');
  const res = await ctx.supabase.from('household_ingredient_checks').upsert({
    household_id: ctx.householdId, ingredient_id: body.ingredient_id, contains_allergens: body.contains_allergens, diet: body.diet,
    checked_by: ctx.user.id, checked_at: new Date().toISOString(),
  }, { onConflict: 'household_id,ingredient_id' }).select('*').single();
  if (res.error) throw res.error;
  await ctx.supabase.from('audit_events').insert({ household_id: ctx.householdId, actor_user_id: ctx.user.id, event_type: 'label_checked', entity_id: body.ingredient_id });
  return ok({ check: res.data }, { status: 201 });
});
