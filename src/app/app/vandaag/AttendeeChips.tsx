'use client';
// 'Wie eet er vanavond mee?' (S-03.1, R-03): ja → nee → onbekend.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, type ClientApiError } from '@/lib/client-api';
import type { AttendeeRow } from '@/server/repo';

const NEXT: Record<string, 'yes' | 'no' | 'unknown'> = { yes: 'no', no: 'unknown', unknown: 'yes' };
const LABEL: Record<string, string> = { yes: 'eet mee', no: 'eet niet mee', unknown: 'nog onbekend' };

export function AttendeeChips({ slotId, revision, attendees, profiles }: {
  slotId: string; revision: number; attendees: AttendeeRow[]; profiles: { id: string; name: string; avatar: string; initial: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = profiles.map((p) => ({ p, a: attendees.find((x) => x.profile_id === p.id) }));

  async function toggle(profileId: string) {
    setBusy(true); setError(null);
    const next = profiles.map((p) => {
      const cur = attendees.find((x) => x.profile_id === p.id)?.attendance ?? 'unknown';
      return { profile_id: p.id, attendance: p.id === profileId ? NEXT[cur]! : cur };
    });
    const guests = attendees.filter((a) => !a.profile_id).map((g) => ({ profile_id: null, guest_label: g.guest_label ?? 'Gast', guest_allergies_known: g.guest_allergies_known, attendance: g.attendance }));
    try {
      await api(`/meal-slots/${slotId}/attendance`, { body: { attendees: [...next, ...guests] }, revision, idempotent: true });
      router.refresh();
    } catch (e) {
      setError((e as ClientApiError).message);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="attendee-chips" aria-label="Wie eet er mee?">
        {rows.map(({ p, a }) => {
          const att = a?.attendance ?? 'unknown';
          return (
            <button key={p.id} type="button" className="attendee-chip" data-att={att} disabled={busy} onClick={() => toggle(p.id)} aria-label={`${p.name} ${LABEL[att]}. Tik om te wijzigen.`}>
              <span className={`person-avatar ${p.avatar}`}>{p.initial}</span>{p.name}{att === 'unknown' ? ' ?' : ''}
            </button>
          );
        })}
        {attendees.filter((x) => !x.profile_id).map((g, i) => (
          <span key={`g${i}`} className="attendee-chip" data-att={g.attendance}><span className="person-avatar p3">G</span>{g.guest_label}{g.guest_allergies_known ? '' : ' · allergieën?'}</span>
        ))}
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
