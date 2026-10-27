// S-08 Smaakprofiel: zachte voorkeuren (ook door kind op gedeeld toestel) en een gescheiden blok harde beperkingen.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { savePreferences } from '@shared/core/actions';
import { CONSENT_VERSIONS } from '@shared/core/constants';
import { loadProfiles, loadRules } from '@shared/core/repo';
import { TASTE_CARDS, TASTE_CHOICES } from '@shared/domain/catalog/taste-cards';
import { ALLERGEN_CODES, ALLERGEN_LABELS, DIET_LABELS, STRICT_DIETS, type ProfileRule } from '@shared/domain/types';
import { ScreenScroll } from '@/components/ScreenScroll';
import {
  ActionRow, AppTitle, Avatar, Banner, Button, Checkbox, Chip, ChipRow, FormError, HardSection, HardText, LittleLabel, ParentToggle, SafeNote, SectionTitle, SubHeader, TasteChip, s,
} from '@/components/ui';
import { toUiError } from '@/lib/errors';
import { useCore } from '@/lib/session';
import { useToast } from '@/lib/toast';
import { useLoad, useLocalCopy } from '@/lib/use-load';

const ROLE: Record<string, string> = { adult: 'Volwassene', teen16: 'Gezinslid 16+', child: 'Kind' };
const CHOICE_TYPE: Record<string, 'like' | 'care' | 'dislike'> = { LIKE: 'like', NEUTRAL: 'like', SOFT_DISLIKE: 'care', STRONG_DISLIKE: 'dislike', UNKNOWN: 'care' };

