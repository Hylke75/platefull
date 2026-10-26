// S-05 Plan B: scenario → 'Voorstel bekijken' (diff, geen side-effects) → 'Pas het menu aan' (atomair) → ongedaan maken.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { planBApply, planBPreview, undoSlot } from '@shared/core/planning';
import type { PlanBScenario } from '@shared/domain/planb';
import { dayView, slotRecipeView } from '@shared/core/views';
import { ScreenScroll } from '@/components/ScreenScroll';
import { BlockLabel, Button, Chip, ChipRow, Field, FormError, SafeNote, SubHeader, Tip, glyph, s } from '@/components/ui';
import { idemKey, toUiError } from '@/lib/errors';
import { useCore } from '@/lib/session';
import { useToast } from '@/lib/toast';
import { useLoad } from '@/lib/use-load';
import { colors, fonts } from '@/theme';

type Kind = PlanBScenario['kind'];
const OPTIONS: [Kind, string, string][] = [
  ['less_time', '◷', 'Minder tijd'],
  ['attendee_absent', '↗', 'Iemand eet niet mee'],
  ['ingredient_missing', '▤', 'Iets ontbreekt'],
  ['taste_conflict', '♡', 'Kind lust het niet'],
];

type Preview = Awaited<ReturnType<typeof planBPreview>>;

