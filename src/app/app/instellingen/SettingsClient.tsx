'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/app/AppShell';
import { SafeNote, SubHeader, Switch } from '@/components/ui/phone-ui';
import { ALLERGEN_CODES, ALLERGEN_LABELS } from '@/domain/types';
import { api, type ClientApiError } from '@/lib/client-api';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { HouseholdRow } from '@/server/repo';

interface Props {
  household: HouseholdRow; role: 'owner' | 'co_parent'; email: string; healthConsentSince: string | null;
  checks: { id: string; name: string; allergens: string[]; checkedAt: string }[]; incomplete: { id: string; name: string }[];
}

export function SettingsClient({ household, role, email, healthConsentSince, checks, incomplete }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ name: household.name, weekday_minutes: household.weekday_minutes ?? 30, weekend_minutes: household.weekend_minutes ?? '', weekly_budget: household.weekly_budget_cents != null ? household.weekly_budget_cents / 100 : '', skill: household.skill, equipment: household.equipment });
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState({ email: '', url: '' });
  const [check, setCheck] = useState({ ingredient: incomplete[0]?.id ?? '', allergens: [] as string[], vegan: false, vegetarian: true, confirmed: false });
  const [del, setDel] = useState({ scope: 'account' as 'account' | 'household', confirm: '' });

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setError(null);
    try { await fn(); toast(msg); router.refresh(); } catch (e) { setError((e as ClientApiError).message); }
  };

  const saveHousehold = () => run(() => api(`/households/${household.id}`, { method: 'PATCH', body: {
    name: form.name, weekday_minutes: Number(form.weekday_minutes) || null, weekend_minutes: form.weekend_minutes === '' ? null : Number(form.weekend_minutes),
    weekly_budget_cents: form.weekly_budget === '' ? null : Math.round(Number(form.weekly_budget) * 100), skill: form.skill, equipment: form.equipment,
  } }), 'Instellingen bewaard');

  const toggleConsent = () => {
    if (healthConsentSince && !confirm('Toestemming intrekken? Alle vastgelegde allergieën en medische beperkingen worden direct verwijderd, en Plateful doet daarna geen uitspraken meer over geschiktheid.')) return;
    void run(() => api('/privacy/consents', { method: 'PUT', body: { purpose: 'health_data', granted: !healthConsentSince } }), healthConsentSince ? 'Toestemming ingetrokken en gegevens verwijderd' : 'Toestemming vastgelegd');
  };

  const saveCheck = () => run(() => api('/ingredient-checks', { body: {
    ingredient_id: check.ingredient, contains_allergens: check.allergens, label_checked: true,
    diet: { meat: !check.vegetarian, pork: !check.vegetarian, fish: !check.vegetarian, animal: !check.vegan },
  } }), 'Etiketcontrole vastgelegd');

  return (
    <div className="app-view">
      <SubHeader title="INSTELLINGEN" backHref="/app/gezin" />
      <h2 className="app-title">Jullie gezin,<br />jullie regels.</h2>

      <div className="person-section-title">Gezin</div>
      <label className="field"><span>Naam</span><input className="text-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <div className="action-row">
        <label className="field" style={{ flex: 1 }}><span>Kooktijd doordeweeks</span><input className="text-input" type="number" min={5} max={240} value={form.weekday_minutes} onChange={(e) => setForm({ ...form, weekday_minutes: Number(e.target.value) })} /></label>
        <label className="field" style={{ flex: 1 }}><span>Weekend</span><input className="text-input" type="number" min={5} max={240} placeholder="—" value={form.weekend_minutes} onChange={(e) => setForm({ ...form, weekend_minutes: e.target.value === '' ? '' : Number(e.target.value) })} /></label>
      </div>
      <label className="field"><span>Weekbudget (€, optioneel)</span><input className="text-input" type="number" min={0} value={form.weekly_budget} onChange={(e) => setForm({ ...form, weekly_budget: e.target.value === '' ? '' : Number(e.target.value) })} /><small>Zonder betrouwbare prijzen is dit alleen een indicatie; we doen geen besparingsclaims.</small></label>
      <div className="field"><span>Apparaten</span><div className="choice-row">{(['stove', 'oven', 'airfryer', 'microwave'] as const).map((e) => (
        <button key={e} type="button" className="choice" aria-pressed={form.equipment.includes(e)} onClick={() => setForm({ ...form, equipment: form.equipment.includes(e) ? form.equipment.filter((x) => x !== e) : [...form.equipment, e] })}>{({ stove: 'Kookplaat', oven: 'Oven', airfryer: 'Airfryer', microwave: 'Magnetron' })[e]}</button>
      ))}</div></div>
      <div className="field"><span>Kookvaardigheid</span><div className="choice-row">
        <button type="button" className="choice" aria-pressed={form.skill === 'easy'} onClick={() => setForm({ ...form, skill: 'easy' })}>Eenvoudig</button>
        <button type="button" className="choice" aria-pressed={form.skill === 'medium'} onClick={() => setForm({ ...form, skill: 'medium' })}>Gemiddeld</button>
      </div></div>
      <button className="btn btn-primary btn-wide" onClick={saveHousehold}>Bewaren</button>

      {role === 'owner' ? (
        <>
          <div className="person-section-title">Tweede volwassene uitnodigen</div>
          <div className="action-row">
            <input className="text-input" type="email" placeholder="e-mailadres" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
            <button className="btn btn-primary" style={{ flex: '0 0 auto' }} onClick={() => run(async () => { const r = await api<{ invite_url: string }>('/invitations', { body: { email: invite.email } }); setInvite({ email: '', url: r.invite_url }); }, 'Uitnodiging gemaakt')}>Uitnodigen</button>
          </div>
          {invite.url ? <p className="config-note">Deel deze link (7 dagen geldig, alleen voor dit e-mailadres):<br /><code style={{ wordBreak: 'break-all' }}>{invite.url}</code></p> : null}
        </>
      ) : null}

      <div className="person-section-title">Privacy & toestemming</div>
      <div className="parent-toggle">
        <span><b>Gezondheidsgegevens (allergieën, medisch)</b><small>{healthConsentSince ? `Toestemming sinds ${new Date(healthConsentSince).toLocaleDateString('nl-NL')}` : 'Geen toestemming — harde beperkingen kunnen niet worden vastgelegd'}</small></span>
        <Switch on={!!healthConsentSince} onToggle={toggleConsent} label="Toestemming gezondheidsgegevens" />
      </div>

      <div className="person-section-title">Etiketcontroles</div>
      <p className="app-subtitle">Samengestelde producten (wraps, sauzen, kaas) verschillen per merk. Leg vast wat er op het etiket van jóuw product staat; alleen dan kunnen ze bij een allergie worden voorgesteld.</p>
      {checks.map((c) => <div key={c.id} className="taste-row"><span>{c.name}</span><span className="taste-status like">{c.allergens.length ? c.allergens.map((a) => ALLERGEN_LABELS[a as keyof typeof ALLERGEN_LABELS]).join(', ') : 'Geen allergenen'}</span></div>)}
      <label className="field" style={{ marginTop: 10 }}><span>Product</span>
        <select className="text-input" value={check.ingredient} onChange={(e) => setCheck({ ...check, ingredient: e.target.value })}>{incomplete.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
      </label>
      <div className="field"><span>Bevat volgens het etiket (incl. &lsquo;kan sporen bevatten&rsquo;)</span><div className="choice-row">{ALLERGEN_CODES.map((a) => (
        <button key={a} type="button" className="choice strict" aria-pressed={check.allergens.includes(a)} onClick={() => setCheck({ ...check, allergens: check.allergens.includes(a) ? check.allergens.filter((x) => x !== a) : [...check.allergens, a] })}>{ALLERGEN_LABELS[a]}</button>
      ))}</div></div>
      <div className="choice-row">
        <button type="button" className="choice" aria-pressed={check.vegetarian} onClick={() => setCheck({ ...check, vegetarian: !check.vegetarian })}>Vegetarisch</button>
        <button type="button" className="choice" aria-pressed={check.vegan} onClick={() => setCheck({ ...check, vegan: !check.vegan })}>Veganistisch</button>
      </div>
      <label className="field" style={{ marginTop: 8 }}><span><input type="checkbox" checked={check.confirmed} onChange={(e) => setCheck({ ...check, confirmed: e.target.checked })} /> Ik heb het etiket zelf gecontroleerd</span><small>Geldig voor 180 dagen. Een etiketcontrole kan nooit een bekend allergeen weghalen.</small></label>
      <button className="btn btn-plain btn-wide" onClick={saveCheck} disabled={!check.confirmed || !check.ingredient}>Etiketcontrole vastleggen</button>

      <div className="person-section-title">Je gegevens</div>
      <a className="btn btn-plain btn-wide" href="/api/v1/me/export" download>Exporteer gezinsgegevens (JSON)</a>
      <button className="btn btn-plain btn-wide" style={{ marginTop: 8 }} onClick={async () => { await getSupabaseBrowserClient()?.auth.signOut(); router.push('/login'); }}>Uitloggen ({email})</button>

      <div className="hard-section">
        <h3>Verwijderen</h3>
        <p>{role === 'owner' ? 'Verwijder je account, of het hele gezin met alle profielen, voorkeuren en planning.' : 'Verwijder je account. Het gezin blijft bestaan voor de andere volwassene.'} Dit kan niet ongedaan worden gemaakt.</p>
        {role === 'owner' ? <div className="choice-row">
          <button type="button" className="choice strict" aria-pressed={del.scope === 'account'} onClick={() => setDel({ ...del, scope: 'account' })}>Mijn account</button>
          <button type="button" className="choice strict" aria-pressed={del.scope === 'household'} onClick={() => setDel({ ...del, scope: 'household' })}>Hele gezin</button>
        </div> : null}
        <label className="field" style={{ marginTop: 8 }}><span>Typ VERWIJDEREN ter bevestiging</span><input className="text-input" value={del.confirm} onChange={(e) => setDel({ ...del, confirm: e.target.value })} /></label>
        <button className="btn btn-orange btn-wide" disabled={del.confirm !== 'VERWIJDEREN'} onClick={() => run(async () => { await api('/me/delete-request', { body: { scope: del.scope, confirm: 'VERWIJDEREN' } }); router.push('/'); }, 'Verwijderverzoek verwerkt')}>Definitief verwijderen</button>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <SafeNote>Plateful is geen medisch hulpmiddel. Privacyvragen (ook van kinderen vanaf 12 jaar): neem contact op via het privacyadres in de privacyverklaring.</SafeNote>
    </div>
  );
}
