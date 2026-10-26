import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getContext } from '@/server/context';
import { ApiError } from '@/server/http';
import { loadHousehold, loadProfiles, loadRules } from '@/server/repo';
import { OnboardingClient } from './OnboardingClient';

export const metadata: Metadata = { title: 'Welkom — Plateful' };
export const dynamic = 'force-dynamic';

/** S-02 Onboarding: O-03 t/m O-08, overslaan mogelijk, voortgang bewaard. */
export default async function OnboardingPage() {
  let ctx;
  try { ctx = await getContext(); } catch (e) { redirect(e instanceof ApiError && e.code === 'not_configured' ? '/login?config=missing' : '/login?next=/onboarding'); }
  if (!ctx.householdId) return <Shell><OnboardingClient initial={null} /></Shell>;
  const [household, profiles, rules, consent] = await Promise.all([
    loadHousehold(ctx.supabase, ctx.householdId), loadProfiles(ctx.supabase, ctx.householdId), loadRules(ctx.supabase, ctx.householdId),
    ctx.supabase.from('consents').select('id').eq('household_id', ctx.householdId).eq('purpose', 'health_data').is('withdrawn_at', null).maybeSingle(),
  ]);
  if (household.onboarding_step === 'done') redirect('/app/vandaag');
  return <Shell><OnboardingClient initial={{ household, profiles, rules, healthConsent: !!consent.data }} /></Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="app-body"><div className="app-shell"><main className="screen-scroll" id="screen">{children}</main></div></div>;
}
