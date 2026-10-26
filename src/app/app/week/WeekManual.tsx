'use client';
// Handmatig plannen binnen de gecontroleerde catalogus (§7.5: ook als er geen voorstel is).
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/app/AppShell';
import { SecondaryButton } from '@/components/ui/phone-ui';
import { api, type ClientApiError } from '@/lib/client-api';

export function WeekManual({ planId, slots, recipes }: { planId: string; slots: { id: string; date: string; label: string; revision: number }[]; recipes: { id: string; name: string; minutes: number }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [slotId, setSlotId] = useState(slots[0]?.id ?? '');
  const [recipeId, setRecipeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!slots.length) return null;

  async function save(remove = false) {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    setBusy(true); setError(null);
    try {
      await api(`/week-plans/${planId}`, { method: 'PATCH', body: { slot_id: slot.id, recipe_id: remove ? null : recipeId, revision: slot.revision }, idempotent: true });
      toast(remove ? 'Dag leeggemaakt' : 'Gerecht ingepland — bevestig het op de dag zelf');
      router.refresh();
    } catch (e) { setError((e as ClientApiError).message); } finally { setBusy(false); }
  }

  return (
    <details className="check-section">
      <summary className="block-label" style={{ cursor: 'pointer' }}>Zelf een gerecht kiezen</summary>
      <label className="field"><span>Dag</span>
        <select className="text-input" value={slotId} onChange={(e) => setSlotId(e.target.value)}>{slots.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
      </label>
      <label className="field"><span>Gerecht</span>
        <select className="text-input" value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
          <option value="">Kies een gerecht…</option>
          {recipes.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.minutes} min</option>)}
        </select>
        <small>Gerechten die niet passen bij een harde beperking worden geweigerd.</small>
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="action-row">
        <button className="btn btn-primary" onClick={() => save(false)} disabled={busy || !recipeId}>Inplannen</button>
        <SecondaryButton onClick={() => save(true)} disabled={busy}>Dag leegmaken</SecondaryButton>
      </div>
    </details>
  );
}
