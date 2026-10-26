'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, type ClientApiError } from '@/lib/client-api';

export function AddProfile({ householdId }: { householdId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [band, setBand] = useState<'adult' | 'teen16' | 'child'>('child');
  const [error, setError] = useState<string | null>(null);
  if (!open) return <button type="button" className="btn btn-plain btn-wide" onClick={() => setOpen(true)}>+ Gezinslid toevoegen</button>;
  async function save() {
    setError(null);
    try {
      await api(`/households/${householdId}/profiles`, { body: { display_name: name, age_band: band } });
      setOpen(false); setName(''); router.refresh();
    } catch (e) { setError((e as ClientApiError).message); }
  }
  return (
    <div className="family-person" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <label className="field"><span>Roepnaam</span><input className="text-input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoFocus /></label>
      <div className="choice-row">{([['adult', 'Volwassene'], ['teen16', '16+'], ['child', '0–15']] as const).map(([k, l]) => <button key={k} type="button" className="choice" aria-pressed={band === k} onClick={() => setBand(k)}>{l}</button>)}</div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="action-row"><button className="btn btn-primary" onClick={save} disabled={!name.trim()}>Toevoegen</button><button className="btn btn-plain" onClick={() => setOpen(false)}>Annuleren</button></div>
    </div>
  );
}
