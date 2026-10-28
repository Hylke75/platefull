// S-11 Kookstand: stappen, timers, geschaalde ingrediënten, afronden met restjes en feedback.
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Platform, Text, View } from 'react-native';
import { completeSlot } from '@shared/core/actions';
import { slotRecipeView } from '@shared/core/views';
import { ScreenScroll } from '@/components/ScreenScroll';
import { ActionRow, AppTitle, Button, Chip, ChipRow, FormError, HardSection, HardText, RecipeStep, SafeNote, SectionTitle, SubHeader, Subtitle, TasteChip, TasteRow, Tip, glyph, s } from '@/components/ui';
import { startCookAlarm, stopCookAlarm } from '@/lib/cook-timer';
import { idemKey, toUiError } from '@/lib/errors';
import { recipeImage } from '@/lib/images';
import { useCore } from '@/lib/session';
import { useToast } from '@/lib/toast';
import { useLoad } from '@/lib/use-load';
import { fonts } from '@/theme';

/** Buiten de component: tijd lezen hoort niet bij renderen. */
const clock = () => Date.now();

const RATINGS = [['repeat', 'Voor herhaling'], ['fine', 'Prima'], ['rather_not', 'Liever anders']] as const;

export default function Koken() {
  useKeepAwake(); // scherm blijft aan tijdens het koken
  const { slotId } = useLocalSearchParams<{ slotId: string }>();
  const ctx = useCore();
  const toast = useToast();
  const { data } = useLoad(useCallback(() => slotRecipeView(ctx, slotId), [ctx, slotId]));
  const [timer, setTimer] = useState<{ step: number; until: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  const [leftovers, setLeftovers] = useState<{ portions: number; storage: 'fridge' | 'freezer' } | null>(null);
  const [ratings, setRatings] = useState<Record<string, 'repeat' | 'fine' | 'rather_not'>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idem] = useState(idemKey);

  useEffect(() => {
    if (!timer) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timer]);

  if (!data) return <ScreenScroll><SubHeader title="SAMEN KOKEN" onBack={() => router.back()} /></ScreenScroll>;
  const { recipe, slot, explanation, ingredients, eaters } = data;
  const variants = recipe.variants.filter((v) => slot.variant_ids.includes(v.id));
  const minutes = recipe.totalMinutes + variants.flatMap((v) => v.changes).reduce((sum, c) => sum + (c.op === 'time' ? c.deltaMinutes : 0), 0);
  const quick = variants.flatMap((v) => v.changes).find((c) => c.op === 'time');
  const remaining = timer ? Math.max(0, Math.round((timer.until - now) / 1000)) : 0;
  const people = data.attendees.filter((a) => a.attendance !== 'no' && a.profileId).map((a) => ({ id: a.profileId!, name: data.bundle.profiles.find((p) => p.id === a.profileId)?.display_name ?? '' }));
  const img = recipeImage(recipe.image);

  function toggleTimer(step: number, title: string, stepMinutes: number) {
    if (timer?.step === step && remaining > 0) {
      setTimer(null);
      void stopCookAlarm();
      return;
    }
    const start = clock();
    setTimer({ step, until: start + stepMinutes * 60_000 });
    setNow(start);
    void startCookAlarm(stepMinutes * 60, title, recipe.name).then((ok) => {
      if (!ok && Platform.OS !== 'web') toast('Zet meldingen voor Platefull aan in Instellingen om een alarm te horen.');
    });
  }

  async function complete() {
    setBusy(true); setError(null);
    try {
      await completeSlot(ctx, slot.id, slot.revision, idem, { leftovers, feedback: Object.entries(ratings).map(([profile_id, rating]) => ({ profile_id, rating })) });
      toast('Gekookt! Eet smakelijk.');
      router.navigate({ pathname: '/vandaag', params: { datum: slot.local_date } });
    } catch (e) { setError(toUiError(e).message); } finally { setBusy(false); }
  }

  return (
    <ScreenScroll>
      <SubHeader title="SAMEN KOKEN" onBack={() => router.back()} />
      <AppTitle>{recipe.name}</AppTitle>
      <Subtitle>{minutes} minuten · {eaters} {eaters === 1 ? 'persoon' : 'personen'} · 1 gezamenlijke maaltijd</Subtitle>
      {img ? <Image source={img} style={{ width: '100%', height: 198, borderRadius: 20 }} contentFit="cover" accessibilityLabel={recipe.name} /> : null}
      {!explanation.safe ? <HardSection title="Niet koken zonder controle">{explanation.blockedReasons.map((r) => <HardText key={r}>{r}</HardText>)}</HardSection> : null}
      {explanation.adaptations.length || quick ? <Tip title="Let op aan tafel">{[...(quick && quick.op === 'time' ? [quick.note] : []), ...explanation.adaptations].join(' · ')}</Tip> : null}
      <SectionTitle>Ingrediënten</SectionTitle>
      {ingredients.map((i, idx) => <TasteRow key={idx} label={`${i.name}${i.optional ? ' · optioneel' : ''}${i.separately ? ' · apart' : ''}`}><TasteChip type="like">{i.amount}</TasteChip></TasteRow>)}
      {recipe.steps.map((st, i) => (
        <RecipeStep key={i} index={i + 1} total={recipe.steps.length} title={st.title} body={st.body} minutes={st.minutes}>
          {st.minutes ? (
            <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
              <Chip label={timer?.step === i ? (remaining > 0 ? `${glyph('◷')} ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')} · stop` : '✓ Tijd!') : `${glyph('◷')} Start timer`}
                onPress={() => toggleTimer(i, st.title, st.minutes!)} />
            </View>
          ) : null}
        </RecipeStep>
      ))}
      {slot.state === 'completed' ? null : !finishing ? (
        <Button wide style={{ marginTop: 14 }} onPress={() => setFinishing(true)}>✓ Gekookt</Button>
      ) : (
        <View style={{ backgroundColor: '#EDF3E8', borderRadius: 17, padding: 15, marginTop: 13 }}>
          <Text style={s.eyeline}>{glyph('✳')} AFRONDEN</Text>
          <Text style={{ fontFamily: fonts.display600, fontSize: 21, color: '#124E43', marginVertical: 8 }}>Restjes over?</Text>
          <ChipRow>
            <Chip label="Nee" selected={!leftovers} onPress={() => setLeftovers(null)} />
            {[1, 2, 3, 4].map((n) => <Chip key={n} label={`${n} ${n === 1 ? 'portie' : 'porties'}`} selected={leftovers?.portions === n} onPress={() => setLeftovers({ portions: n, storage: leftovers?.storage ?? 'fridge' })} />)}
          </ChipRow>
          {leftovers ? (
            <ChipRow style={{ marginTop: 8 }}>
              <Chip label="Koelkast (max. 2 dagen)" selected={leftovers.storage === 'fridge'} onPress={() => setLeftovers({ ...leftovers, storage: 'fridge' })} />
              <Chip label="Vriezer" selected={leftovers.storage === 'freezer'} onPress={() => setLeftovers({ ...leftovers, storage: 'freezer' })} />
            </ChipRow>
          ) : null}
          <Text style={{ fontFamily: fonts.display600, fontSize: 21, color: '#124E43', marginTop: 14 }}>Hoe was het? <Text style={{ fontSize: 12, fontFamily: fonts.body500 }}>(optioneel)</Text></Text>
          {people.map((p) => (
            <View key={p.id} style={{ marginVertical: 8 }}>
              <Text style={s.littleLabel}>{p.name}</Text>
              <ChipRow style={{ marginTop: 4 }}>{RATINGS.map(([k, l]) => <Chip key={k} label={l} selected={ratings[p.id] === k} onPress={() => setRatings((r) => ({ ...r, [p.id]: k }))} />)}</ChipRow>
            </View>
          ))}
          {error ? <FormError>{error}</FormError> : null}
          <ActionRow><Button onPress={complete} busy={busy}>Afronden</Button><Button variant="plain" onPress={() => setFinishing(false)}>Terug</Button></ActionRow>
        </View>
      )}
      <SafeNote>Controleer bij allergieën altijd de verpakking en bereidingsomgeving.</SafeNote>
    </ScreenScroll>
  );
}
