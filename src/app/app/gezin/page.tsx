import { AppHeader, FamilyPersonRow, SafeNote } from '@/components/ui/phone-ui';
import { appContext } from '@/server/page-context';
import { loadHousehold, loadProfiles, loadRules } from '@/server/repo';
import { AddProfile } from './AddProfile';

export const dynamic = 'force-dynamic';

const ROLE: Record<string, string> = { adult: 'Volwassene', teen16: '16+', child: 'Kind' };

/** S-07 Gezin: profielen, rol en voorkeurstatus. */
export default async function GezinPage() {
  const ctx = await appContext();
  const [household, profiles, rules] = await Promise.all([loadHousehold(ctx.supabase, ctx.householdId), loadProfiles(ctx.supabase, ctx.householdId), loadRules(ctx.supabase, ctx.householdId)]);
  const sub = (id: string, status: string) => {
    const r = rules.filter((x) => x.profileId === id);
    const hard = r.filter((x) => x.severity.startsWith('HARD')).length;
    const soft = r.filter((x) => !x.severity.startsWith('HARD') && x.severity !== 'UNKNOWN').length;
    const parts = [soft ? `${soft} ${soft === 1 ? 'voorkeur' : 'voorkeuren'}` : 'Nog geen voorkeuren'];
    if (hard) parts.push(`${hard} harde ${hard === 1 ? 'beperking' : 'beperkingen'}`);
    else if (status === 'unknown') parts.push('allergieën nog onbekend');
    return parts.join(' · ');
  };
  return (
    <div className="app-view">
      <AppHeader initials={household.name.slice(0, 2).toUpperCase()} />
      <div className="eyeline">JULLIE AAN TAFEL</div>
      <h2 className="app-title">Iedereen heeft<br />een eigen smaak.</h2>
      <p className="app-subtitle">Plateful onthoudt wat werkt. Jullie beslissen samen wat er op tafel komt.</p>
      <div className="family-banner"><span className="family-banner-icon">♡</span><span><strong>{household.name} · {profiles.length} {profiles.length === 1 ? 'persoon' : 'personen'}</strong><small>{profiles.length} persoonlijke {profiles.length === 1 ? 'profiel' : 'profielen'}, 1 gezamenlijke tafel</small></span></div>
      <div className="person-section-title">Kies een gezinslid</div>
      {profiles.map((p) => <FamilyPersonRow key={p.id} color={p.avatar} initial={p.display_name.slice(0, 1).toUpperCase()} name={p.display_name} role={ROLE[p.age_band] ?? ''} sub={sub(p.id, p.restrictions_status)} href={`/app/gezin/${p.id}`} />)}
      <AddProfile householdId={ctx.householdId} />
      <SafeNote>Medische beperkingen worden altijd als harde uitsluiting behandeld. Controleer bij allergieën zelf de etiketten.</SafeNote>
      <a className="btn btn-plain btn-wide" style={{ marginTop: 12 }} href="/app/instellingen">Instellingen & privacy</a>
    </div>
  );
}
