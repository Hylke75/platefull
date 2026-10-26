'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SafeNote, SubHeader, TasteChip } from '@/components/ui/phone-ui';
import { pantryAvailability } from '@/domain/pantry';
import type { PantryItem } from '@/domain/types';
import { api, type ClientApiError } from '@/lib/client-api';

type Item = PantryItem & { id: string; location: string; version: number };
const UNITS: Record<string, string[]> = { mass: ['g', 'kg'], volume: ['ml', 'l'], count: ['stuk', 'blik', 'pak', 'bakje'] };

export function PantryClient({ items, ingredients }: { items: Item[]; ingredients: { id: string; name: string; unitKind: string }[] }) {
  const router = useRouter();
  const [ing, setIng] = useState(ingredients[0]?.id ?? '');
  const [qty, setQty] = useState<string>('');
  const kind = ingredients.find((i) => i.id === ing)?.unitKind ?? 'count';
  const [unit, setUnit] = useState('stuk');
  const [expires, setExpires] = useState('');
  const [error, setError] = useState<string | null>(null);
  const name = (id: string) => ingredients.find((i) => i.id === id)?.name ?? id;
  const now = new Date();

  async function save(status: 'confirmed' | 'unknown') {
    setError(null);
    try {
      await api('/pantry', { body: { ingredient_id: ing, quantity: status === 'confirmed' && qty ? Number(qty) : null, unit: status === 'confirmed' && qty ? (UNITS[kind]!.includes(unit) ? unit : UNITS[kind]![0]) : null, status, location: 'kast', expires_at: expires || null }, idempotent: true });
      setQty(''); setExpires(''); router.refresh();
    } catch (e) { setError((e as ClientApiError).message); }
  }
  async function confirm(item: Item) {
    try { await api(`/pantry/${item.id}`, { method: 'PATCH', body: { status: 'confirmed', version: item.version }, idempotent: true }); router.refresh(); } catch (e) { setError((e as ClientApiError).message); }
  }
  async function remove(item: Item) {
    try { await api(`/pantry/${item.id}`, { method: 'DELETE', idempotent: true }); router.refresh(); } catch (e) { setError((e as ClientApiError).message); }
  }

  return (
    <div className="app-view">
      <SubHeader title="VOORRAAD" backHref="/app/boodschappen" />
      <h2 className="app-title">Wat is er<br />in huis?</h2>
      <p className="app-subtitle">Niet verplicht. Alleen wat je bevestigt telt mee als &lsquo;in huis&rsquo;; onbekend blijft onbekend.</p>
      {items.map((i) => {
        const av = pantryAvailability(i, null, now);
        return (
          <div key={i.id} className="taste-row">
            <span>{name(i.ingredientId)}{i.quantity != null ? ` · ${i.quantity} ${i.unit ?? ''}` : ''}{i.expiresAt ? ` · tht ${i.expiresAt}` : ''}</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <TasteChip type={av.status === 'in_stock' ? 'like' : 'care'}>{av.status === 'in_stock' ? 'In huis' : av.status === 'check' ? 'Even controleren' : 'Onbekend'}</TasteChip>
              {av.status !== 'in_stock' ? <button className="choice" onClick={() => confirm(i)}>Klopt</button> : null}
              <button className="choice" onClick={() => remove(i)} aria-label={`${name(i.ingredientId)} verwijderen`}>×</button>
            </span>
          </div>
        );
      })}
      <div className="person-section-title">Toevoegen</div>
      <label className="field"><span>Ingrediënt</span>
        <select className="text-input" value={ing} onChange={(e) => setIng(e.target.value)}>{ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
      </label>
      <div className="action-row">
        <input className="text-input" type="number" min={0} placeholder="Hoeveelheid" value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Hoeveelheid" />
        <select className="text-input" value={UNITS[kind]!.includes(unit) ? unit : UNITS[kind]![0]} onChange={(e) => setUnit(e.target.value)} aria-label="Eenheid">{UNITS[kind]!.map((u) => <option key={u}>{u}</option>)}</select>
      </div>
      <label className="field" style={{ marginTop: 8 }}><span>Houdbaar tot (optioneel)</span><input className="text-input" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="action-row"><button className="btn btn-primary" onClick={() => save('confirmed')} disabled={!qty}>In huis</button><button className="btn btn-plain" onClick={() => save('unknown')}>Weet ik niet zeker</button></div>
      <SafeNote>Na 7 dagen vragen we je een voorraadregel opnieuw te bevestigen.</SafeNote>
    </div>
  );
}
