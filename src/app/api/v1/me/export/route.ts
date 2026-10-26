import { getContext } from '@/server/context';
import { handler, ok } from '@/server/http';

const TABLES = ['households', 'household_accounts', 'profiles', 'consents', 'profile_rules', 'household_ingredient_checks', 'meal_plans', 'meal_slots',
  'meal_attendees', 'proposal_snapshots', 'pantry_items', 'shopping_lists', 'shopping_items', 'leftovers', 'meal_feedback', 'audit_events'] as const;

/** Persoonsgegevens exporteren (§11.1). Alles via RLS: alleen gegevens van het eigen gezin. */
export const GET = handler(async () => {
  const ctx = await getContext();
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), account: { id: ctx.user.id, email: ctx.user.email } };
  if (ctx.householdId) {
    for (const t of TABLES) {
      const col = t === 'households' ? 'id' : 'household_id';
      const { data, error } = await ctx.supabase.from(t).select('*').eq(col, ctx.householdId);
      if (error) throw error;
      out[t] = data;
    }
    const own = await ctx.supabase.from('recipes').select('*').eq('owner_household_id', ctx.householdId);
    out.own_recipes = own.data ?? [];
  }
  return ok(out, { headers: { 'Content-Disposition': 'attachment; filename="plateful-export.json"' } });
});
