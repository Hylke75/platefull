// S-02 Onboarding: O-03 t/m O-08. Overslaan mag; voortgang staat in households.onboarding_step.
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { savePreferences } from '@shared/core/actions';
import { CONSENT_VERSIONS } from '@shared/core/constants';
import { loadHousehold, loadProfiles, loadRules, type HouseholdRow, type ProfileRow } from '@shared/core/repo';
import { TASTE_CARDS, TASTE_CHOICES } from '@shared/domain/catalog/taste-cards';
import { ALLERGEN_CODES, ALLERGEN_LABELS, DIET_LABELS, STRICT_DIETS, type ProfileRule } from '@shared/domain/types';
import { ScreenScroll } from '@/components/ScreenScroll';
import {
  ActionRow, AppHeader, AppTitle, Avatar, Button, Checkbox, Chip, ChipRow, Eyeline, Field, FormError, HardSection, HardText, SafeNote, Subtitle, s,
} from '@/components/ui';
import { toUiError } from '@/lib/errors';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

type Step = 'household' | 'people' | 'restrictions' | 'tastes' | 'context';
const ORDER: Step[] = ['household', 'people', 'restrictions', 'tastes', 'context'];
const BANDS = [['adult', 'Volwassene'], ['teen16', '16+'], ['child', '0–15']] as const;

interface Data { household: HouseholdRow; profiles: ProfileRow[]; rules: ProfileRule[]; healthConsent: boolean }

export default function Onboarding() {
  const { session, refreshHousehold } = useSession();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [step, setStep] = useState<Step>('household');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const userId = session?.user.id ?? '';

  const load = useCallback(async (hid: string) => {
    const [household, profiles, rules, consent] = await Promise.all([
      loadHousehold(supabase, hid), loadProfiles(supabase, hid), loadRules(supabase, hid),
      supabase.from('consents').select('id').eq('household_id', hid).eq('purpose', 'health_data').is('withdrawn_at', null).maybeSingle(),
    ]);
    setData({ household, profiles, rules, healthConsent: !!consent.data });
    return household;
  }, []);

  // Een huishouden aangemaakt maar onboarding niet afgemaakt? Ga verder waar je was.
  useEffect(() => {
    if (!userId) return;
    supabase.from('household_accounts').select('household_id').eq('auth_user_id', userId).eq('status', 'active').maybeSingle().then(async ({ data: acc }) => {
      if (!acc?.household_id) return;
      setHouseholdId(acc.household_id as string);
      const h = await load(acc.household_id as string);
      setStep(ORDER.includes(h.onboarding_step as Step) && h.onboarding_step !== 'household' ? (h.onboarding_step as Step) : 'people');
    });
  }, [userId, load]);

  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error && !(e as { code?: string }).code && e.message.startsWith('Geef') ? e.message : toUiError(e).message); } finally { setBusy(false); }
  };

  async function go(next: Step | 'done') {
    if (householdId) await supabase.from('households').update({ onboarding_step: next }).eq('id', householdId);
    if (next === 'done') { await refreshHousehold(); router.replace('/vandaag'); return; }
    setStep(next);
    if (householdId) await load(householdId);
  }

  const ctx = householdId ? { supabase, householdId, userId } : null;

  return (
    <ScreenScroll>
      <AppHeader initials={data?.household.name.slice(0, 2).toUpperCase()} />
      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 16 }} accessibilityLabel={`Stap ${ORDER.indexOf(step) + 1} van ${ORDER.length + 1}`}>
        {[...ORDER, 'first'].map((x, i) => <View key={x} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: i <= ORDER.indexOf(step) ? colors.forest : colors.banner }} />)}
      </View>

      {step === 'household' ? (
        <HouseholdStep busy={busy} onSubmit={(name, diners) => wrap(async () => {
          const { data: hid, error: e } = await supabase.rpc('create_household', { p_name: name, p_usual_diners: diners, p_terms_version: CONSENT_VERSIONS.terms });
          if (e) throw e;
          setHouseholdId(hid as string);
          await load(hid as string);
          setStep('people');
        })} />
      ) : null}

      {step === 'people' && data && ctx ? (
        <PeopleStep data={data} busy={busy} onAdd={(name, band) => wrap(async () => {
          const { error: e } = await supabase.from('profiles').insert({ household_id: ctx.householdId, display_name: name, age_band: band, avatar: `p${(data.profiles.length % 4) + 1}` });
          if (e) throw e;
          await load(ctx.householdId);
        })} onNext={() => go('restrictions')} />
      ) : null}

      {step === 'restrictions' && data && ctx ? (
        <RestrictionsStep data={data} wrap={wrap} reload={() => load(ctx.householdId).then(() => undefined)} onNext={() => go('tastes')} />
      ) : null}

      {step === 'tastes' && data && ctx ? (
        <TastesStep data={data} wrap={wrap} onSave={(pid, rules, source) => savePreferences(ctx, pid, rules, source).then(() => undefined)} onNext={() => go('context')} />
      ) : null}

      {step === 'context' && data && ctx ? (
        <ContextStep data={data} wrap={wrap} onNext={() => go('done')} />
      ) : null}

      {error ? <FormError>{error}</FormError> : null}
    </ScreenScroll>
  );
}