export default function Smaakprofiel() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ctx = useCore();
  const toast = useToast();
  const { data, reload } = useLoad(useCallback(async () => {
    const [profiles, rules, consent, ingredients] = await Promise.all([
      loadProfiles(ctx.supabase, ctx.householdId, true), loadRules(ctx.supabase, ctx.householdId),
      ctx.supabase.from('consents').select('id').eq('household_id', ctx.householdId).eq('purpose', 'health_data').is('withdrawn_at', null).maybeSingle(),
      ctx.supabase.from('ingredients').select('id, canonical_name').order('canonical_name'),
    ]);
    return { profile: profiles.find((p) => p.id === id) ?? null, rules: rules.filter((r) => r.profileId === id), healthConsent: !!consent.data, ingredients: (ingredients.data ?? []) as { id: string; canonical_name: string }[] };
  }, [ctx, id]));
  const [prefs, setPrefsLocal, dirty] = useLocalCopy(data, (d) => {
    const m: Record<string, string> = {};
    for (const c of TASTE_CARDS) {
      const r = d.rules.find((x) => !x.severity.startsWith('HARD') && x.targetType === c.targetType && x.targetId === c.targetId && x.preparation === c.preparation);
      if (r) m[c.key] = r.severity;
    }
    return m;
  }, {} as Record<string, string>);
  const setPrefs = setPrefsLocal;
  const [childMode, setChildMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hardType, setHardType] = useState<'allergen' | 'diet' | 'ingredient'>('allergen');
  const [hardTarget, setHardTarget] = useState('nuts');
  const [hardSeverity, setHardSeverity] = useState<'HARD_ALLERGY' | 'HARD_MEDICAL'>('HARD_ALLERGY');
  const [consentChecked, setConsentChecked] = useState(false);

  if (!data?.profile) return <ScreenScroll><SubHeader title="PERSOONLIJK SMAAKPROFIEL" onBack={() => router.back()} /></ScreenScroll>;
  const { profile, rules, healthConsent, ingredients } = data;
  const soft = rules.filter((r) => !r.severity.startsWith('HARD'));
  const hard = rules.filter((r) => r.severity.startsWith('HARD'));
  const isChild = profile.age_band !== 'adult';

  const attempt = async (fn: () => Promise<void>) => { setError(null); try { await fn(); await reload(); } catch (e) { setError(e instanceof Error && e.message.startsWith('Geef') ? e.message : toUiError(e).message); } };
  const ensureConsent = async () => {
    if (healthConsent) return;
    if (!consentChecked) throw new Error('Geef eerst toestemming voor het vastleggen van gezondheidsgegevens.');
    const { error: e } = await ctx.supabase.rpc('grant_health_consent', { p_version: CONSENT_VERSIONS.health });
    if (e) throw e;
  };

  const savePrefs = () => attempt(async () => {
    // Items buiten de kaarten (bijv. via web) blijven behouden.
    const extra = soft.filter((r) => !TASTE_CARDS.some((c) => c.targetType === r.targetType && c.targetId === r.targetId && c.preparation === r.preparation));
    await savePreferences(ctx, profile.id, [
      ...extra.map((r) => ({ target_type: r.targetType as 'ingredient' | 'tag', target_id: r.targetId, preparation: r.preparation, severity: r.severity })),
      ...TASTE_CARDS.filter((c) => prefs[c.key]).map((c) => ({ target_type: c.targetType, target_id: c.targetId, preparation: c.preparation, severity: prefs[c.key]! })),
    ], childMode ? 'child_shared_device' : 'adult');
    toast('Smaakprofiel bewaard');
  });

  const addHard = () => attempt(async () => {
    await ensureConsent();
    const args = hardType === 'diet'
      ? { p_profile_id: profile.id, p_target_type: 'diet', p_target_id: hardTarget, p_severity: 'HARD_DIET' }
      : { p_profile_id: profile.id, p_target_type: hardType, p_target_id: hardTarget, p_severity: hardSeverity };
    const { data: res, error: e } = await ctx.supabase.rpc('add_hard_rule', args);
    if (e) throw e;
    const blocked = (res as { blocked_slots?: number } | null)?.blocked_slots ?? 0;
    toast(blocked ? `Vastgelegd — ${blocked} geplande maaltijd(en) moeten worden aangepast` : 'Harde beperking vastgelegd');
  });

  const removeHard = (rule: ProfileRule) => Alert.alert('Verwijderen?', 'Deze harde beperking verwijderen?', [
    { text: 'Annuleren', style: 'cancel' },
    { text: 'Verwijderen', style: 'destructive', onPress: () => void attempt(async () => { const { error: e } = await ctx.supabase.rpc('remove_hard_rule', { p_rule_id: rule.id }); if (e) throw e; }) },
  ]);

  const hardLabel = (r: ProfileRule) => (r.targetType === 'allergen' ? ALLERGEN_LABELS[r.targetId as keyof typeof ALLERGEN_LABELS] : r.targetType === 'diet' ? DIET_LABELS[r.targetId as keyof typeof DIET_LABELS] : ingredients.find((i) => i.id === r.targetId)?.canonical_name ?? r.targetId);
  const targets = hardType === 'allergen' ? ALLERGEN_CODES.map((a) => [a, ALLERGEN_LABELS[a]] as const) : hardType === 'diet' ? STRICT_DIETS.map((d) => [d, DIET_LABELS[d]] as const) : ingredients.map((i) => [i.id, i.canonical_name] as const);

  return (
    <ScreenScroll>
      <SubHeader title="PERSOONLIJK SMAAKPROFIEL" onBack={() => router.back()} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 2, marginBottom: 15 }}>
        <Avatar color={profile.avatar} initial={profile.display_name.slice(0, 1).toUpperCase()} size={59} />
        <View><AppTitle style={{ marginTop: 0, marginBottom: 0 }}>{profile.display_name}</AppTitle><LittleLabel>{ROLE[profile.age_band]}</LittleLabel></View>
      </View>
      <Banner icon="✳" title={`Zo kent Plateful ${profile.display_name}`} sub="Voorkeuren kun je altijd aanpassen." />
      {isChild ? <Checkbox checked={childMode} onToggle={() => setChildMode(!childMode)} label={`${profile.display_name} vult zelf in (gedeeld toestel)`} /> : null}

      {(['ingredient', 'gerecht', 'bereiding'] as const).map((g) => (
        <View key={g}>
          <SectionTitle>{g === 'ingredient' ? 'Ingrediënten' : g === 'gerecht' ? 'Gerechten' : 'Bereidingsvorm'}</SectionTitle>
          {TASTE_CARDS.filter((c) => c.group === g).map((c) => {
            const hardHit = hard.some((h) => h.targetType === c.targetType && h.targetId === c.targetId);
            const cur = prefs[c.key];
            return (
              <View key={c.key} style={[s.tasteRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
                <View style={s.rowBetween}>
                  <Text style={s.tasteRowText}>{c.label}</Text>
                  {hardHit ? <TasteChip type="strict">Harde beperking</TasteChip> : cur ? <TasteChip type={CHOICE_TYPE[cur] ?? 'care'}>{TASTE_CHOICES.find((t) => t.severity === cur)?.label}</TasteChip> : null}
                </View>
                {!hardHit ? (
                  <ChipRow style={{ marginTop: 6 }}>{TASTE_CHOICES.map((t) => <Chip key={t.severity} label={t.label} selected={cur === t.severity} onPress={() => { setPrefs((x) => ({ ...x, [c.key]: x[c.key] === t.severity ? '' : t.severity })); }} />)}</ChipRow>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
      {dirty ? <Button wide style={{ marginTop: 12 }} onPress={savePrefs}>Voorkeuren bewaren</Button> : null}

      {isChild ? (
        <ParentToggle title="Ouder beslist over de maaltijd" sub="De mening van je kind blijft bewaard." on={profile.parent_decides}
          onToggle={() => attempt(async () => {
            const { error: e } = await ctx.supabase.from('profiles').update({ parent_decides: !profile.parent_decides }).eq('id', profile.id);
            if (e) throw e;
            toast(!profile.parent_decides ? 'Ouderlijke regie ingeschakeld' : 'Ouderlijke regie aangepast');
          })} />
      ) : null}

      <HardSection title="Harde beperkingen — nooit overrulen">
        <HardText>Allergieën, medisch noodzakelijke uitsluitingen en strikte diëten. Ouderlijke regie verandert deze nooit. Status: {profile.restrictions_status === 'unknown' ? 'nog niet bekend' : profile.restrictions_status === 'none' ? 'geen bekende beperkingen' : 'vastgelegd'}.</HardText>
        {hard.map((r) => (
          <View key={r.id} style={s.tasteRow}>
            <Text style={[s.tasteRowText, { flex: 1 }]}>{hardLabel(r)}</Text>
            <TasteChip type="strict">{r.severity === 'HARD_ALLERGY' ? 'Allergie' : r.severity === 'HARD_MEDICAL' ? 'Medisch' : 'Dieet'}</TasteChip>
            <Pressable onPress={() => removeHard(r)} accessibilityLabel={`${hardLabel(r)} verwijderen`} hitSlop={8}><Text style={{ fontSize: 16, color: '#8F2C27' }}>×</Text></Pressable>
          </View>
        ))}
        {childMode ? <HardText>Harde beperkingen kunnen alleen door een volwassene worden gewijzigd.</HardText> : (
          <>
            <ChipRow style={{ marginTop: 8 }}>
              {([['allergen', 'Allergeen'], ['ingredient', 'Ingrediënt'], ['diet', 'Strikt dieet']] as const).map(([k, l]) => (
                <Chip key={k} strict label={l} selected={hardType === k} onPress={() => { setHardType(k); setHardTarget(k === 'allergen' ? 'nuts' : k === 'diet' ? 'vegetarian' : ingredients[0]?.id ?? ''); }} />
              ))}
            </ChipRow>
            <ChipRow style={{ marginTop: 8 }}>{targets.map(([k, l]) => <Chip key={k} strict label={l} selected={hardTarget === k} onPress={() => setHardTarget(k)} />)}</ChipRow>
            {hardType !== 'diet' ? (
              <ChipRow style={{ marginTop: 8 }}>
                <Chip strict label="Allergie" selected={hardSeverity === 'HARD_ALLERGY'} onPress={() => setHardSeverity('HARD_ALLERGY')} />
                <Chip strict label="Medisch" selected={hardSeverity === 'HARD_MEDICAL'} onPress={() => setHardSeverity('HARD_MEDICAL')} />
              </ChipRow>
            ) : null}
            {!healthConsent ? (
              <Checkbox checked={consentChecked} onToggle={() => setConsentChecked(!consentChecked)} label="Ik geef als volwassene toestemming"
                hint="Plateful bewaart allergieën en medische uitsluitingen alleen om maaltijden met dat ingrediënt uit te sluiten. Ze blijven bewaard tot je ze verwijdert of je toestemming intrekt (Instellingen); dan worden ze direct gewist." />
            ) : null}
            <ActionRow>
              <Button onPress={addHard}>Vastleggen</Button>
              {profile.restrictions_status === 'unknown' && !hard.length ? (
                <Button variant="plain" onPress={() => attempt(async () => { await ensureConsent(); const { error: e } = await ctx.supabase.rpc('set_restrictions_status', { p_profile_id: profile.id, p_status: 'none' }); if (e) throw e; })}>Geen bekende allergieën</Button>
              ) : null}
            </ActionRow>
          </>
        )}
      </HardSection>
      {error ? <FormError>{error}</FormError> : null}
      <SafeNote>♡ Een ouderkeuze verandert alleen het menu, nooit een geregistreerde allergie of de smaakvoorkeur van een kind. Plateful is geen medisch hulpmiddel.</SafeNote>
    </ScreenScroll>
  );
}
