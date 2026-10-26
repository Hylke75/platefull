import { appContext } from '@/server/page-context';
import { loadPantry } from '@/server/repo';
import { PantryClient } from './PantryClient';

export const dynamic = 'force-dynamic';

/** S-10 Voorraad (F-014): in huis / hoeveelheid / houdbaarheid / gecontroleerd op. */
export default async function VoorraadPage() {
  const ctx = await appContext();
  const [items, ingredients] = await Promise.all([
    loadPantry(ctx.supabase, ctx.householdId),
    ctx.supabase.from('ingredients').select('id, canonical_name, unit_kind').order('canonical_name'),
  ]);
  return <PantryClient items={items} ingredients={(ingredients.data ?? []).map((i) => ({ id: i.id as string, name: i.canonical_name as string, unitKind: i.unit_kind as string }))} />;
}