function HouseholdStep({ busy, onSubmit }: { busy: boolean; onSubmit: (name: string, diners: number) => void }) {
  const [name, setName] = useState('');
  const [diners, setDiners] = useState(4);
  const [terms, setTerms] = useState(false);
  const [invite, setInvite] = useState('');
  // Accepteert zowel de app-link (platefull://uitnodiging?token=…), de weblink als de losse code.
  const inviteToken = invite.match(/token=([A-Za-z0-9_-]+)/)?.[1] ?? (/^[A-Za-z0-9_-]{20,}$/.test(invite.trim()) ? invite.trim() : '');
  return (
    <>
      <Eyeline>IEDEREEN ANDERS. SAMEN AAN TAFEL.</Eyeline>
      <AppTitle>Maak jullie{'\n'}tafel aan.</AppTitle>
      <Field label="Hoe heet jullie huishouden? (optioneel)" placeholder="Ons gezin" value={name} onChangeText={setName} maxLength={80} />
      <Text style={s.fieldLabel}>Met hoeveel mensen eten jullie meestal?</Text>
      <ChipRow style={{ marginBottom: 6 }}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <Chip key={n} label={String(n)} selected={diners === n} onPress={() => setDiners(n)} />)}
      </ChipRow>
      <Text style={s.fieldHint}>Elk gezin is anders — er hoeven geen twee ouders te zijn.</Text>
      <Checkbox checked={terms} onToggle={() => setTerms(!terms)} label="Ik ga akkoord met de voorwaarden en het privacybeleid" hint="We bewaren alleen wat nodig is: roepnamen, leeftijdscategorie en voorkeuren. Geen geboortedata, geen advertenties." />
      <Button wide disabled={!terms} busy={busy} onPress={() => onSubmit(name, diners)}>Verder →</Button>
      <Field label="Uitgenodigd door een andere ouder?" placeholder="Plak hier de uitnodiging" value={invite} onChangeText={setInvite} autoCapitalize="none" hint="Gebruik de link of code die je kreeg; je hoeft dan geen nieuw gezin aan te maken." />
      <Button wide variant="plain" disabled={!inviteToken} onPress={() => router.push({ pathname: '/uitnodiging', params: { token: inviteToken } })}>Uitnodiging openen</Button>
    </>
  );
}

function PeopleStep({ data, busy, onAdd, onNext }: { data: Data; busy: boolean; onAdd: (name: string, band: string) => void; onNext: () => void }) {
  const [name, setName] = useState('');
  const [band, setBand] = useState<string>(data.profiles.length ? 'child' : 'adult');
  return (
    <>
      <Eyeline>WIE ZITTEN ER AAN TAFEL?</Eyeline>
      <AppTitle>Iedereen een{'\n'}eigen plek.</AppTitle>
      <Subtitle>Alleen een roepnaam en leeftijdscategorie. Dubbele namen mogen.</Subtitle>
      {data.profiles.map((p) => (
        <View key={p.id} style={s.familyPerson}>
          <Avatar color={p.avatar} initial={p.display_name.slice(0, 1).toUpperCase()} />
          <View><Text style={s.personName}>{p.display_name}</Text><Text style={s.personSub}>{BANDS.find((b) => b[0] === p.age_band)?.[1]}</Text></View>
        </View>
      ))}
      <Field label="Roepnaam" value={name} onChangeText={setName} maxLength={40} />
      <ChipRow style={{ marginBottom: 10 }}>{BANDS.map(([k, l]) => <Chip key={k} label={l} selected={band === k} onPress={() => setBand(k)} />)}</ChipRow>
      <Button wide variant="plain" disabled={!name.trim()} busy={busy} onPress={() => { onAdd(name.trim(), band); setName(''); setBand('child'); }}>+ Toevoegen</Button>
      <Button wide style={{ marginTop: 12 }} disabled={!data.profiles.length} onPress={onNext}>Verder →</Button>
    </>
  );
}

