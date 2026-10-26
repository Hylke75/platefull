'use client';
// S-08 Smaakprofiel: zachte voorkeuren (ook door kind op gedeeld toestel) en een visueel én technisch gescheiden blok harde beperkingen.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/components/app/AppShell';
import { FamilyAvatar, SafeNote, SubHeader, Switch, TasteChip } from '@/components/ui/phone-ui';
import { TASTE_CARDS, TASTE_CHOICES } from '@/domain/catalog/taste-cards';
import { ALLERGEN_CODES, ALLERGEN_LABELS, DIET_LABELS, STRICT_DIETS, type ProfileRule } from '@/domain/types';
import { api, type ClientApiError } from '@/lib/client-api';
import type { ProfileRow } from '@/server/repo';

const ROLE: Record<string, string> = { adult: 'Volwassene', teen16: 'Gezinslid 16+', child: 'Kind' };

export function TasteProfileClient({ profile, rules, healthConsent, ingredients }: { profile: ProfileRow; rules: ProfileRule[]; healthConsent: boolean; ingredients: { id: string; name: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const soft = rules.filter((r) => !r.severity.startsWith('HARD'));
  const hard = rules.filter((r) => r.severity.startsWith('HARD'));
  const [prefs, setPrefs] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const c of TASTE_CARDS) {
      const r = soft.find((x) => x.targetType === c.targetType && x.targetId === c.targetId && x.preparation === c.preparation);
      if (r) m[c.key] = r.severity;
    }
    return m;
  });
  const [childMode, setChildMode] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hardType, setHardType] = useState<'allergen' | 'diet' | 'ingredient'>('allergen');
  const [hardTarget, setHardTarget] = useState<string>('nuts');
  const [hardSeverity, setHardSeverity] = useState<'HARD_ALLERGY' | 'HARD_MEDICAL'>('HARD_ALLERGY');
  const [consentChecked, setConsentChecked] = useState(false);

  async function savePrefs() {
    setBusy(true); setError(null);
    // Onbekende items buiten de kaarten (bijv. via API) blijven behouden.
    const extra = soft.filter((r) => !TASTE_CARDS.some((c) => c.targetType === r.targetType && c.targetId === r.targetId && c.preparation === r.preparation));
    const rulesBody = [
      ...extra.map((r) => ({ target_type: r.targetType, target_id: r.targetId, preparation: r.preparation, severity: r.severity })),
      ...TASTE_CARDS.filter((c) => prefs[c.key]).map((c) => ({ target_type: c.targetType, target_id: c.targetId, preparation: c.preparation, severity: prefs[c.key] })),
    ];
    try {
      await api(`/profiles/${profile.id}/preferences`, { method: 'PUT', body: { rules: rulesBody, source: childMode ? 'child_shared_device' : 'adult' } });
      setDirty(false); toast('Smaakprofiel bewaard'); router.refresh();
    } catch (e) { setError((e as ClientApiError).message); } finally { setBusy(false); }
  }

  async function toggleParent() {
    try {
      await api(`/profiles/${profile.id}`, { method: 'PATCH', body: { parent_decides: !profile.parent_decides } });
      toast(!profile.parent_decides ? 'Ouderlijke regie ingeschakeld' : 'Ouderlijke regie aangepast');
      router.refresh();
    } catch (e) { setError((e as ClientApiError).message); }
  }

  async function addHard() {
    setBusy(true); setError(null);
    try {
      if (!healthConsent) {
        if (!consentChecked) { setError('Geef eerst toestemming voor het vastleggen van gezondheidsgegevens.'); return; }
        await api('/privacy/consents', { method: 'PUT', body: { purpose: 'health_data', granted: true } });
      }
      const body = hardType === 'diet' ? { target_type: 'diet', target_id: hardTarget, severity: 'HARD_DIET' } : { target_type: hardType, target_id: hardTarget, severity: hardSeverity };
      const res = await api<{ blocked_slots: number }>(`/profiles/${profile.id}/hard-rules`, { body });
      toast(res.blocked_slots ? `Vastgelegd — ${res.blocked_slots} geplande maaltijd(en) moeten worden aangepast` : 'Harde beperking vastgelegd');
      router.refresh();
    } catch (e) { setError((e as ClientApiError).message); } finally { setBusy(false); }
  }

  async function removeHard(id: string) {
    if (!confirm('Deze harde beperking verwijderen?')) return;
    try { await api(`/hard-rules/${id}`, { method: 'DELETE' }); router.refresh(); } catch (e) { setError((e as ClientApiError).message); }
  }

  async function setNoneKnown() {
    try {
      if (!healthConsent) {
        if (!consentChecked) { setError('Geef eerst toestemming voor het vastleggen van gezondheidsgegevens.'); return; }
        await api('/privacy/consents', { method: 'PUT', body: { purpose: 'health_data', granted: true } });
      }
      await api(`/profiles/${profile.id}`, { method: 'PATCH', body: { restrictions_status: 'none' } });
      router.refresh();
    } catch (e) { setError((e as ClientApiError).message); }
  }

  const hardLabel = (r: ProfileRule) => r.targetType === 'allergen' ? ALLERGEN_LABELS[r.targetId as keyof typeof ALLERGEN_LABELS] : r.targetType === 'diet' ? DIET_LABELS[r.targetId as keyof typeof DIET_LABELS] : ingredients.find((i) => i.id === r.targetId)?.name ?? r.targetId;
  const groups = [['ingredient', 'Ingrediënten'], ['gerecht', 'Gerechten'], ['bereiding', 'Bereidingsvorm']] as const;
  const isChild = profile.age_band !== 'adult';

  return (
    <div className="app-view">
      <SubHeader title="PERSOONLIJK SMAAKPROFIEL" backHref="/app/gezin" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, margin: '2px 0 15px' }}>
        <FamilyAvatar color={profile.avatar} initial={profile.display_name.slice(0, 1).toUpperCase()} style={{ width: 59, height: 59, fontSize: 18 }} />
        <div><h2 className="app-title" style={{ margin: 0 }}>{profile.display_name}</h2><div className="little-label">{ROLE[profile.age_band]}</div></div>
      </div>
      <div className="family-banner"><span className="family-banner-icon">✳</span><span><strong>Zo kent Plateful {profile.display_name}</strong><small>Voorkeuren kun je altijd aanpassen.</small></span></div>

      {isChild ? (
        <label className="taste-row" style={{ cursor: 'pointer' }}><span>{profile.display_name} vult zelf in (gedeeld toestel)</span><input type="checkbox" checked={childMode} onChange={(e) => setChildMode(e.target.checked)} /></label>
      ) : null}

      {groups.map(([g, title]) => (
        <div key={g}>
          <div className="person-section-title">{title}</div>
          {TASTE_CARDS.filter((c) => c.group === g).map((c) => {
            const hardHit = hard.some((h) => h.targetType === c.targetType && h.targetId === c.targetId);
            return (
              <div key={c.key} className="taste-row" style={{ flexWrap: 'wrap' }}>
                <span>{c.label}</span>
                {hardHit ? <TasteChip type="strict">Harde beperking</TasteChip> : (
                  <select aria-label={`${c.label}: voorkeur`} className="taste-status" value={prefs[c.key] ?? ''} onChange={(e) => { setPrefs((p) => ({ ...p, [c.key]: e.target.value })); setDirty(true); }}
                    style={{ border: 0 }}>
                    <option value="">—</option>
                    {TASTE_CHOICES.map((t) => <option key={t.severity} value={t.severity}>{t.label}</option>)}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {dirty ? <button className="btn btn-primary btn-wide" style={{ marginTop: 12 }} onClick={savePrefs} disabled={busy}>Voorkeuren bewaren</button> : null}

      {isChild ? (
        <div className="parent-toggle">
          <span><b>Ouder beslist over de maaltijd</b><small>De mening van je kind blijft bewaard.</small></span>
          <Switch on={profile.parent_decides} onToggle={toggleParent} label="Ouderlijke regie in- of uitschakelen" />
        </div>
      ) : null}

      <div className="hard-section" aria-labelledby="hard-title">
        <h3 id="hard-title">Harde beperkingen — nooit overrulen</h3>
        <p>Allergieën, medisch noodzakelijke uitsluitingen en strikte diëten. Ouderlijke regie verandert deze nooit. Status: {profile.restrictions_status === 'unknown' ? 'nog niet bekend' : profile.restrictions_status === 'none' ? 'geen bekende beperkingen' : 'vastgelegd'}.</p>
        {hard.map((r) => (
          <div key={r.id} className="taste-row"><span>{hardLabel(r)}</span><span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><TasteChip type="strict">{r.severity === 'HARD_ALLERGY' ? 'Allergie' : r.severity === 'HARD_MEDICAL' ? 'Medisch' : 'Dieet'}</TasteChip><button className="choice" onClick={() => removeHard(r.id)} aria-label={`${hardLabel(r)} verwijderen`}>×</button></span></div>
        ))}
        {childMode ? <p>Harde beperkingen kunnen alleen door een volwassene worden gewijzigd.</p> : (
          <>
            <div className="choice-row" style={{ marginTop: 8 }}>
              {([['allergen', 'Allergeen'], ['ingredient', 'Ingrediënt'], ['diet', 'Strikt dieet']] as const).map(([k, l]) => (
                <button key={k} type="button" className="choice strict" aria-pressed={hardType === k} onClick={() => { setHardType(k); setHardTarget(k === 'allergen' ? 'nuts' : k === 'diet' ? 'vegetarian' : ingredients[0]?.id ?? ''); }}>{l}</button>
              ))}
            </div>
            <label className="field" style={{ marginTop: 8 }}><span>Welke?</span>
              <select className="text-input" value={hardTarget} onChange={(e) => setHardTarget(e.target.value)}>
                {hardType === 'allergen' ? ALLERGEN_CODES.map((a) => <option key={a} value={a}>{ALLERGEN_LABELS[a]}</option>)
                  : hardType === 'diet' ? STRICT_DIETS.map((d) => <option key={d} value={d}>{DIET_LABELS[d]}</option>)
                  : ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </label>
            {hardType !== 'diet' ? (
              <div className="choice-row">
                <button type="button" className="choice strict" aria-pressed={hardSeverity === 'HARD_ALLERGY'} onClick={() => setHardSeverity('HARD_ALLERGY')}>Allergie</button>
                <button type="button" className="choice strict" aria-pressed={hardSeverity === 'HARD_MEDICAL'} onClick={() => setHardSeverity('HARD_MEDICAL')}>Medisch</button>
              </div>
            ) : null}
            {!healthConsent ? (
              <label className="field" style={{ marginTop: 10 }}>
                <span><input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} /> Ik geef als volwassene toestemming</span>
                <small>Plateful bewaart allergieën en medische uitsluitingen alleen om maaltijden met dat ingrediënt uit te sluiten. Ze blijven bewaard tot je ze verwijdert of je toestemming intrekt (Instellingen); dan worden ze direct gewist.</small>
              </label>
            ) : null}
            <div className="action-row">
              <button className="btn btn-primary" onClick={addHard} disabled={busy}>Vastleggen</button>
              {profile.restrictions_status === 'unknown' && !hard.length ? <button className="btn btn-plain" onClick={setNoneKnown}>Geen bekende allergieën</button> : null}
            </div>
          </>
        )}
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <SafeNote>♡ Een ouderkeuze verandert alleen het menu, nooit een geregistreerde allergie of de smaakvoorkeur van een kind. Plateful is geen medisch hulpmiddel.</SafeNote>
      <a className="btn btn-plain btn-wide" style={{ marginTop: 12 }} href="/app/gezin">← Alle gezinsleden</a>
    </div>
  );
}
