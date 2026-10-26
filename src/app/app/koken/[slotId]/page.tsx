import { SafeNote, SubHeader } from '@/components/ui/phone-ui';
import { uuid } from '@/server/http';
import { appContext } from '@/server/page-context';
import { slotRecipeView } from '@/server/views';
import { CookClient } from './CookClient';

export const dynamic = 'force-dynamic';

/** S-11 Kookstand: stappen, porties, waarschuwingen en afronden. Stappen worden nooit door een achtergrond-AI herordend. */
export default async function KokenPage({ params }: { params: Promise<{ slotId: string }> }) {
  const ctx = await appContext();
  const v = await slotRecipeView(ctx, uuid.parse((await params).slotId));
  const minutes = v.recipe.totalMinutes + v.recipe.variants.filter((x) => v.slot.variant_ids.includes(x.id)).flatMap((x) => x.changes).reduce((s, c) => s + (c.op === 'time' ? c.deltaMinutes : 0), 0);
  const quick = v.recipe.variants.filter((x) => v.slot.variant_ids.includes(x.id)).flatMap((x) => x.changes).find((c) => c.op === 'time');
  return (
    <div className="app-view">
      <SubHeader title="SAMEN KOKEN" backHref={`/app/vandaag?datum=${v.slot.local_date}`} />
      <h2 className="app-title">{v.recipe.name}</h2>
      <p className="app-subtitle">{minutes} minuten · {v.eaters} {v.eaters === 1 ? 'persoon' : 'personen'} · 1 gezamenlijke maaltijd</p>
      {v.recipe.image ? <img className="cook-hero" src={v.recipe.image} alt={v.recipe.name} /> : null}
      {!v.explanation.safe ? <div className="hard-section"><h3>Niet koken zonder controle</h3>{v.explanation.blockedReasons.map((r) => <p key={r}>{r}</p>)}</div> : null}
      {v.explanation.adaptations.length || quick ? (
        <div className="shopping-tip"><span>✳</span><div><strong>Let op aan tafel</strong>{[...(quick && quick.op === 'time' ? [quick.note] : []), ...v.explanation.adaptations].join(' · ')}</div></div>
      ) : null}
      <CookClient slotId={v.slot.id} revision={v.slot.revision} state={v.slot.state} date={v.slot.local_date}
        ingredients={v.ingredients.map((i) => ({ name: i.name, amount: i.amount, note: [i.optional ? 'optioneel' : '', i.separately ? 'apart' : ''].filter(Boolean).join(' · ') }))}
        steps={v.recipe.steps}
        eaters={v.attendees.filter((a) => a.attendance !== 'no' && a.profileId).map((a) => ({ id: a.profileId!, name: v.bundle.profiles.find((p) => p.id === a.profileId)?.display_name ?? '' }))}
      />
      <SafeNote>Controleer bij allergieën altijd de verpakking en bereidingsomgeving.</SafeNote>
    </div>
  );
}