function RestrictionsStep({ data, wrap, reload, onNext }: { data: Data; wrap: (fn: () => Promise<void>) => Promise<void>; reload: () => Promise<void>; onNext: () => void }) {
  const [consent, setConsent] = useState(data.healthConsent);
  const [sel, setSel] = useState<Record<string, { allergens: string[]; diet: string | null }>>({});
  const hardOf = (pid: string) => data.rules.filter((r) => r.profileId === pid && r.severity.startsWith('HARD'));
  async function ensureConsent() {
    if (!consent) throw new Error('Geef eerst toestemming hieronder.');
    if (!data.healthConsent) {
      const { error } = await supabase.rpc('grant_health_consent', { p_version: CONSENT_VERSIONS.health });
      if (error) throw error;
    }
  }
  const save = (pid: string, none: boolean) => wrap(async () => {
    await ensureConsent();
    if (none) {
      const { error } = await supabase.rpc('set_restrictions_status', { p_profile_id: pid, p_status: 'none' });
      if (error) throw error;
    } else {
      const x = sel[pid] ?? { allergens: [], diet: null };
      for (const a of x.allergens) {
        const { error } = await supabase.rpc('add_hard_rule', { p_profile_id: pid, p_target_type: 'allergen', p_target_id: a, p_severity: 'HARD_ALLERGY' });
        if (error) throw error;
      }
      if (x.diet) {
        const { error } = await supabase.rpc('add_hard_rule', { p_profile_id: pid, p_target_type: 'diet', p_target_id: x.diet, p_severity: 'HARD_DIET' });
        if (error) throw error;
      }
      setSel((v) => ({ ...v, [pid]: { allergens: [], diet: null } }));
    }
    await reload();
  });
  return (
    <>
      <Eyeline>WAT MAG NOOIT OP TAFEL?</Eyeline>
      <AppTitle>Allergieën en{'\n'}strikte diëten.</AppTitle>
      <HardSection title="Dit is iets anders dan ‘niet lekker’">
        <HardText>Hier leg je alleen allergieën, medisch noodzakelijke uitsluitingen en strikte diëten vast. Die worden nooit overruled. ‘Nog niet bekend’ betekent onbekend — nooit ‘geen allergie’.</HardText>
      </HardSection>
      {data.profiles.map((p) => {
        const x = sel[p.id] ?? { allergens: [], diet: null };
        const hard = hardOf(p.id);
        const status = p.restrictions_status === 'unknown' ? 'nog niet bekend' : p.restrictions_status === 'none' ? 'geen bekende beperkingen'
          : hard.map((h) => (h.targetType === 'allergen' ? ALLERGEN_LABELS[h.targetId as keyof typeof ALLERGEN_LABELS] : DIET_LABELS[h.targetId as keyof typeof DIET_LABELS] ?? h.targetId)).join(', ');
        return (
          <View key={p.id} style={[s.familyPerson, { flexDirection: 'column', alignItems: 'stretch', marginTop: 8 }]}>
            <Text style={s.personName}>{p.display_name} <Text style={s.personRole}>· {status}</Text></Text>
            <ChipRow style={{ marginTop: 8 }}>{ALLERGEN_CODES.map((a) => (
              <Chip key={a} strict label={ALLERGEN_LABELS[a]} selected={x.allergens.includes(a)} onPress={() => setSel((v) => ({ ...v, [p.id]: { ...x, allergens: x.allergens.includes(a) ? x.allergens.filter((y) => y !== a) : [...x.allergens, a] } }))} />
            ))}</ChipRow>
            <ChipRow style={{ marginTop: 6 }}>{STRICT_DIETS.map((d) => (
              <Chip key={d} strict label={DIET_LABELS[d]} selected={x.diet === d} onPress={() => setSel((v) => ({ ...v, [p.id]: { ...x, diet: x.diet === d ? null : d } }))} />
            ))}</ChipRow>
            <ActionRow>
              <Button disabled={!x.allergens.length && !x.diet} onPress={() => save(p.id, false)}>Vastleggen</Button>
              {p.restrictions_status === 'unknown' && !hard.length ? <Button variant="plain" onPress={() => save(p.id, true)}>Geen bekende</Button> : null}
            </ActionRow>
          </View>
        );
      })}
      <Checkbox checked={consent} disabled={data.healthConsent} onToggle={() => setConsent(!consent)} label="Ik geef als volwassene toestemming voor het vastleggen van deze gezondheidsgegevens"
        hint="Doel: maaltijden met deze ingrediënten uitsluiten. Bewaartermijn: tot je ze verwijdert of je toestemming intrekt; dan worden ze direct gewist. Plateful is geen medisch hulpmiddel en kan kruisbesmetting niet uitsluiten." />
      <Button wide onPress={onNext}>Verder →</Button>
      <SafeNote>Je kunt dit altijd later aanvullen via Gezin.</SafeNote>
    </>
  );
}

