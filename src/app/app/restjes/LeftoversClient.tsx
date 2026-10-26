'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SafeNote, SubHeader, TasteChip } from '@/components/ui/phone-ui';
import { leftoverState } from '@/domain/pantry';
import type { Leftover } from '@/domain/types';
import { api, type ClientApiError } from '@/lib/client-api';

const fmt = (d: string) => new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' }).format(new Date(d));

export function LeftoversClient({ items }: { items: Leftover[] }) {
  const router = useRouter();
  const [label, setLabel] = useState('');
  const [portions, setPortions] = useState(2);
  const [storage, setStorage] = useState<'fridge' | 'freezer'>('fridge');
  const [error, setError] = useState<string | null>(null);
  const now = new Date();

  async function patch(id: string, status: 'used' | 'discarded' | 'unsafe') {
    try { await api(`/leftovers/${id}`, { method: 'PATCH', body: { status }, idempotent: true }); router.refresh(); } catch (e) { setError((e as ClientApiError).message); }
  }
  async function add() {
    try { await api('/leftovers', { body: { label, portions, storage }, idempotent: true }); setLabel(''); router.refresh(); } catch (e) { setError((e as ClientApiError).message); }
  }
  const active = items.filter((l) => l.status === 'available' || l.status === 'unsafe');

  return (
    <div className="app-view">
      <SubHeader title="RESTJES" backHref="/app/boodschappen" />
      <h2 className="app-title">Slim opmaken,<br />veilig bewaren.</h2>
      <p className="app-subtitle">Afgedekt in de koelkast maximaal twee dagen; langer bewaren? Invriezen.</p>
      {active.length === 0 ? <SafeNote>Geen restjes bewaard.</SafeNote> : null}
      {active.map((l) => {
        const st = leftoverState(l, now);
        return (
          <div key={l.id} className="family-person" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ fontSize: 12, color: 'var(--forest)' }}>{l.label} · {l.portions} {l.portions === 1 ? 'portie' : 'porties'}</strong>
              <TasteChip type={st === 'usable' ? 'like' : 'strict'}>{st === 'usable' ? 'Bruikbaar' : 'Controle nodig'}</TasteChip>
            </div>
            <small style={{ fontSize: 10, color: '#899589' }}>{l.storage === 'fridge' ? 'Koelkast' : 'Vriezer'} · bewaard {fmt(l.storedAt)} · op tot {fmt(l.useBy)}</small>
            <div className="choice-row" style={{ marginTop: 8 }}>
              <button className="choice" onClick={() => patch(l.id, 'used')}>Opgemaakt</button>
              <button className="choice" onClick={() => patch(l.id, 'discarded')}>Weggedaan</button>
              {l.status !== 'unsafe' ? <button className="choice strict" onClick={() => patch(l.id, 'unsafe')}>Niet meer goed</button> : null}
            </div>
          </div>
        );
      })}
      <div className="person-section-title">Restje toevoegen</div>
      <label className="field"><span>Wat?</span><input className="text-input" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} /></label>
      <div className="choice-row">{[1, 2, 3, 4].map((n) => <button key={n} type="button" className="choice" aria-pressed={portions === n} onClick={() => setPortions(n)}>{n}</button>)}</div>
      <div className="choice-row" style={{ marginTop: 8 }}>
        <button type="button" className="choice" aria-pressed={storage === 'fridge'} onClick={() => setStorage('fridge')}>Koelkast</button>
        <button type="button" className="choice" aria-pressed={storage === 'freezer'} onClick={() => setStorage('freezer')}>Vriezer</button>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="btn btn-primary btn-wide" style={{ marginTop: 10 }} onClick={add} disabled={!label.trim()}>Bewaren</button>
      <SafeNote>Na de bewaartermijn markeren we restjes nooit automatisch als veilig. Twijfel? Weggooien.</SafeNote>
    </div>
  );
}
