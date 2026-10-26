import { notFound } from 'next/navigation';
import { uuid } from '@/server/http';
import { appContext } from '@/server/page-context';
import { loadProfiles, loadRules } from '@/server/repo';
import { TasteProfileClient } from './TasteProfileClient';

export const dynamic = 'force-dynamic';

export default async function SmaakprofielPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await appContext();
  const id = uuid.safeParse((await params).id);
  if (!id.success) notFound();
  const [profiles, rules, consent, ingredients] = await Promise.all([
    loadProfiles(ctx.supabase, ctx.householdId, true),
    loadRules(ctx.supabase, ctx.householdId),
    ctx.supabase.from('consents').select('id').eq('household_id', ctx.householdId).eq('purpose', 'health_data').is('withdrawn_at', null).maybeSingle(),
    ctx.supabase.from('ingredients').select('id, canonical_name').order('canonical_name'),
  ]);
  const profile = profiles.find((p) => p.id === id.data);
  if (!profile) notFound();
  return (
    <TasteProfileClient
      profile={profile}
      rules={rules.filter((r) => r.profileId === profile.id)}
      healthConsent={!!consent.data}
      ingredients={(ingredients.data ?? []).map((i) => ({ id: i.id as string, name: i.canonical_name as string }))}
    />
  );
}