function TastesStep({ data, wrap, onSave, onNext }: { data: Data; wrap: (fn: () => Promise<void>) => Promise<void>; onSave: (pid: string, rules: { target_type: 'ingredient' | 'tag'; target_id: string; preparation: string; severity: string }[], source: 'adult' | 'child_shared_device') => Promise<void>; onNext: () => void }) {
  const [idx, setIdx] = useState(0);
  const [prefs, setPrefs] = useState<Record<string, string>>({});
  const p = data.profiles[idx];
  if (!p) return null;
  const next = () => wrap(async () => {
    const rules = TASTE_CARDS.filter((c) => prefs[c.key]).map((c) => ({ target_type: c.targetType, target_id: c.targetId, preparation: c.preparation, severity: prefs[c.key]! }));
    if (rules.length) await onSave(p.id, rules, p.age_band === 'adult' ? 'adult' : 'child_shared_device');
    setPrefs({});
    if (idx + 1 < data.profiles.length) setIdx(idx + 1); else onNext();
  });
  return (
    <>
      <Eyeline>DIT VIND IK LEKKER</Eyeline>
      <AppTitle>Wat vindt{'\n'}{p.display_name} lekker?</AppTitle>
      <Subtitle>Zo veel of weinig als je wilt.{p.age_band !== 'adult' ? ` ${p.display_name} mag dit zelf invullen.` : ''}</Subtitle>
      {TASTE_CARDS.map((c) => (
        <View key={c.key} style={[s.tasteRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
          <Text style={s.tasteRowText}>{c.label}</Text>
          <ChipRow style={{ marginTop: 6 }}>{TASTE_CHOICES.map((t) => <Chip key={t.severity} label={t.label} selected={prefs[c.key] === t.severity} onPress={() => setPrefs((x) => ({ ...x, [c.key]: x[c.key] === t.severity ? '' : t.severity }))} />)}</ChipRow>
        </View>
      ))}
      <ActionRow>
        <Button onPress={next}>{idx + 1 < data.profiles.length ? 'Volgende persoon →' : 'Verder →'}</Button>
        <Button variant="plain" onPress={onNext}>Overslaan</Button>
      </ActionRow>
    </>
  );
}

function ContextStep({ data, wrap, onNext }: { data: Data; wrap: (fn: () => Promise<void>) => Promise<void>; onNext: () => void }) {
  const h = data.household;
  const [minutes, setMinutes] = useState(String(h.weekday_minutes ?? 30));
  const [weekend, setWeekend] = useState(h.weekend_minutes != null ? String(h.weekend_minutes) : '');
  const [skill, setSkill] = useState(h.skill);
  const [equipment, setEquipment] = useState<string[]>(h.equipment);
  const [budget, setBudget] = useState(h.weekly_budget_cents != null ? String(h.weekly_budget_cents / 100) : '');
  const EQ = [['stove', 'Kookplaat'], ['oven', 'Oven'], ['airfryer', 'Airfryer'], ['microwave', 'Magnetron']] as const;
  return (
    <>
      <Eyeline>PRAKTISCH</Eyeline>
      <AppTitle>Hoeveel tijd{'\n'}hebben jullie?</AppTitle>
      <Field label="Kooktijd doordeweeks (minuten)" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
      <Field label="In het weekend (optioneel)" value={weekend} onChangeText={setWeekend} keyboardType="number-pad" />
      <Text style={s.fieldLabel}>Kookvaardigheid</Text>
      <ChipRow style={{ marginBottom: 14 }}><Chip label="Eenvoudig" selected={skill === 'easy'} onPress={() => setSkill('easy')} /><Chip label="Gemiddeld" selected={skill === 'medium'} onPress={() => setSkill('medium')} /></ChipRow>
      <Text style={s.fieldLabel}>Apparaten</Text>
      <ChipRow style={{ marginBottom: 14 }}>{EQ.map(([k, l]) => <Chip key={k} label={l} selected={equipment.includes(k)} onPress={() => setEquipment((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))} />)}</ChipRow>
      <Field label="Weekbudget in € (optioneel)" value={budget} onChangeText={setBudget} keyboardType="decimal-pad" hint="Zonder betrouwbare prijzen tonen we alleen een indicatie." />
      <Button wide onPress={() => wrap(async () => {
        const num = (v: string) => (v.trim() === '' ? null : Math.max(5, Math.min(240, Math.round(Number(v)))));
        const { error } = await supabase.from('households').update({
          weekday_minutes: num(minutes), weekend_minutes: num(weekend), skill, equipment,
          weekly_budget_cents: budget.trim() === '' ? null : Math.round(Number(budget.replace(',', '.')) * 100),
        }).eq('id', h.id);
        if (error) throw error;
        onNext();
      })}>Laat het eerste voorstel zien →</Button>
    </>
  );
}
