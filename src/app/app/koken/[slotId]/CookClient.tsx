'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/app/AppShell';
import { PrimaryButton, RecipeStep, SecondaryButton } from '@/components/ui/phone-ui';
import { api, newIdempotencyKey, type ClientApiError } from '@/lib/client-api';
import type { RecipeStepDef } from '@/domain/types';

const RATINGS: [string, string][] = [['repeat', 'Voor herhaling'], ['fine', 'Prima'], ['rather_not', 'Liever anders']];

export function CookClient({ slotId, revision, state, date, ingredients, steps, eaters }: {
  slotId: string; revision: number; state: string; date: string;
  ingredients: { name: string; amount: string; note: string }[]; steps: RecipeStepDef[]; eaters: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [timer, setTimer] = useState<{ step: number; until: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  const [leftovers, setLeftovers] = useState<{ portions: number; storage: 'fridge' | 'freezer' } | null>(null);
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idem] = useState(newIdempotencyKey);

  useEffect(() => {
    if (!timer) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timer]);
  const remaining = timer ? Math.max(0, Math.round((timer.until - now) / 1000)) : 0;

  async function complete() {
    setBusy(true); setError(null);
    try {
      await api(`/meal-slots/${slotId}/complete`, {
        body: { leftovers, feedback: Object.entries(ratings).map(([profile_id, rating]) => ({ profile_id, rating })) },
        revision, idempotent: idem,
      });
      toast('Gekookt! Eet smakelijk.');
      router.push(`/app/vandaag?datum=${date}`);
      router.refresh();
    } catch (e) { setError((e as ClientApiError).message); } finally { setBusy(false); }
  }

  return (
    <>
      <div className="person-section-title">Ingrediënten</div>
      {ingredients.map((i, idx) => <div key={idx} className="taste-row"><span>{i.name}{i.note ? ` · ${i.note}` : ''}</span><span className="taste-status like">{i.amount}</span></div>)}
      {steps.map((s, i) => (
        <div key={i}>
          <RecipeStep index={i + 1} total={steps.length} title={s.title} body={s.body} minutes={s.minutes} />
          {s.minutes ? (
            <button type="button" className="choice" style={{ marginTop: 6 }} onClick={() => { setTimer({ step: i, until: Date.now() + s.minutes! * 60_000 }); setNow(Date.now()); }}>
              {timer?.step === i ? (remaining > 0 ? `◷ ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : '✓ Tijd!') : '◷ Start timer'}
            </button>
          ) : null}
        </div>
      ))}
      {state === 'completed' ? null : !finishing ? (
        <PrimaryButton wide style={{ marginTop: 14 }} onClick={() => setFinishing(true)}>✓ Gekookt</PrimaryButton>
      ) : (
        <div className="scenario-output">
          <div className="eyeline">✳ AFRONDEN</div>
          <h3>Restjes over?</h3>
          <div className="choice-row">
            <button type="button" className="choice" aria-pressed={!leftovers} onClick={() => setLeftovers(null)}>Nee</button>
            {[1, 2, 3, 4].map((n) => <button key={n} type="button" className="choice" aria-pressed={leftovers?.portions === n} onClick={() => setLeftovers({ portions: n, storage: leftovers?.storage ?? 'fridge' })}>{n} {n === 1 ? 'portie' : 'porties'}</button>)}
          </div>
          {leftovers ? (
            <div className="choice-row" style={{ marginTop: 8 }}>
              <button type="button" className="choice" aria-pressed={leftovers.storage === 'fridge'} onClick={() => setLeftovers({ ...leftovers, storage: 'fridge' })}>Koelkast (max. 2 dagen)</button>
              <button type="button" className="choice" aria-pressed={leftovers.storage === 'freezer'} onClick={() => setLeftovers({ ...leftovers, storage: 'freezer' })}>Vriezer</button>
            </div>
          ) : null}
          <h3 style={{ marginTop: 14 }}>Hoe was het? <span style={{ fontSize: 12, fontWeight: 500 }}>(optioneel)</span></h3>
          {eaters.map((e) => (
            <div key={e.id} style={{ margin: '8px 0' }}>
              <div className="little-label">{e.name}</div>
              <div className="choice-row">{RATINGS.map(([k, l]) => <button key={k} type="button" className="choice" aria-pressed={ratings[e.id] === k} onClick={() => setRatings((r) => ({ ...r, [e.id]: k }))}>{l}</button>)}</div>
            </div>
          ))}
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="action-row">
            <PrimaryButton onClick={complete} disabled={busy}>Afronden</PrimaryButton>
            <SecondaryButton onClick={() => setFinishing(false)} disabled={busy}>Terug</SecondaryButton>
          </div>
        </div>
      )}
    </>
  );
}
