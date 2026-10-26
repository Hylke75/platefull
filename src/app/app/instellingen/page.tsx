import { appContext } from '@/server/page-context';
import { loadHousehold } from '@/server/repo';
import { SettingsClient } from './SettingsClient';

export const dynamic = 'force-dynamic';

/** S-13 Instellingen: gezin, privacy, toestemmingen, voorkeuren, verwijdering. */
export default async function InstellingenPage() {
  const ctx = await appContext();
  const [household, consent, checks] = await Promise.all([
    loadHousehold(ctx.supabase, ctx.householdId),
    ctx.supabase.from('consents').select('granted_at').eq('household_id', ctx.householdId).eq('purpose', 'health_data').is('withdrawn_at', null).maybeSingle(),
    ctx.supabase.from('household_ingredient_checks').select('ingredient_id, contains_allergens, checked_at, ingredients(canonical_name)').eq('household_id', ctx.householdId),
  ]);
  const incomplete = await ctx.supabase.from('ingredients').select('id, canonical_name').eq('allergen_status', 'incomplete').order('canonical_name');
  return (
    <SettingsClient
      household={household}
      role={ctx.role}
      email={ctx.user.email ?? ''}
      healthConsentSince={consent.data?.granted_at ?? null}
      checks={(checks.data ?? []).map((c) => ({ id: c.ingredient_id as string, name: (c.ingredients as unknown as { canonical_name: string } | null)?.canonical_name ?? (c.ingredient_id as string), allergens: c.contains_allergens as string[], checkedAt: c.checked_at as string }))}
      incomplete={(incomplete.data ?? []).map((i) => ({ id: i.id as string, name: i.canonical_name as string }))}
    />
  );
}
