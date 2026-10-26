import { notFound } from 'next/navigation';
import { SafeNote, SubHeader } from '@/components/ui/phone-ui';
import { ALLERGEN_LABELS, type AllergenCode } from '@/domain/types';
import { appContext } from '@/server/page-context';
import { loadBundle, todayFor } from '@/server/planning';
import { loadHousehold } from '@/server/repo';
import { explain, scaledIngredients, slotRecipeView } from '@/server/views';

export const dynamic = 'force-dynamic';

/** S-04 Gerecht: ingrediënten, porties, persoonlijke aanpassingen en eligible/blocked. */
export default async function GerechtPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ slot?: string }> }) {
  const ctx = await appContext();
  const { id } = await params;
  const { slot: slotId } = await searchParams;
  let data;
  if (slotId && /^[0-9a-f-]{36}$/.test(slotId)) {
    const v = await slotRecipeView(ctx, slotId).catch(() => null);
    if (v && v.recipe.id === id) data = { recipe: v.recipe, ingredients: v.ingredients, explanation: v.explanation, eaters: v.eaters, back: `/app/vandaag?datum=${v.slot.local_date}`, variants: v.slot.variant_ids };
  }
  if (!data) {
    const household = await loadHousehold(ctx.supabase, ctx.householdId);
    const date = todayFor(household);
    const b = await loadBundle(ctx, date);
    const recipe = b.recipes.find((r) => r.id === id);
    if (!recipe) notFound();
    const attendees = b.profiles.map((p) => ({ profileId: p.id, attendance: 'yes' as const }));
    data = { recipe, ingredients: scaledIngredients(recipe, [], attendees.length || recipe.servings, b), explanation: explain(recipe, [], attendees, b, date), eaters: attendees.length || recipe.servings, back: '/app/week', variants: [] as string[] };
  }
  const { recipe, ingredients, explanation, eaters } = data;
  return (
    <div className="app-view">
      <SubHeader title="GERECHT" backHref={data.back} />
      <h2 className="app-title">{recipe.name}</h2>
      <p className="app-subtitle">{recipe.totalMinutes} minuten totaal · {recipe.activeMinutes} actief · {eaters} {eaters === 1 ? 'persoon' : 'personen'}</p>
      {recipe.image ? <img className="cook-hero" src={recipe.image} alt={recipe.name} /> : null}
      <div className={explanation.safe ? 'family-banner' : 'hard-section'} style={{ marginTop: 12 }}>
        {explanation.safe
          ? <><span className="family-banner-icon">✓</span><span><strong>Geen conflict met vastgelegde harde beperkingen</strong><small>Gecontroleerd tegen allergieën, medische regels en diëten van de eters.</small></span></>
          : <><h3>Niet geschikt voor deze tafel</h3>{explanation.blockedReasons.map((r) => <p key={r}>{r}</p>)}</>}
      </div>
      {explanation.adaptations.length ? <><div className="person-section-title">Persoonlijke aanpassingen</div>{explanation.adaptations.map((a) => <div className="taste-row" key={a}><span>{a}</span></div>)}</> : null}
      <div className="person-section-title">Ingrediënten voor {eaters}</div>
      {ingredients.map((i, idx) => (
        <div className="taste-row" key={idx}>
          <span>{i.name}{i.replacedFrom ? ` (i.p.v. ${i.replacedFrom.toLowerCase()})` : ''}{i.optional ? ' · optioneel' : ''}{i.separately ? ' · apart' : ''}
            {i.allergens.length ? <small style={{ display: 'block', fontWeight: 500, color: '#a28c71' }}>Bevat: {i.allergens.map((a) => ALLERGEN_LABELS[a as AllergenCode].toLowerCase()).join(', ')}{i.verified ? '' : ' · informatie onvolledig'}</small> : !i.verified ? <small style={{ display: 'block', fontWeight: 500, color: '#a28c71' }}>Allergeneninformatie onvolledig — controleer het etiket</small> : null}
          </span>
          <span className="taste-status like">{i.amount}</span>
        </div>
      ))}
      <SafeNote>Controleer bij allergieën altijd de verpakking en bereidingsomgeving.</SafeNote>
      <div className="person-section-title">Bereiding</div>
      {recipe.steps.map((s, i) => (
        <div className="recipe-step" key={i}><div>STAP {i + 1} VAN {recipe.steps.length}</div><h3>{s.title}</h3><p>{s.body}</p>{s.minutes ? <div className="step-timer">◷ {s.minutes} minuten</div> : null}</div>
      ))}
      <SafeNote>Bron: {recipe.source}</SafeNote>
    </div>
  );
}
