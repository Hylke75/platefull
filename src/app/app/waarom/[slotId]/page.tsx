import { SafeNote, SubHeader } from '@/components/ui/phone-ui';
import { WEIGHTS } from '@/domain/engine';
import { uuid } from '@/server/http';
import { appContext } from '@/server/page-context';
import { slotRecipeView } from '@/server/views';

export const dynamic = 'force-dynamic';

/** S-14 Adviesuitleg: matchredenen, aannames en individuele aandachtspunten. Geen vals nauwkeurigheidspercentage. */
export default async function WaaromPage({ params }: { params: Promise<{ slotId: string }> }) {
  const ctx = await appContext();
  const v = await slotRecipeView(ctx, uuid.parse((await params).slotId));
  const e = v.explanation;
  const level = (x: number) => (x >= 0.75 ? 'Sterk' : x >= 0.5 ? 'Neutraal' : 'Zwak');
  return (
    <div className="app-view">
      <SubHeader title="WAAROM DEZE?" backHref={`/app/vandaag?datum=${v.slot.local_date}`} />
      <h2 className="app-title">{v.recipe.name}</h2>
      <p className="app-subtitle">Zo is dit voorstel tot stand gekomen. Harde beperkingen worden altijd eerst gecontroleerd en kunnen nooit door een hoge score worden ingehaald.</p>
      <div className="person-section-title">Redenen</div>
      {e.reasons.length ? e.reasons.map((r) => <div key={r} className="taste-row"><span>{r}</span><span className="taste-status like">✓</span></div>) : <SafeNote>Geen redenen beschikbaar.</SafeNote>}
      {e.adaptations.length ? <><div className="person-section-title">Aanpassingen per persoon</div>{e.adaptations.map((a) => <div key={a} className="taste-row"><span>{a}</span></div>)}</> : null}
      <div className="person-section-title">Harde controles</div>
      {e.safe
        ? <div className="taste-row"><span>Alle vastgelegde harde beperkingen gecontroleerd</span><span className="taste-status like">✓</span></div>
        : e.blockedReasons.map((r) => <div key={r} className="taste-row"><span>{r}</span><span className="taste-status strict">Geblokkeerd</span></div>)}
      {e.cautions.map((c) => <div key={c} className="taste-row"><span>{c}</span><span className="taste-status care">Controleer</span></div>)}
      <div className="person-section-title">Afweging</div>
      {e.components.map((c) => (
        <div key={c.key} className="score-row"><span>{c.label} <span style={{ color: '#a3afa3', fontWeight: 500 }}>({Math.round(WEIGHTS[c.key as keyof typeof WEIGHTS] * 100)}%)</span></span><span className={`taste-status ${c.known ? (c.value >= 0.75 ? 'like' : c.value >= 0.5 ? 'care' : 'dislike') : 'care'}`}>{c.known ? level(c.value) : 'Onbekend'}</span></div>
      ))}
      {e.pantryChecks.length ? <SafeNote>Even controleren in de voorraad: {e.pantryChecks.join(', ')}.</SafeNote> : null}
      <SafeNote>Ontbrekende prijs- of voorraadgegevens tellen neutraal mee. &lsquo;Goed passend&rsquo; is een label, geen medische garantie. Controleer bij allergieën altijd de verpakking en bereidingsomgeving.</SafeNote>
    </div>
  );
}
