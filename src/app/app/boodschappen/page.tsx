import { weekStart } from '@/domain/dates';
import { appContext } from '@/server/page-context';
import { todayFor } from '@/server/planning';
import { loadHousehold } from '@/server/repo';
import { GroceryClient, type GroceryItem } from './GroceryClient';

export const dynamic = 'force-dynamic';

/** S-09 Boodschappen: per categorie, nodig/voorraad/kopen, afvinken (realtime tussen volwassenen), handmatig toevoegen. */
export default async function BoodschappenPage() {
  const ctx = await appContext();
  const household = await loadHousehold(ctx.supabase, ctx.householdId);
  const plan = await ctx.supabase.rpc('ensure_week_plan', { p_week_start: weekStart(todayFor(household)) });
  if (plan.error) throw plan.error;
  const list = await ctx.supabase.from('shopping_lists').select('id, revision').eq('plan_id', plan.data as string).single();
  if (list.error) throw list.error;
  const items = await ctx.supabase.from('shopping_items').select('*').eq('list_id', list.data.id).order('description');
  if (items.error) throw items.error;
  return <GroceryClient listId={list.data.id} householdName={household.name} initial={items.data as GroceryItem[]} />;
}
