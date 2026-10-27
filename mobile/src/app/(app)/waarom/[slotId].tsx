import { useCallback } from 'react';
// S-14 Adviesuitleg: redenen, harde controles, afweging (zonder vals nauwkeurigheidspercentage).
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { slotRecipeView } from '@shared/core/views';
import { WEIGHTS } from '@shared/domain/engine';
import { ScreenScroll } from '@/components/ScreenScroll';
import { AppTitle, SafeNote, SectionTitle, SubHeader, Subtitle, TasteChip, TasteRow } from '@/components/ui';
import { useCore } from '@/lib/session';
import { useLoad } from '@/lib/use-load';

export default function Waarom() {
  const { slotId } = useLocalSearchParams<{ slotId: string }>();
  const ctx = useCore();
  const { data } = useLoad(useCallback(() => slotRecipeView(ctx, slotId), [ctx, slotId]));
  if (!data) return <ScreenScroll><SubHeader title="WAAROM DEZE?" onBack={() => router.back()} /></ScreenScroll>;
  const e = data.explanation;
  const level = (x: number) => (x >= 0.75 ? 'Sterk' : x >= 0.5 ? 'Neutraal' : 'Zwak');
  return (
    <ScreenScroll>
      <SubHeader title="WAAROM DEZE?" onBack={() => router.back()} />
      <AppTitle>{data.recipe.name}</AppTitle>
      <Subtitle>Zo is dit voorstel tot stand gekomen. Harde beperkingen worden altijd eerst gecontroleerd en kunnen nooit door een hoge score worden ingehaald.</Subtitle>
      <SectionTitle>Redenen</SectionTitle>
      {e.reasons.length ? e.reasons.map((r) => <TasteRow key={r} label={r}><TasteChip type="like">✓</TasteChip></TasteRow>) : <SafeNote>Geen redenen beschikbaar.</SafeNote>}
      {e.adaptations.length ? <><SectionTitle>Aanpassingen per persoon</SectionTitle>{e.adaptations.map((a) => <TasteRow key={a} label={a} />)}</> : null}
      <SectionTitle>Harde controles</SectionTitle>
      {e.safe ? <TasteRow label="Alle vastgelegde harde beperkingen gecontroleerd"><TasteChip type="like">✓</TasteChip></TasteRow>
        : e.blockedReasons.map((r) => <TasteRow key={r} label={r}><TasteChip type="strict">Geblokkeerd</TasteChip></TasteRow>)}
      {e.cautions.map((c) => <TasteRow key={c} label={c}><TasteChip type="care">Controleer</TasteChip></TasteRow>)}
      <SectionTitle>Afweging</SectionTitle>
      {e.components.map((c) => (
        <TasteRow key={c.key} label={<>{c.label} <Text style={{ color: '#A3AFA3', fontWeight: '500' }}>({Math.round(WEIGHTS[c.key as keyof typeof WEIGHTS] * 100)}%)</Text></>}>
          <TasteChip type={c.known ? (c.value >= 0.75 ? 'like' : c.value >= 0.5 ? 'care' : 'dislike') : 'care'}>{c.known ? level(c.value) : 'Onbekend'}</TasteChip>
        </TasteRow>
      ))}
      {e.pantryChecks.length ? <SafeNote>Even controleren in de voorraad: {e.pantryChecks.join(', ')}.</SafeNote> : null}
      <SafeNote>Ontbrekende prijs- of voorraadgegevens tellen neutraal mee. ‘Goed passend’ is een label, geen medische garantie. Controleer bij allergieën altijd de verpakking en bereidingsomgeving.</SafeNote>
    </ScreenScroll>
  );
}
