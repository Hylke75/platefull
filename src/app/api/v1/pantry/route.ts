import { requireHousehold } from '@/server/context';
import { handler, idempotencyKey, ok, parseJson } from '@/server/http';
import { loadPantry } from '@/server/repo';
import { pantrySchema } from '@/server/schemas';

export const GET = handler(async () => {
  const ctx = await requireHousehold();
  return ok({ items: await loadPantry(ctx.supabase, ctx.householdId) });
});

/** Voorraad vastleggen (F-014). 'confirmed' zet verified_at; 'unknown' telt nooit als aanwezig (R-06). */
export const POST = handler(async (req: Request) => {
  const ctx = await requireHousehold();
  idempotencyKey(req);
  const body = await parseJson(req, pantrySchema);
  const res = await ctx.supabase.from('pantry_items').upsert({
    household_id: ctx.householdId, ingredient_id: body.ingredient_id, quantity: body.quantity, unit: body.unit, status: body.status,
    location: body.location, expires_at: body.expires_at ?? null, verified_at: body.status === 'confirmed' ? new Date().toISOString() : null,
  }, { onConflict: 'household_id,ingredient_id' }).select('*').single();
  if (res.error) throw res.error;
  return ok({ item: res.data }, { status: 201 });
});