export default function PlanB() {
  const ctx = useCore();
  const toast = useToast();
  const params = useLocalSearchParams<{ slot?: string }>();
  const { data } = useLoad(useCallback(async () => {
    const slotId = params.slot ?? (await dayView(ctx)).slot.id;
    return slotRecipeView(ctx, slotId);
  }, [ctx, params.slot]));
  const [kind, setKind] = useState<Kind>('less_time');
  const [minutes, setMinutes] = useState('15');
  const [absent, setAbsent] = useState<string[]>([]);
  const [ingredient, setIngredient] = useState<string | null>(null);
  const [child, setChild] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idem] = useState(idemKey);

  if (!data) return <ScreenScroll><SubHeader title="SLIM PLAN B" onBack={() => router.back()} /></ScreenScroll>;
  const names = new Map(data.bundle.profiles.map((p) => [p.id, p.display_name]));
  const eaters = data.attendees.filter((a) => a.attendance !== 'no' && a.profileId).map((a) => ({ id: a.profileId!, name: names.get(a.profileId!) ?? '' }));
  const kids = data.bundle.profiles.filter((p) => p.age_band !== 'adult').map((p) => ({ id: p.id, name: p.display_name }));
  const ingredients = data.recipe.ingredients.map((i) => ({ id: i.ingredientId, name: data.bundle.catalog.get(i.ingredientId)?.canonicalName ?? i.ingredientId }));
  const ing = ingredient ?? ingredients[0]?.id ?? '';
  const who = child ?? kids[0]?.id ?? eaters[0]?.id ?? '';

  const scenario = (): PlanBScenario => {
    switch (kind) {
      case 'less_time': return { kind, availableMinutes: Math.max(5, Math.min(240, Number(minutes) || 15)) };
      case 'attendee_absent': return { kind, profileIds: absent };
      case 'ingredient_missing': return { kind, ingredientId: ing };
      case 'taste_conflict': return { kind, profileId: who, ingredientId: ing };
    }
  };
  const valid = kind !== 'attendee_absent' || absent.length > 0;
  const reset = () => setPreview(null);

  async function calculate() {
    setBusy(true); setError(null); setPreview(null);
    try { setPreview(await planBPreview(ctx, data!.slot.id, scenario(), text || null)); } catch (e) { setError(toUiError(e).message); } finally { setBusy(false); }
  }

  async function apply() {
    if (!preview) return;
    setBusy(true); setError(null);
    try {
      const res = await planBApply(ctx, data!.slot.id, preview.revision, idem, scenario(), text || null);
      toast('Je maaltijdplan is aangepast', {
        label: 'Maak ongedaan',
        run: () => { undoSlot(ctx, data!.slot.id, res.revision, idemKey()).then(() => toast('Wijziging ongedaan gemaakt')).catch((e) => toast(toUiError(e).message)); },
      });
      router.navigate({ pathname: '/vandaag', params: { datum: data!.slot.local_date } });
    } catch (e) {
      const u = toUiError(e);
      setError(u.code === 'revision_conflict' ? 'Het menu is intussen gewijzigd. Bekijk het voorstel opnieuw.' : u.message);
      if (u.code === 'revision_conflict') setPreview(null);
    } finally { setBusy(false); }
  }

  const ok = preview?.outcome.status === 'ok' ? preview.outcome : null;
  const delta = preview?.shoppingDelta;

  return (
    <ScreenScroll>
      <SubHeader title="SLIM PLAN B" onBack={() => router.back()} />
      <View style={{ backgroundColor: colors.orange, borderRadius: 24, paddingVertical: 22, paddingHorizontal: 18, overflow: 'hidden', marginBottom: 20 }}>
        <Text style={{ position: 'absolute', right: -15, top: -37, fontSize: 140, color: '#fffcfb2c' }}>{glyph('✳')}</Text>
        <Text style={{ fontSize: 10, fontFamily: fonts.body800, letterSpacing: 1.2, color: '#ffffff88' }}>{glyph('✳')} GEEN STRESS, WIJ DENKEN MEE</Text>
        <Text style={{ fontFamily: fonts.display600, fontSize: 31, lineHeight: 33.8, maxWidth: 240, marginTop: 10, marginBottom: 9, letterSpacing: -0.7, color: colors.white }}>Oeps, plannen veranderd?</Text>
        <Text style={{ fontSize: 11, lineHeight: 17.6, maxWidth: 250, color: '#FFFCE7', fontFamily: fonts.body400 }}>Vertel ons wat er speelt. We zoeken de makkelijkste aanpassing voor {data.recipe.name.toLowerCase()}.</Text>
      </View>
      <BlockLabel>Wat is er veranderd?</BlockLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {OPTIONS.map(([id, ico, lab]) => (
          <Pressable key={id} onPress={() => { setKind(id); reset(); }} accessibilityRole="button" accessibilityState={{ selected: id === kind }}
            style={{ width: '48%', flexGrow: 1, backgroundColor: id === kind ? colors.scenarioSelected : colors.white, borderWidth: 1.5, borderColor: id === kind ? colors.orange : colors.scenarioBorder, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, minHeight: 85, gap: 7 }}>
            <Text style={{ fontSize: 20, color: colors.forestDark }}>{glyph(ico)}</Text>
            <Text style={{ fontSize: 11, fontFamily: fonts.body800, color: colors.forestDark }}>{lab}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ marginTop: 14 }}>
        {kind === 'less_time' ? (
          <Field label="Hoeveel minuten heb je?" value={minutes} onChangeText={(v) => { setMinutes(v); reset(); }} keyboardType="number-pad" hint={`Nu: ${data.recipe.totalMinutes} minuten.`} />
        ) : kind === 'attendee_absent' ? (
          <><BlockLabel>Wie eet er niet mee?</BlockLabel><ChipRow>{eaters.map((e) => <Chip key={e.id} label={e.name} selected={absent.includes(e.id)} onPress={() => { setAbsent((a) => (a.includes(e.id) ? a.filter((x) => x !== e.id) : [...a, e.id])); reset(); }} />)}</ChipRow></>
        ) : (
          <>
            {kind === 'taste_conflict' ? <><BlockLabel>Wie?</BlockLabel><ChipRow>{(kids.length ? kids : eaters).map((k) => <Chip key={k.id} label={k.name} selected={who === k.id} onPress={() => { setChild(k.id); reset(); }} />)}</ChipRow></> : null}
            <BlockLabel>{kind === 'ingredient_missing' ? 'Wat ontbreekt er?' : 'Wat lust die niet?'}</BlockLabel>
            <ChipRow>{ingredients.map((i) => <Chip key={i.id} label={i.name} selected={ing === i.id} onPress={() => { setIngredient(i.id); reset(); }} />)}</ChipRow>
          </>
        )}
      </View>
      <BlockLabel>Nog iets? <Text style={{ fontFamily: fonts.body500, color: '#A3AFA3' }}>(optioneel)</Text></BlockLabel>
      <TextInput value={text} onChangeText={setText} maxLength={500} multiline placeholder="Bijv. ik moet over 20 minuten weg..." placeholderTextColor={colors.placeholder} style={[s.textInput, { minHeight: 60, fontSize: 12, textAlignVertical: 'top' }]} accessibilityLabel="Toelichting (optioneel)" />
      <SafeNote>Je toelichting is alleen context. Allergieën en medische regels blijven altijd gelden.</SafeNote>
      <Button wide variant="orange" style={{ marginTop: 10 }} onPress={calculate} disabled={!valid} busy={busy && !preview}>{glyph('✳')} Voorstel bekijken →</Button>
      {error ? <FormError>{error}</FormError> : null}
      {ok && preview ? (
        <View style={{ backgroundColor: colors.matchPanel, borderWidth: 1, borderColor: colors.outputBorder, borderRadius: 17, padding: 15, marginTop: 13 }}>
          <Text style={[s.eyeline, { color: colors.outputEyeline }]}>{glyph('✳')} DIT KUNNEN WE DOEN</Text>
          <Text style={{ fontFamily: fonts.display600, fontSize: 21, lineHeight: 25, color: colors.forest, marginVertical: 8 }}>{ok.title}</Text>
          <Text style={{ fontSize: 11, color: colors.outputText, lineHeight: 18, marginBottom: 12, fontFamily: fonts.body400 }}>{ok.explanation}</Text>
          <View style={{ gap: 6, marginVertical: 10 }}>
            {ok.diff.eaters ? <Diff label="Eters" value={`${ok.diff.eaters.from} → ${ok.diff.eaters.to}`} /> : null}
            {ok.diff.minutes ? <Diff label="Tijd" value={`${ok.diff.minutes.from} → ${ok.diff.minutes.to} min`} /> : null}
            {ok.diff.recipe ? <Diff label="Gerecht" value={`${ok.diff.recipe.fromName} → ${ok.diff.recipe.toName}`} /> : null}
            {ok.diff.substitutions?.map((x) => <Diff key={x.from} label="Vervanging" value={`${x.fromName} → ${x.toName}`} />)}
            {ok.diff.servedSeparately?.map((x) => <Diff key={x.ingredientId} label="Apart" value={x.name} />)}
            {delta && delta.added + delta.removed + delta.changed > 0 ? <Diff label="Boodschappen" value={[delta.added && `+${delta.added}`, delta.removed && `−${delta.removed}`, delta.changed && `${delta.changed} gewijzigd`].filter(Boolean).join(' · ')} /> : null}
          </View>
          {ok.bullets.map((b) => <Text key={b} style={{ fontSize: 11, color: colors.outputList, marginBottom: 5, fontFamily: fonts.body400 }}><Text style={{ color: '#56A477' }}>✓ </Text>{b}</Text>)}
          <Button wide onPress={apply} busy={busy} style={{ marginTop: 8 }}>✓ Pas het menu aan</Button>
        </View>
      ) : preview ? (
        <Tip title={preview.outcome.status === 'no_change_needed' ? 'Niets aan te passen' : 'Dit lukt niet betrouwbaar'}>{preview.outcome.explanation}</Tip>
      ) : null}
    </ScreenScroll>
  );
}

function Diff({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, backgroundColor: colors.white, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 }}>
      <Text style={{ fontSize: 11, color: colors.outputList, fontFamily: fonts.body400 }}>{label}</Text>
      <Text style={{ fontSize: 11, color: colors.forest, fontFamily: fonts.body800, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}
