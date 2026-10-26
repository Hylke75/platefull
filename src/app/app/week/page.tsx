import { addDays, dayLong, dayNumber, dayShort, weekStart } from '@/domain/dates';
import { countEaters } from '@/domain/engine';
import { AppHeader, DayLine, PlanBStrip } from '@/components/ui/phone-ui';
import { appContext } from '@/server/page-context';
import { loadBundle, todayFor } from '@/server/planning';
import { loadHousehold, loadPlanSlots, toAttendees } from '@/server/repo';
import { WeekManual } from './WeekManual';

export const dynamic = 'force-dynamic';

const STATE_LABEL: Record<string, string> = {
  draft: 'Nog niet gepland', proposed: 'Voorstel', accepted: 'Op het menu', changed: 'Aangepast', cooking: 'Wordt gekookt',
  completed: 'Gegeten', dismissed: 'Overgeslagen', cancelled: 'Geannuleerd', blocked: 'Controle nodig',
};

/** S-06 Week: 7 dagen, eters en maaltijden; handmatig wisselen. */
export default async function WeekPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const ctx = await appContext();
  const household = await loadHousehold(ctx.supabase, ctx.householdId);
  const today = todayFor(household);
  const requested = (await searchParams).week;
  const start = weekStart(requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today);
  const plan = await ctx.supabase.rpc('ensure_week_plan', { p_week_start: start });
  if (plan.error) throw plan.error;
  const { slots, attendees } = await loadPlanSlots(ctx.supabase, plan.data as string);
  const b = await loadBundle(ctx, start);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="app-view">
      <AppHeader initials={household.name.slice(0, 2).toUpperCase()} />
      <div className="eyeline">ETEN ZONDER GEDOE</div>
      <h2 className="app-title">Een fijne week<br />op tafel.</h2>
      <p className="app-subtitle">De planning past zich aan als jullie dag anders loopt.</p>
      <DayLine days={days.map((d) => ({ key: d, dayLabel: dayShort(d), dayNumber: dayNumber(d), selected: d === today, href: `/app/vandaag?datum=${d}` }))} />
      <div className="person-section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <a href={`/app/week?week=${addDays(start, -7)}`}>‹ Vorige</a><span>Week van {Number(start.slice(8))}/{Number(start.slice(5, 7))}</span><a href={`/app/week?week=${addDays(start, 7)}`}>Volgende ›</a>
      </div>
      <div className="week-list">
        {slots.map((s) => {
          const r = s.recipe_id ? b.recipes.find((x) => x.id === s.recipe_id) : null;
          const eaters = countEaters(toAttendees(attendees.get(s.id) ?? []));
          return (
            <a key={s.id} className="week-item" href={`/app/vandaag?datum=${s.local_date}`}>
              {r?.image ? <img className="week-image" src={r.image} alt="" /> : <span className="week-image dish-placeholder" aria-hidden="true">✳</span>}
              <span style={{ textAlign: 'left', flex: 1 }}>
                <span className="week-date">{s.local_date === today ? `Vandaag · ${dayLong(s.local_date)}` : dayLong(s.local_date)}</span>
                <strong className="week-name">{r?.name ?? STATE_LABEL[s.state]}</strong>
                <span className="week-meta">{r ? `${r.totalMinutes} min · ` : ''}{eaters} {eaters === 1 ? 'persoon' : 'personen'} · {STATE_LABEL[s.state]}</span>
              </span>
              <span>›</span>
            </a>
          );
        })}
      </div>
      <WeekManual planId={plan.data as string} slots={slots.filter((s) => !['completed', 'cooking'].includes(s.state)).map((s) => ({ id: s.id, date: s.local_date, label: `${dayLong(s.local_date)} ${Number(s.local_date.slice(8))}`, revision: s.revision }))} recipes={b.recipes.map((r) => ({ id: r.id, name: r.name, minutes: r.totalMinutes }))} />
      <PlanBStrip title="↗ Iets gewijzigd?" subtitle="Schuif mee met jullie week" href="/app/plan-b" />
    </div>
  );
}
