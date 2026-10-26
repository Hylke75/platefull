'use client';
// S-05 Plan B: scenario → 'Voorstel bekijken' (diff, geen side-effects) → 'Pas het menu aan' (atomair) → undo via Vandaag.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/app/AppShell';
import { OrangeButton, PrimaryButton, SafeNote, SubHeader } from '@/components/ui/phone-ui';
import { api, newIdempotencyKey, type ClientApiError } from '@/lib/client-api';
import type { PlanBOutcome } from '@/domain/planb';

type Kind = 'less_time' | 'attendee_absent' | 'ingredient_missing' | 'taste_conflict';
const OPTIONS: [Kind, string, string][] = [
  ['less_time', '◷', 'Minder tijd'],
  ['attendee_absent', '↗', 'Iemand eet niet mee'],
  ['ingredient_missing', '▤', 'Iets ontbreekt'],
  ['taste_conflict', '♡', 'Kind lust het niet'],
];

interface Props {
  slotId: string; revision: number; date: string; recipeName: string; minutes: number;
  eaters: { id: string; name: string }[]; children_: { id: string; name: string }[]; ingredients: { id: string; name: string }[];
}

export function PlanBClient(p: Props) {
  const router = useRouter();
  const toast = useToast();
  const [kind, setKind] = useState<Kind>('less_time');
  const [minutes, setMinutes] = useState(Math.max(5, Math.min(p.minutes - 5, 15)));
  const [absent, setAbsent] = useState<string[]>([]);
  const [missing, setMissing] = useState(p.ingredients[0]?.id ?? '');
  const [child, setChild] = useState(p.children_[0]?.id ?? p.eaters[0]?.id ?? '');
  const [tasteIng, setTasteIng] = useState(p.ingredients[0]?.id ?? '');
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<{ outcome: PlanBOutcome; revision: number; shoppingDelta: { added: number; removed: number; changed: number } } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idem] = useState(newIdempotencyKey);

  const scenario = () => {
    switch (kind) {
      case 'less_time': return { kind, availableMinutes: minutes };
      case 'attendee_absent': return { kind, profileIds: absent };
      case 'ingredient_missing': return { kind, ingredientId: missing };
      case 'taste_conflict': return { kind, profileId: child, ingredientId: tasteIng };
    }
  };
  const valid = kind !== 'attendee_absent' || absent.length > 0;

  async function calculate() {
    setBusy(true); setError(null); setPreview(null);
    try {
      setPreview(await api(`/meal-slots/${p.slotId}/plan-b/preview`, { body: { scenario: scenario(), free_text: text || null } }));
      requestAnimationFrame(() => document.getElementById('screen')?.scrollTo({ top: 99999, behavior: 'smooth' }));
    } catch (e) { setError((e as ClientApiError).message); } finally { setBusy(false); }
  }

  async function apply() {
    if (!preview) return;
    setBusy(true); setError(null);
    try {
      const res = await api<{ revision: number }>(`/meal-slots/${p.slotId}/plan-b/apply`, { body: { scenario: scenario(), free_text: text || null }, revision: preview.revision, idempotent: idem });
      toast('Je maaltijdplan is aangepast', {
        label: 'Maak ongedaan',
        run: () => { void api(`/meal-slots/${p.slotId}/undo`, { body: {}, revision: res.revision, idempotent: true }).then(() => { toast('Wijziging ongedaan gemaakt'); router.refresh(); }).catch((e: ClientApiError) => toast(e.message)); },
      });
      router.push(`/app/vandaag?datum=${p.date}`);
      router.refresh();
    } catch (e) {
      const err = e as ClientApiError;
      setError(err.code === 'revision_conflict' ? 'Het menu is intussen gewijzigd. Bekijk het voorstel opnieuw.' : err.message);
      if (err.code === 'revision_conflict') setPreview(null);
    } finally { setBusy(false); }
  }

  const select = (value: string, onChange: (v: string) => void, opts: { id: string; name: string }[], label: string) => (
    <label className="field"><span>{label}</span>
      <select className="text-input" value={value} onChange={(e) => { onChange(e.target.value); setPreview(null); }}>
        {opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );

  const ok = preview?.outcome.status === 'ok' ? preview.outcome : null;

  return (
    <div className="app-view">
      <SubHeader title="SLIM PLAN B" backHref={`/app/vandaag?datum=${p.date}`} />
      <div className="planb-lead">
        <div className="small-kicker">✳ GEEN STRESS, WIJ DENKEN MEE</div>
        <h2>Oeps, plannen veranderd?</h2>
        <p>Vertel ons wat er speelt. We zoeken de makkelijkste aanpassing voor {p.recipeName.toLowerCase()}.</p>
      </div>
      <div className="block-label">Wat is er veranderd?</div>
      <div className="scenario-grid">
        {OPTIONS.map(([id, ico, lab]) => (
          <button key={id} type="button" className={`scenario ${id === kind ? 'selected' : ''}`} aria-pressed={id === kind} onClick={() => { setKind(id); setPreview(null); }}><span>{ico}</span>{lab}</button>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        {kind === 'less_time' ? (
          <label className="field"><span>Hoeveel minuten heb je?</span>
            <input className="text-input" type="number" min={5} max={240} value={minutes} onChange={(e) => { setMinutes(Number(e.target.value)); setPreview(null); }} />
            <small>Nu: {p.minutes} minuten.</small>
          </label>
        ) : kind === 'attendee_absent' ? (
          <div className="field"><span>Wie eet er niet mee?</span>
            <div className="choice-row">{p.eaters.map((e) => (
              <button key={e.id} type="button" className="choice" aria-pressed={absent.includes(e.id)} onClick={() => { setAbsent((a) => a.includes(e.id) ? a.filter((x) => x !== e.id) : [...a, e.id]); setPreview(null); }}>{e.name}</button>
            ))}</div>
          </div>
        ) : kind === 'ingredient_missing' ? (
          select(missing, setMissing, p.ingredients, 'Wat ontbreekt er?')
        ) : (
          <>{select(child, setChild, p.children_.length ? p.children_ : p.eaters, 'Wie?')}{select(tasteIng, setTasteIng, p.ingredients, 'Wat lust die niet?')}</>
        )}
      </div>
      <div className="block-label">Nog iets? <span style={{ fontWeight: 500, color: '#a3afa3' }}>(optioneel)</span></div>
      <textarea className="free-input" maxLength={500} placeholder="Bijv. ik moet over 20 minuten weg..." value={text} onChange={(e) => setText(e.target.value)} />
      <SafeNote>Je toelichting is alleen context. Allergieën en medische regels blijven altijd gelden.</SafeNote>
      <OrangeButton wide style={{ marginTop: 10 }} onClick={calculate} disabled={busy || !valid} aria-busy={busy && !preview}>✳ Voorstel bekijken →</OrangeButton>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {preview && ok ? (
        <div className="scenario-output">
          <div className="eyeline">✳ DIT KUNNEN WE DOEN</div>
          <h3>{ok.title}</h3>
          <p>{ok.explanation}</p>
          <div className="diff-list">
            {ok.diff.eaters ? <div><span>Eters</span><b>{ok.diff.eaters.from} → {ok.diff.eaters.to}</b></div> : null}
            {ok.diff.minutes ? <div><span>Tijd</span><b>{ok.diff.minutes.from} → {ok.diff.minutes.to} min</b></div> : null}
            {ok.diff.recipe ? <div><span>Gerecht</span><b>{ok.diff.recipe.fromName} → {ok.diff.recipe.toName}</b></div> : null}
            {ok.diff.substitutions?.map((s) => <div key={s.from}><span>Vervanging</span><b>{s.fromName} → {s.toName}</b></div>)}
            {ok.diff.servedSeparately?.map((s) => <div key={s.ingredientId}><span>Apart</span><b>{s.name}</b></div>)}
            {(preview.shoppingDelta.added + preview.shoppingDelta.removed + preview.shoppingDelta.changed) > 0 ? (
              <div><span>Boodschappen</span><b>{[preview.shoppingDelta.added && `+${preview.shoppingDelta.added}`, preview.shoppingDelta.removed && `−${preview.shoppingDelta.removed}`, preview.shoppingDelta.changed && `${preview.shoppingDelta.changed} gewijzigd`].filter(Boolean).join(' · ')}</b></div>
            ) : null}
          </div>
          <div className="output-list">{ok.bullets.map((x) => <span key={x}>{x}</span>)}</div>
          <PrimaryButton wide onClick={apply} disabled={busy}>✓ Pas het menu aan</PrimaryButton>
        </div>
      ) : preview ? (
        <div className="shopping-tip"><span>✳</span><div><strong>{preview.outcome.status === 'no_change_needed' ? 'Niets aan te passen' : 'Dit lukt niet betrouwbaar'}</strong>{preview.outcome.explanation}</div></div>
      ) : null}
    </div>
  );
}
