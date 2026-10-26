import { useCallback } from 'react';
// S-04 Gerecht: ingrediënten, porties, persoonlijke aanpassingen, bereiding en eligible/blocked.
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { loadBundle, todayFor } from '@shared/core/planning';
import { loadHousehold } from '@shared/core/repo';
import { explain, scaledIngredients, slotRecipeView } from '@shared/core/views';
import { ALLERGEN_LABELS, type AllergenCode } from '@shared/domain/types';
import { ScreenScroll } from '@/components/ScreenScroll';
import { AppTitle, Banner, HardSection, HardText, RecipeStep, SafeNote, SectionTitle, SubHeader, Subtitle, TasteChip, TasteRow, s } from '@/components/ui';
import { recipeImage } from '@/lib/images';
import { useCore } from '@/lib/session';
import { useLoad } from '@/lib/use-load';
import { colors } from '@/theme';

export default function Gerecht() {
  const { id, slot } = useLocalSearchParams<{ id: string; slot?: string }>();
  const ctx = useCore();
  const { data } = useLoad(useCallback(async () => {
    if (slot) {
      const v = await slotRecipeView(ctx, slot).catch(() => null);
      if (v && v.recipe.id === id) return { recipe: v.recipe, ingredients: v.ingredients, explanation: v.explanation, eaters: v.eaters };
    }
    const household = await loadHousehold(ctx.supabase, ctx.householdId);
    const date = todayFor(household);
    const b = await loadBundle(ctx, date);
    const recipe = b.recipes.find((r) => r.id === id);
    if (!recipe) return null;
    const attendees = b.profiles.map((p) => ({ profileId: p.id, attendance: 'yes' as const }));
    const eaters = attendees.length || recipe.servings;
    return { recipe, ingredients: scaledIngredients(recipe, [], eaters, b), explanation: explain(recipe, [], attendees, b, date), eaters };
  }, [ctx, id, slot]));

  if (!data) return <ScreenScroll><SubHeader title="GERECHT" onBack={() => router.back()} /></ScreenScroll>;
  const { recipe, ingredients, explanation, eaters } = data;
  const img = recipeImage(recipe.image);
  return (
    <ScreenScroll>
      <SubHeader title="GERECHT" onBack={() => router.back()} />
      <AppTitle>{recipe.name}</AppTitle>
      <Subtitle>{recipe.totalMinutes} minuten totaal · {recipe.activeMinutes} actief · {eaters} {eaters === 1 ? 'persoon' : 'personen'}</Subtitle>
      {img ? <Image source={img} style={{ width: '100%', height: 198, borderRadius: 20, marginBottom: 12 }} contentFit="cover" accessibilityLabel={recipe.name} /> : null}
      {explanation.safe
        ? <Banner icon="✓" title="Geen conflict met vastgelegde harde beperkingen" sub="Gecontroleerd tegen allergieën, medische regels en diëten van de eters." />
        : <HardSection title="Niet geschikt voor deze tafel">{explanation.blockedReasons.map((r) => <HardText key={r}>{r}</HardText>)}</HardSection>}
      {explanation.adaptations.length ? <><SectionTitle>Persoonlijke aanpassingen</SectionTitle>{explanation.adaptations.map((a) => <TasteRow key={a} label={a} />)}</> : null}
      <SectionTitle>Ingrediënten voor {eaters}</SectionTitle>
      {ingredients.map((i, idx) => (
        <TasteRow key={idx} label={
          <>
            {i.name}{i.replacedFrom ? ` (i.p.v. ${i.replacedFrom.toLowerCase()})` : ''}{i.optional ? ' · optioneel' : ''}{i.separately ? ' · apart' : ''}
            {i.allergens.length || !i.verified ? (
              <Text style={{ color: colors.safeNote, fontWeight: '500' }}>{'\n'}{i.allergens.length ? `Bevat: ${i.allergens.map((a) => ALLERGEN_LABELS[a as AllergenCode].toLowerCase()).join(', ')}` : ''}{i.verified ? '' : `${i.allergens.length ? ' · ' : ''}allergeneninformatie onvolledig — controleer het etiket`}</Text>
            ) : null}
          </>
        }><TasteChip type="like">{i.amount}</TasteChip></TasteRow>
      ))}
      <SafeNote>Controleer bij allergieën altijd de verpakking en bereidingsomgeving.</SafeNote>
      <SectionTitle>Bereiding</SectionTitle>
      {recipe.steps.map((st, i) => <RecipeStep key={i} index={i + 1} total={recipe.steps.length} title={st.title} body={st.body} minutes={st.minutes} />)}
      <View><Text style={s.safeNote}>Bron: {recipe.source}</Text></View>
    </ScreenScroll>
  );
}
