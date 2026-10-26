'use client';
// S-03 Vandaag: één voorstel, maximaal drie redenen, expliciete bevestiging, 'Ander idee' en Plan B.
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/app/AppShell';
import { AppHeader, DayLine, MatchPanel, PlanBStrip, PrimaryButton, SafeNote, SecondaryButton } from '@/components/ui/phone-ui';
import { api, ClientApiError } from '@/lib/client-api';
import type { DayView } from '@/server/views';
import { AttendeeChips } from './AttendeeChips';

const ACTIVE = ['proposed', 'accepted', 'changed', 'cooking', 'completed'];

export function TodayClient({ view }: { view: DayView }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [softConflict, setSoftConflict] = useState<{ profile?: string; ingredient?: string }[] | null>(null);
  const requested = useRef(false);
  const { slot, recipe, explanation } = view;
  const isToday = view.date === view.today;
  const accepted = ['accepted', 'changed', 'cooking'].includes(slot.state);

  // Lege dag: bereken een voorstel en bewaar het als voorstelversie (nooit als geaccepteerd).
  useEffect(() => {
    if (requested.current) return;
    if (['draft', 'dismissed', 'cancelled'].includes(slot.state) && view.eaters > 0) {
      requested.current = true;
      setBusy('suggest');
      api('/meal-suggestions', { body: { slot_id: slot.id, persist: true }, idempotent: true })
        .then(() => router.refresh())
        .catch((e: ClientApiError) => setError(e.message))
        .finally(() => setBusy(null));
    }
  }, [slot.id, slot.state, view.eaters, router]);

  async function run(kind: string, fn: () => Promise<unknown>, success?: string) {
    setBusy(kind); setError(null);
    try {
      await fn();
      if (success) toast(success);
      router.refresh();
    } catch (e) {
      const err = e as ClientApiError;
      if (err.details?.soft_conflicts) setSoftConflict(err.details.soft_conflicts as { profile?: string; ingredient?: string }[]);
      else setError(err.code === 'revision_conflict' ? 'Iemand anders heeft dit net aangepast. We tonen de nieuwste versie.' : err.message);
      if (err.code === 'revision_conflict') router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const accept = (override = false) => run('accept', () => api(`/meal-slots/${slot.id}/accept`, { body: { override_soft: override }, revision: slot.revision, idempotent: true }), 'Vanavond is geregeld!');
  const swap = () => run('swap', () => api(`/meal-slots/${slot.id}/swap`, { body: {}, revision: slot.revision, idempotent: true }), 'Nieuw gerecht voorgesteld');
  const undo = () => run('undo', () => api(`/meal-slots/${slot.id}/undo`, { body: {}, revision: slot.revision, idempotent: true }), 'Wijziging ongedaan gemaakt');

  const tag = slot.plan_b_note ? 'Plan B toegepast' : accepted ? 'Op het menu' : 'Slim voorstel voor jullie';
  const note = slot.plan_b_note || explanation?.adaptations[0] || explanation?.reasons.find((r) => !r.endsWith(' min')) || null;
  const initials = view.attendees.filter((a) => a.attendance !== 'no').map((a) => a.profile_id ? view.profiles.find((p) => p.id === a.profile_id)?.initial ?? '?' : (a.guest_label ?? 'G').slice(0, 1).toUpperCase());

  return (
    <div className="app-view">
      <AppHeader initials={view.householdName.slice(0, 2).toUpperCase()} />
      <div className="eyeline">{isToday ? `${view.greeting} ☀` : view.date}</div>
      <h2 className="app-title">{isToday ? <>Vanavond wordt<br />het lekker.</> : <>Zo eten jullie<br />die dag.</>}</h2>
      <DayLine days={view.days.map((d) => ({ key: d.date, dayLabel: d.label, dayNumber: d.number, selected: d.selected, href: `/app/vandaag?datum=${d.date}` }))} label={<a href="/app/week">Deze week →</a>} />

      {busy === 'suggest' || (!recipe && ['draft', 'dismissed', 'cancelled'].includes(slot.state) && view.eaters > 0 && !error) ? (
        <div className="dinner-hero skeleton" aria-busy="true" aria-label="Voorstel wordt berekend" />
      ) : recipe && ACTIVE.concat('blocked').includes(slot.state) ? (
        <article className="dinner-hero">
          {recipe.image ? <img src={recipe.image} alt={recipe.name} /> : <div className="dish-placeholder" aria-hidden="true">✳</div>}
          <div className="dinner-overlay">
            <span className="small-glass-tag">✳ {slot.state === 'blocked' ? 'Controle nodig' : tag}</span>
            <div>
              <h3>{recipe.name}</h3>
              <div className="dinner-metadata"><span>◷ {recipe.totalMinutes} min</span><span>◉ {view.eaters} personen</span><span>♡ 1 maaltijd</span></div>
            </div>
          </div>
        </article>
      ) : (
        <div className="shopping-tip"><span>✳</span><div><strong>{view.eaters === 0 ? 'Niemand eet mee' : 'Nog geen voorstel'}</strong>{view.eaters === 0 ? 'Volgens de planning eet er die dag niemand thuis.' : 'We vonden geen gecontroleerd gerecht dat bij iedereen past. Vul profielen of etiketcontroles aan, of kies zelf in het weekplan.'}</div></div>
      )}

      {recipe && explanation ? (
        <MatchPanel
          title={view.fitLabelAllowed ? 'Past bij jullie gezin' : 'Nog even controleren'}
          badge={view.fitLabelAllowed ? '✓ Goed passend' : 'Controleer'}
          badgeVariant={view.fitLabelAllowed ? 'ok' : 'check'}
          initials={initials.slice(0, 6)}
          comment={`${view.eaters} ${view.eaters === 1 ? 'smaakprofiel' : 'smaakprofielen'} meegenomen`}
          note={slot.state === 'blocked' || !explanation.safe ? (explanation.blockedReasons[0] ?? 'Een nieuwe harde beperking vraagt om een ander gerecht.') : note ?? explanation.reasons.join(' · ')}
        />
      ) : null}

      <AttendeeChips slotId={slot.id} revision={slot.revision} attendees={view.attendees} profiles={view.profiles} />

      {recipe && explanation?.safe && explanation.reasons.length ? (
        <p className="app-subtitle" style={{ margin: '10px 0 0' }}>Waarom: {explanation.reasons.join(' · ')} — <a href={`/app/waarom/${slot.id}`} style={{ fontWeight: 800, color: 'var(--forest)' }}>Waarom deze?</a></p>
      ) : null}

      {view.warnings.map((w) => <SafeNote key={w}>{w}</SafeNote>)}
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {softConflict ? (
        <div className="parent-toggle" role="alertdialog" aria-label="Toch kiezen">
          <span><b>{softConflict.map((c) => `${c.profile} vindt ${c.ingredient?.toLowerCase()} echt niet lekker`).join(', ')}</b><small>De voorkeur blijft opgeslagen. Niemand hoeft iets te eten wat hij of zij niet wil.</small></span>
          <PrimaryButton onClick={() => { setSoftConflict(null); void accept(true); }} disabled={!!busy}>Toch kiezen</PrimaryButton>
        </div>
      ) : null}

      {recipe && accepted ? (
        <div className="confirmation">
          <div style={{ fontSize: 23 }}>✓</div>
          <h3>Het is geregeld!</h3>
          <p>{recipe.name} staat {isToday ? 'voor vanavond' : 'die dag'} op het menu.</p>
          <a className="btn btn-primary btn-wide" href={`/app/koken/${slot.id}`}>Bekijk de kookstappen →</a>
        </div>
      ) : recipe && slot.state === 'completed' ? (
        <div className="confirmation"><div style={{ fontSize: 23 }}>✓</div><h3>Gekookt!</h3><p>Fijn gegeten? Restjes vind je onder Lijst → Restjes.</p></div>
      ) : recipe && explanation?.safe && slot.state === 'proposed' ? (
        <div className="action-row">
          <PrimaryButton onClick={() => accept(false)} disabled={!!busy} aria-busy={busy === 'accept'}>✓ Dit eten we</PrimaryButton>
          <SecondaryButton onClick={swap} disabled={!!busy} aria-busy={busy === 'swap'}>↻ Ander idee</SecondaryButton>
        </div>
      ) : recipe ? (
        <div className="action-row"><SecondaryButton wide onClick={swap} disabled={!!busy}>↻ Kies een ander gerecht</SecondaryButton></div>
      ) : null}

      {view.undoAvailable ? <SecondaryButton wide style={{ marginTop: 8 }} onClick={undo} disabled={!!busy}>↺ Maak ongedaan</SecondaryButton> : null}
      {recipe ? <a className="btn btn-plain btn-wide" style={{ marginTop: 8 }} href={`/app/gerecht/${recipe.id}?slot=${slot.id}`}>Ingrediënten & aanpassingen</a> : null}

      {recipe && slot.state !== 'completed' ? <PlanBStrip title="↗ Loopt de dag anders?" subtitle="Regel direct een slim plan B" href={`/app/plan-b?slot=${slot.id}`} /> : null}
      <div className="today-footer">Ontworpen voor de drukte van het echte leven ✳</div>
    </div>
  );
}
