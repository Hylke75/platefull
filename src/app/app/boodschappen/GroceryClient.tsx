'use client';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader, SafeNote, ShoppingItem } from '@/components/ui/phone-ui';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/shopping';
import { formatQuantity, type BaseUnit } from '@/domain/units';
import { api, type ClientApiError } from '@/lib/client-api';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export interface GroceryItem {
  id: string; list_id: string; description: string; qty: number | null; unit: string | null; category: keyof typeof CATEGORY_LABELS;
  origin: 'auto' | 'manual'; state: 'open' | 'checked' | 'removed'; not_needed: boolean; check_status: 'confirmed' | 'check' | 'unknown'; version: number;
}

const amount = (i: GroceryItem) => (i.qty != null && i.unit ? formatQuantity(Number(i.qty), i.unit as BaseUnit) : i.qty != null ? String(i.qty) : '');

export function GroceryClient({ listId, householdName, initial }: { listId: string; householdName: string; initial: GroceryItem[] }) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState('');
  const [offline, setOffline] = useState(false);

  // Realtime: afvinken van de andere volwassene direct zichtbaar (RLS geldt ook voor realtime).
  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    const ch = sb.channel(`list-${listId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items', filter: `list_id=eq.${listId}` }, (payload) => {
      setItems((cur) => {
        if (payload.eventType === 'DELETE') return cur.filter((i) => i.id !== (payload.old as GroceryItem).id);
        const row = payload.new as GroceryItem;
        const exists = cur.some((i) => i.id === row.id);
        return exists ? cur.map((i) => (i.id === row.id && row.version >= i.version ? row : i)) : [...cur, row];
      });
    }).subscribe();
    const on = () => setOffline(false), off = () => setOffline(true);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { void sb.removeChannel(ch); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [listId]);

  const visible = items.filter((i) => i.state !== 'removed' && !i.not_needed);
  const notNeeded = items.filter((i) => i.not_needed && i.state !== 'removed');
  const checked = visible.filter((i) => i.state === 'checked').length;
  const groups = useMemo(() => CATEGORY_ORDER.map((c) => [c, visible.filter((i) => i.category === c)] as const).filter(([, l]) => l.length), [visible]);

  async function toggle(item: GroceryItem, on: boolean) {
    setError(null);
    const optimistic = { ...item, state: on ? 'checked' as const : 'open' as const, version: item.version + 1 };
    setItems((cur) => cur.map((i) => (i.id === item.id ? optimistic : i)));
    try {
      const res = await api<{ item: GroceryItem }>(`/shopping-items/${item.id}`, { method: 'PATCH', body: { state: optimistic.state, version: item.version }, idempotent: true });
      setItems((cur) => cur.map((i) => (i.id === item.id ? res.item : i)));
    } catch (e) {
      const err = e as ClientApiError;
      const current = err.details?.current as GroceryItem | undefined;
      setItems((cur) => cur.map((i) => (i.id === item.id ? current ?? item : i)));
      setError(err.code === 'revision_conflict' ? 'Iemand anders heeft dit item net aangepast.' : err.message);
    }
  }

  async function add(description: string) {
    if (!description.trim()) return;
    try {
      const res = await api<{ item: GroceryItem }>(`/shopping-lists/${listId}/items`, { body: { description }, idempotent: true });
      setItems((cur) => (cur.some((i) => i.id === res.item.id) ? cur : [...cur, res.item]));
      setNewItem('');
    } catch (e) { setError((e as ClientApiError).message); }
  }

  async function restore(item: GroceryItem) {
    await add(`${item.description}${amount(item) ? ` (${amount(item)})` : ''}`);
    try { await api(`/shopping-items/${item.id}`, { method: 'PATCH', body: { state: 'removed', version: item.version }, idempotent: true }); } catch { /* blijft zichtbaar */ }
    setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, state: 'removed' } : i)));
  }

  return (
    <div className="app-view">
      <AppHeader initials={householdName.slice(0, 2).toUpperCase()} />
      <div className="eyeline">SAMEN GEREGELD</div>
      <h2 className="app-title">Een lijstje.<br />Alles in huis.</h2>
      <p className="app-subtitle">Dit hebben jullie nog nodig voor de bevestigde maaltijden van deze week.</p>
      <div className="progress-note"><span>{checked} van {visible.length} afgevinkt</span><small>{offline ? 'Offline — wijzigingen even niet gedeeld' : 'Automatisch uit het menu ✳'}</small></div>
      {visible.length === 0 ? <SafeNote>Nog niets nodig. Bevestig een maaltijd met &lsquo;Dit eten we&rsquo; en de lijst vult zich vanzelf.</SafeNote> : null}
      {groups.map(([cat, list]) => (
        <div className="check-section" key={cat}>
          <h3>{CATEGORY_LABELS[cat]}</h3>
          {list.map((i) => (
            <ShoppingItem key={i.id} label={i.description} amount={amount(i)} checked={i.state === 'checked'} onChange={(on) => toggle(i, on)}
              extra={i.check_status !== 'confirmed' && i.origin === 'auto' ? <small style={{ display: 'block', fontSize: 9, color: '#a28c71' }}>{i.check_status === 'check' ? 'Voorraad even controleren' : 'Voorraad onbekend'}</small> : null} />
          ))}
        </div>
      ))}
      <form className="action-row" onSubmit={(e) => { e.preventDefault(); void add(newItem); }}>
        <input className="text-input" placeholder="Zelf iets toevoegen…" value={newItem} maxLength={80} onChange={(e) => setNewItem(e.target.value)} aria-label="Item toevoegen" />
        <button className="btn btn-primary" style={{ flex: '0 0 auto' }} disabled={!newItem.trim()}>+</button>
      </form>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {notNeeded.length ? (
        <div className="check-section">
          <h3>Niet meer nodig</h3>
          {notNeeded.map((i) => <div key={i.id} className="shopping-item done"><span>{i.description}</span><span className="amount">{amount(i)}</span><button className="choice" onClick={() => restore(i)}>Toch kopen</button></div>)}
        </div>
      ) : null}
      <div className="shopping-tip"><span>✳</span><div><strong>Goed om te weten</strong>Alleen bevestigde voorraad telt als &lsquo;in huis&rsquo;. Geen winkelprijzen of bestellingen in deze versie.</div></div>
      <div className="action-row"><a className="btn btn-plain" href="/app/voorraad">Voorraad</a><a className="btn btn-plain" href="/app/restjes">Restjes</a></div>
    </div>
  );
}
