'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AppHeader, FamilyAvatar, PrimaryButton, SafeNote, SecondaryButton } from '@/components/ui/phone-ui';
import { TASTE_CARDS, TASTE_CHOICES } from '@/domain/catalog/taste-cards';
import { ALLERGEN_CODES, ALLERGEN_LABELS, DIET_LABELS, STRICT_DIETS, type ProfileRule } from '@/domain/types';
import { api, type ClientApiError } from '@/lib/client-api';
import type { HouseholdRow, ProfileRow } from '@/server/repo';

type Step = 'household' | 'people' | 'restrictions' | 'tastes' | 'context' | 'first';
const ORDER: Step[] = ['household', 'people', 'restrictions', 'tastes', 'context', 'first'];
interface Initial { household: HouseholdRow; profiles: ProfileRow[]; rules: ProfileRule[]; healthConsent: boolean }

export function OnboardingClient({ initial }: { initial: Initial | null }) {
  const router = useRouter();
  const stepFrom = (s?: string): Step => (ORDER.includes(s as Step) ? (s as Step) : 'people');
  const [step, setStep] = useState<Step>(initial ? stepFrom(initial.household.onboarding_step === 'household' ? 'people' : initial.household.onboarding_step) : 'household');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hid = initial?.household.id;

  async function go(next: Step) {
    setError(null);
    if (hid) await api(`/households/${hid}`, { method: 'PATCH', body: { onboarding_step: next === 'first' ? 'done' : next } }).catch(() => undefined);
    if (next === 'first') { router.replace('/app/vandaag'); router.refresh(); return; }
    setStep(next);
    router.refresh();
    document.getElementById('screen')?.scrollTo({ top: 0 });
  }
  const wrap = async (fn: () => Promise<void>) => { setBusy(true); setError(null); try { await fn(); } catch (e) { setError((e as ClientApiError).message); } finally { setBusy(false); } };

  return (
    <div className="app-view">
      <AppHeader initials={initial?.household.name.slice(0, 2).toUpperCase() ?? '✳'} />
      <div className="wizard-progress" aria-label={`Stap ${ORDER.indexOf(step) + 1} van ${ORDER.length}`}>{ORDER.map((s, i) => <span key={s} className={i <= ORDER.indexOf(step) ? 'done' : ''} />)}</div>
      {step === 'household' ? <HouseholdStep busy={busy} onSubmit={(b) => wrap(async () => { await api('/households', { body: b }); router.refresh(); setStep('people'); })} /> : null}
      {step === 'people' && initial ? <PeopleStep initial={initial} wrap={wrap} onNext={() => go('restrictions')} refresh={() => router.refresh()} /> : null}
      {step === 'restrictions' && initial ? <RestrictionsStep initial={initial} wrap={wrap} onNext={() => go('tastes')} refresh={() => router.refresh()} /> : null}
      {step === 'tastes' && initial ? <TastesStep initial={initial} wrap={wrap} onNext={() => go('context')} /> : null}
      {step === 'context' && initial ? <ContextStep initial={initial} wrap={wrap} onNext={() => go('first')} /> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}

function HouseholdStep({ busy, onSubmit }: { busy: boolean; onSubmit: (b: { name: string; usual_diners: number; accept_terms: true }) => void }) {
  const [name, setName] = useState('');
  const [diners, setDiners] = useState(4);
  const [terms, setTerms] = useState(false);
  return (
    <>
      <div className="eyeline">IEDEREEN ANDERS. SAMEN AAN TAFEL.</div>
      <h2 className="app-title">Maak jullie<br />tafel aan.</h2>
      <label className="field"><span>Hoe heet jullie huishouden? <span style={{ fontWeight: 500 }}>(optioneel)</span></span><input className="text-input" placeholder="Ons gezin" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></label>
      <label className="field"><span>Met hoeveel mensen eten jullie meestal?</span>
        <input className="text-input" type="number" min={1} max={12} value={diners} onChange={(e) => setDiners(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
        <small>Van 1 tot 12. Elk gezin is anders — er hoeven geen twee ouders te zijn.</small>
      </label>
      <label className="field"><span><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> Ik ga akkoord met de voorwaarden en het privacybeleid</span>
        <small>We bewaren alleen wat nodig is: roepnamen, leeftijdscategorie en voorkeuren. Geen geboortedata, geen advertenties.</small>
      </label>
      <PrimaryButton wide disabled={!terms || busy} onClick={() => onSubmit({ name, usual_diners: diners, accept_terms: true })}>Verder →</PrimaryButton>
    </>
  );
}

function PeopleStep({ initial, wrap, onNext, refresh }: { initial: Initial; wrap: (f: () => Promise<void>) => Promise<void>; onNext: () => void; refresh: () => void }) {
  const [name, setName] = useState('');
  const [band, setBand] = useState<'adult' | 'teen16' | 'child'>(initial.profiles.length ? 'child' : 'adult');
  return (
    <>
      <div className="eyeline">WIE ZITTEN ER AAN TAFEL?</div>
      <h2 className="app-title">Iedereen een<br />eigen plek.</h2>
      <p className="app-subtitle">Alleen een roepnaam en leeftijdscategorie. Dubbele namen mogen.</p>
      {initial.profiles.map((p) => (
        <div key={p.id} className="family-person"><FamilyAvatar color={p.avatar} initial={p.display_name.slice(0, 1).toUpperCase()} /><span className="person-detail"><strong>{p.display_name}</strong><small>{({ adult: 'Volwassene', teen16: '16+', child: '0–15' })[p.age_band]}</small></span></div>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); void wrap(async () => { await api(`/households/${initial.household.id}/profiles`, { body: { display_name: name, age_band: band } }); setName(''); setBand('child'); refresh(); }); }}>
        <label className="field"><span>Roepnaam</span><input className="text-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></label>
        <div className="choice-row" style={{ marginBottom: 10 }}>{([['adult', 'Volwassene'], ['teen16', '16+'], ['child', '0–15']] as const).map(([k, l]) => <button key={k} type="button" className="choice" aria-pressed={band === k} onClick={() => setBand(k)}>{l}</button>)}</div>
        <SecondaryButton wide disabled={!name.trim()}>+ Toevoegen</SecondaryButton>
      </form>
      <PrimaryButton wide style={{ marginTop: 12 }} disabled={!initial.profiles.length} onClick={onNext}>Verder →</PrimaryButton>
    </>
  );
}

function RestrictionsStep({ initial, wrap, onNext, refresh }: { initial: Initial; wrap: (f: () => Promise<void>) => Promise<void>; onNext: () => void; refresh: () => void }) {
  const [consent, setConsent] = useState(initial.healthConsent);
  const [sel, setSel] = useState<Record<string, { allergens: string[]; diet: string | null }>>({});
  const hardOf = (pid: string) => initial.rules.filter((r) => r.profileId === pid && r.severity.startsWith('HARD'));
  async function ensureConsent() {
    if (!initial.healthConsent) await api('/privacy/consents', { method: 'PUT', body: { purpose: 'health_data', granted: true } });
  }
  async function saveFor(pid: string, none: boolean) {
    await wrap(async () => {
      if (!consent) throw new Error('Geef eerst toestemming hieronder.');
      await ensureConsent();
      if (none) { await api(`/profiles/${pid}`, { method: 'PATCH', body: { restrictions_status: 'none' } }); refresh(); return; }
      const s = sel[pid] ?? { allergens: [], diet: null };
      for (const a of s.allergens) await api(`/profiles/${pid}/hard-rules`, { body: { target_type: 'allergen', target_id: a, severity: 'HARD_ALLERGY' } });
      if (s.diet) await api(`/profiles/${pid}/hard-rules`, { body: { target_type: 'diet', target_id: s.diet, severity: 'HARD_DIET' } });
      setSel((x) => ({ ...x, [pid]: { allergens: [], diet: null } }));
      refresh();
    });
  }
  return (
    <>
      <div className="eyeline">WAT MAG NOOIT OP TAFEL?</div>
      <h2 className="app-title">Allergieën en<br />strikte diëten.</h2>
      <div className="hard-section" style={{ marginTop: 0 }}>
        <h3>Dit is iets anders dan &lsquo;niet lekker&rsquo;</h3>
        <p>Hier leg je alleen allergieën, medisch noodzakelijke uitsluitingen en strikte diëten vast. Die worden nooit overruled. Wat iemand gewoon niet lekker vindt, komt in de volgende stap. &lsquo;Nog niet bekend&rsquo; betekent onbekend — nooit &lsquo;geen allergie&rsquo;.</p>
      </div>
      {initial.profiles.map((p) => {
        const s = sel[p.id] ?? { allergens: [], diet: null };
        const hard = hardOf(p.id);
        return (
          <div key={p.id} className="family-person" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <strong style={{ fontSize: 12, color: 'var(--forest)' }}>{p.display_name} <span style={{ fontWeight: 500, color: '#91a294' }}>· {p.restrictions_status === 'unknown' ? 'nog niet bekend' : p.restrictions_status === 'none' ? 'geen bekende beperkingen' : hard.map((h) => h.targetType === 'allergen' ? ALLERGEN_LABELS[h.targetId as keyof typeof ALLERGEN_LABELS] : DIET_LABELS[h.targetId as keyof typeof DIET_LABELS] ?? h.targetId).join(', ')}</span></strong>
            <div className="choice-row" style={{ marginTop: 8 }}>{ALLERGEN_CODES.map((a) => (
              <button key={a} type="button" className="choice strict" aria-pressed={s.allergens.includes(a)} onClick={() => setSel((x) => ({ ...x, [p.id]: { ...s, allergens: s.allergens.includes(a) ? s.allergens.filter((y) => y !== a) : [...s.allergens, a] } }))}>{ALLERGEN_LABELS[a]}</button>
            ))}</div>
            <div className="choice-row" style={{ marginTop: 6 }}>{STRICT_DIETS.map((d) => (
              <button key={d} type="button" className="choice strict" aria-pressed={s.diet === d} onClick={() => setSel((x) => ({ ...x, [p.id]: { ...s, diet: s.diet === d ? null : d } }))}>{DIET_LABELS[d]}</button>
            ))}</div>
            <div className="action-row">
              <button type="button" className="btn btn-primary" disabled={!s.allergens.length && !s.diet} onClick={() => saveFor(p.id, false)}>Vastleggen</button>
              {p.restrictions_status === 'unknown' && !hard.length ? <button type="button" className="btn btn-plain" onClick={() => saveFor(p.id, true)}>Geen bekende</button> : null}
            </div>
          </div>
        );
      })}
      <label className="field" style={{ marginTop: 12 }}><span><input type="checkbox" checked={consent} disabled={initial.healthConsent} onChange={(e) => setConsent(e.target.checked)} /> Ik geef als volwassene toestemming voor het vastleggen van deze gezondheidsgegevens</span>
        <small>Doel: maaltijden met deze ingrediënten uitsluiten. Bewaartermijn: tot je ze verwijdert of je toestemming intrekt; dan worden ze direct gewist. Plateful is geen medisch hulpmiddel en kan kruisbesmetting niet uitsluiten.</small>
      </label>
      <PrimaryButton wide onClick={onNext}>Verder →</PrimaryButton>
      <SafeNote>Je kunt dit altijd later aanvullen via Gezin.</SafeNote>
    </>
  );
}

function TastesStep({ initial, wrap, onNext }: { initial: Initial; wrap: (f: () => Promise<void>) => Promise<void>; onNext: () => void }) {
  const [idx, setIdx] = useState(0);
  const [prefs, setPrefs] = useState<Record<string, string>>({});
  const p = initial.profiles[idx];
  if (!p) return null;
  async function saveAndNext() {
    await wrap(async () => {
      const rules = TASTE_CARDS.filter((c) => prefs[c.key]).map((c) => ({ target_type: c.targetType, target_id: c.targetId, preparation: c.preparation, severity: prefs[c.key] }));
      if (rules.length) await api(`/profiles/${p!.id}/preferences`, { method: 'PUT', body: { rules, source: p!.age_band === 'adult' ? 'adult' : 'child_shared_device' } });
      setPrefs({});
      if (idx + 1 < initial.profiles.length) setIdx(idx + 1); else onNext();
    });
  }
  return (
    <>
      <div className="eyeline">DIT VIND IK LEKKER</div>
      <h2 className="app-title">Wat vindt<br />{p.display_name} lekker?</h2>
      <p className="app-subtitle">Zo veel of weinig als je wilt. {p.age_band !== 'adult' ? `${p.display_name} mag dit zelf invullen.` : ''}</p>
      {TASTE_CARDS.map((c) => (
        <div key={c.key} className="taste-row" style={{ flexWrap: 'wrap' }}>
          <span>{c.label}</span>
          <div className="choice-row">{TASTE_CHOICES.map((t) => <button key={t.severity} type="button" className="choice" aria-pressed={prefs[c.key] === t.severity} onClick={() => setPrefs((x) => ({ ...x, [c.key]: x[c.key] === t.severity ? '' : t.severity }))}>{t.label}</button>)}</div>
        </div>
      ))}
      <div className="action-row">
        <PrimaryButton onClick={saveAndNext}>{idx + 1 < initial.profiles.length ? 'Volgende persoon →' : 'Verder →'}</PrimaryButton>
        <SecondaryButton onClick={onNext}>Overslaan</SecondaryButton>
      </div>
    </>
  );
}

function ContextStep({ initial, wrap, onNext }: { initial: Initial; wrap: (f: () => Promise<void>) => Promise<void>; onNext: () => void }) {
  const h = initial.household;
  const [minutes, setMinutes] = useState(h.weekday_minutes ?? 30);
  const [weekend, setWeekend] = useState<number | ''>(h.weekend_minutes ?? '');
  const [skill, setSkill] = useState(h.skill);
  const [equipment, setEquipment] = useState<string[]>(h.equipment);
  const [budget, setBudget] = useState<number | ''>(h.weekly_budget_cents != null ? h.weekly_budget_cents / 100 : '');
  return (
    <>
      <div className="eyeline">PRAKTISCH</div>
      <h2 className="app-title">Hoeveel tijd<br />hebben jullie?</h2>
      <label className="field"><span>Kooktijd doordeweeks (minuten)</span><input className="text-input" type="number" min={5} max={240} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
      <label className="field"><span>In het weekend <span style={{ fontWeight: 500 }}>(optioneel)</span></span><input className="text-input" type="number" min={5} max={240} value={weekend} onChange={(e) => setWeekend(e.target.value === '' ? '' : Number(e.target.value))} /></label>
      <div className="field"><span>Kookvaardigheid</span><div className="choice-row">
        <button type="button" className="choice" aria-pressed={skill === 'easy'} onClick={() => setSkill('easy')}>Eenvoudig</button>
        <button type="button" className="choice" aria-pressed={skill === 'medium'} onClick={() => setSkill('medium')}>Gemiddeld</button>
      </div></div>
      <div className="field"><span>Apparaten</span><div className="choice-row">{(['stove', 'oven', 'airfryer', 'microwave'] as const).map((e) => (
        <button key={e} type="button" className="choice" aria-pressed={equipment.includes(e)} onClick={() => setEquipment((x) => x.includes(e) ? x.filter((y) => y !== e) : [...x, e])}>{({ stove: 'Kookplaat', oven: 'Oven', airfryer: 'Airfryer', microwave: 'Magnetron' })[e]}</button>
      ))}</div></div>
      <label className="field"><span>Weekbudget in € <span style={{ fontWeight: 500 }}>(optioneel)</span></span><input className="text-input" type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value === '' ? '' : Number(e.target.value))} /><small>Zonder betrouwbare prijzen tonen we alleen een indicatie.</small></label>
      <PrimaryButton wide onClick={() => wrap(async () => {
        await api(`/households/${h.id}`, { method: 'PATCH', body: { weekday_minutes: minutes, weekend_minutes: weekend === '' ? null : weekend, skill, equipment, weekly_budget_cents: budget === '' ? null : Math.round(budget * 100) } });
        onNext();
      })}>Laat het eerste voorstel zien →</PrimaryButton>
    </>
  );
}
