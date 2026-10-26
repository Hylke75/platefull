// De zeven telefoonschermen van de klikbare ontwerpdemo (design-source/dist/app.js).
import type { Dispatch } from 'react';
import { groceryGroups, meals, people, scenarioOptions, scenarioSolutions } from '@/demo/data';
import type { DemoAction, DemoState } from '@/demo/state';
import {
  AppHeader, DayLine, FamilyAvatar, FamilyPersonRow, MatchPanel, MealHeroCard, PlanBStrip,
  PrimaryButton, RecipeStep, OrangeButton, SafeNote, SecondaryButton, ShoppingItem, SubHeader, Switch, TasteRow,
  type DayPillData,
} from '@/components/ui/phone-ui';

interface ScreenProps { state: DemoState; dispatch: Dispatch<DemoAction> }

const demoDays: DayPillData[] = [['MA', '19'], ['DI', '20'], ['WO', '21'], ['DO', '22'], ['VR', '23']].map(([l, n]) => ({ key: l!, dayLabel: l!, dayNumber: n!, selected: l === 'DI' }));

export function TodayScreen({ state, dispatch }: ScreenProps) {
  const meal = meals[state.currentMeal];
  const note = state.planBNote || meal.note;
  const minutes = state.planBMinutes || meal.time;
  const diners = state.planBPeople || 4;
  return (
    <div className="app-view">
      <AppHeader />
      <div className="eyeline">GOEDENAVOND, EMMA ☀</div>
      <h2 className="app-title">Vanavond wordt<br />het lekker.</h2>
      <DayLine days={demoDays} label="Deze week →" />
      <MealHeroCard image={meal.image} name={meal.name} tag={state.planBNote ? 'Plan B toegepast' : 'Slim voorstel voor jullie'} minutes={minutes} diners={diners} />
      <MatchPanel title="Past bij jullie gezin" badge="✓ Goed passend" initials={['E', 'R', 'S', 'L']} comment="4 smaakprofielen meegenomen" note={note} />
      {state.mealConfirmed ? (
        <div className="confirmation">
          <div style={{ fontSize: 23 }}>✓</div>
          <h3>Het is geregeld!</h3>
          <p>{meal.name} staat voor vanavond op het menu.</p>
          <PrimaryButton wide data-action="cook" onClick={() => dispatch({ type: 'navigate', view: 'cook' })}>Bekijk de kookstappen →</PrimaryButton>
        </div>
      ) : (
        <div className="action-row">
          <PrimaryButton data-action="confirm" onClick={() => dispatch({ type: 'confirm' })}>✓ Dit eten we</PrimaryButton>
          <SecondaryButton data-action="swap" onClick={() => dispatch({ type: 'swap' })}>↻ Ander idee</SecondaryButton>
        </div>
      )}
      <PlanBStrip title="↗ Loopt de dag anders?" subtitle="Regel direct een slim plan B" onClick={() => dispatch({ type: 'navigate', view: 'planb' })} />
      <div className="today-footer">Ontworpen voor de drukte van het echte leven ✳</div>
    </div>
  );
}

export function PlanBScreen({ state, dispatch }: ScreenProps) {
  const s = scenarioSolutions[state.scenario];
  return (
    <div className="app-view">
      <SubHeader title="SLIM PLAN B" onBack={() => dispatch({ type: 'back' })} />
      <div className="planb-lead">
        <div className="small-kicker">✳ GEEN STRESS, WIJ DENKEN MEE</div>
        <h2>Oeps, plannen veranderd?</h2>
        <p>Vertel ons wat er speelt. We zoeken de makkelijkste aanpassing voor jullie avond.</p>
      </div>
      <div className="block-label">Wat is er veranderd?</div>
      <div className="scenario-grid">
        {scenarioOptions.map(([id, ico, lab]) => (
          <button key={id} className={`scenario ${id === state.scenario ? 'selected' : ''}`} data-scenario={id} onClick={() => dispatch({ type: 'select-scenario', scenario: id })}><span>{ico}</span>{lab}</button>
        ))}
      </div>
      <div className="block-label">Nog iets? <span style={{ fontWeight: 500, color: '#a3afa3' }}>(optioneel)</span></div>
      <textarea className="free-input" placeholder="Bijv. ik moet over 20 minuten weg..." />
      <OrangeButton wide style={{ marginTop: 10 }} data-action="calculate" onClick={() => dispatch({ type: 'calculate' })}>✳ Vind mijn plan B →</OrangeButton>
      {state.planBReady ? (
        <div className="scenario-output">
          <div className="eyeline">✳ DIT KUNNEN WE DOEN</div>
          <h3>{s[0]}</h3>
          <p>{s[1]}</p>
          <div className="output-list">{s[2].map((x) => <span key={x}>{x}</span>)}</div>
          <PrimaryButton wide data-action="apply-planb" onClick={() => dispatch({ type: 'apply-planb' })}>✓ Pas het menu aan</PrimaryButton>
        </div>
      ) : (
        <SafeNote>Een interactieve ontwerpdemo met vooraf uitgewerkte scenario&apos;s — nog geen live AI.</SafeNote>
      )}
    </div>
  );
}

export function FamilyScreen({ dispatch }: ScreenProps) {
  return (
    <div className="app-view">
      <AppHeader />
      <div className="eyeline">JULLIE AAN TAFEL</div>
      <h2 className="app-title">Iedereen heeft<br />een eigen smaak.</h2>
      <p className="app-subtitle">Plateful onthoudt wat werkt. Jullie beslissen samen wat er op tafel komt.</p>
      <div className="family-banner"><span className="family-banner-icon">♡</span><span><strong>Familie Vos · 4 personen</strong><small>4 persoonlijke profielen, 1 gezamenlijke tafel</small></span></div>
      <div className="person-section-title">Kies een gezinslid</div>
      {people.map((p, i) => (
        <FamilyPersonRow key={p.name} color={p.color} initial={p.initial} name={p.name} role={p.role} sub={p.sub} onClick={() => dispatch({ type: 'select-person', index: i })} />
      ))}
      <SafeNote>Medische beperkingen worden altijd als harde uitsluiting behandeld. Controleer bij allergieën zelf de etiketten.</SafeNote>
    </div>
  );
}

export function TasteProfileScreen({ state, dispatch }: ScreenProps) {
  const p = people[state.person]!;
  return (
    <div className="app-view">
      <SubHeader title="PERSOONLIJK SMAAKPROFIEL" onBack={() => dispatch({ type: 'back' })} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, margin: '2px 0 15px' }}>
        <FamilyAvatar color={p.color} initial={p.initial} style={{ width: 59, height: 59, fontSize: 18 }} />
        <div><h2 className="app-title" style={{ margin: 0 }}>{p.name}</h2><div className="little-label">{p.role}</div></div>
      </div>
      <div className="family-banner"><span className="family-banner-icon">✳</span><span><strong>Zo kent Plateful {p.name}</strong><small>Voorkeuren kun je altijd aanpassen.</small></span></div>
      <div className="person-section-title">Ingrediënten &amp; gerechten</div>
      {p.tastes.map(([food, label, type]) => <TasteRow key={food} food={food} label={label} type={type} />)}
      {state.person > 1 ? (
        <div className="parent-toggle">
          <span><b>Ouder beslist over de maaltijd</b><small>De mening van je kind blijft bewaard.</small></span>
          <Switch on={state.parentOverride} onToggle={() => dispatch({ type: 'toggle-override' })} label="Ouderlijke regie in- of uitschakelen" />
        </div>
      ) : null}
      <SafeNote>♡ Een ouderkeuze verandert alleen het menu, nooit een geregistreerde allergie of de smaakvoorkeur van een kind.</SafeNote>
      <SecondaryButton wide style={{ marginTop: 12 }} data-action="back-family" onClick={() => dispatch({ type: 'back-family' })}>← Alle gezinsleden</SecondaryButton>
    </div>
  );
}

export function WeekScreen({ state, dispatch }: ScreenProps) {
  const rows: [string, string, string, string][] = [
    ['Vandaag · dinsdag', meals[state.currentMeal].name, meals[state.currentMeal].image, '20 min · 4 personen'],
    ['Woensdag', 'Kleurrijke rijstbowl', meals.bowl.image, '30 min · 3 personen'],
    ['Donderdag', 'Romige tomatenpasta', meals.pasta.image, '25 min · 4 personen'],
    ['Vrijdag', 'Gezinsfavoriet kiezen', meals.wraps.image, 'Stemmen mag · 4 personen'],
  ];
  return (
    <div className="app-view">
      <AppHeader />
      <div className="eyeline">ETEN ZONDER GEDOE</div>
      <h2 className="app-title">Een fijne week<br />op tafel.</h2>
      <p className="app-subtitle">De planning past zich aan als jullie dag anders loopt.</p>
      <DayLine days={demoDays} />
      <div className="person-section-title">De komende dagen</div>
      <div className="week-list">
        {rows.map(([day, name, img, meta], i) => (
          <button key={day} className="week-item" data-action={i === 0 ? 'home' : 'week-day'} onClick={() => dispatch(i === 0 ? { type: 'navigate', view: 'home' } : { type: 'week-day' })}>
            <img className="week-image" src={img} alt="" />
            <span style={{ textAlign: 'left', flex: 1 }}><span className="week-date">{day}</span><strong className="week-name">{name}</strong><span className="week-meta">{meta}</span></span>
            <span>›</span>
          </button>
        ))}
      </div>
      <PlanBStrip title="↗ Iets gewijzigd?" subtitle="Schuif mee met jullie week" onClick={() => dispatch({ type: 'navigate', view: 'planb' })} />
    </div>
  );
}

export function GroceryScreen({ state, dispatch }: ScreenProps) {
  const total = groceryGroups.flatMap((x) => x[1]).length;
  return (
    <div className="app-view">
      <AppHeader />
      <div className="eyeline">SAMEN GEREGELD</div>
      <h2 className="app-title">Een lijstje.<br />Alles in huis.</h2>
      <p className="app-subtitle">Dit hebben jullie nog nodig voor het gekozen gerecht.</p>
      <div className="progress-note"><span>{state.checked.size} van {total} afgevinkt</span><small>Automatisch uit het menu ✳</small></div>
      {groceryGroups.map(([name, items]) => (
        <div className="check-section" key={name}>
          <h3>{name}</h3>
          {items.map(([item, amount]) => (
            <ShoppingItem key={item} label={item} amount={amount} checked={state.checked.has(item)} onChange={(checked) => dispatch({ type: 'toggle-grocery', item, checked })} />
          ))}
        </div>
      ))}
      <div className="shopping-tip"><span>✳</span><div><strong>Goed om te weten</strong>De paprika’s heb je volgens de voorbeeldvoorraad al in huis. Controleer even of dat klopt.</div></div>
    </div>
  );
}

export function CookingScreen({ state, dispatch }: ScreenProps) {
  const meal = meals[state.currentMeal];
  return (
    <div className="app-view">
      <SubHeader title="SAMEN KOKEN" onBack={() => dispatch({ type: 'back' })} />
      <h2 className="app-title">{meal.name}</h2>
      <p className="app-subtitle">{meal.time} minuten · 4 personen · 1 gezamenlijke maaltijd</p>
      <img className="cook-hero" src={meal.image} alt={meal.name} />
      <RecipeStep index={1} total={3} title="Alles klaarzetten" body="Leg de groente, bonen en wraps klaar. Zet ingrediënten die niet iedereen lust alvast in aparte bakjes." minutes={5} />
      <RecipeStep index={2} total={3} title="Opwarmen & bakken" body="Warm de wraps op en bak de paprika. Voeg alleen de smaakmakers toe die iedereen wil." minutes={10} />
      <RecipeStep index={3} total={3} title="Samenstellen maar" body="Zet alles op tafel. Iedereen maakt zijn eigen wrap, met de favoriete toppings." minutes={5} />
      <PrimaryButton wide style={{ marginTop: 12 }} data-action="home" onClick={() => dispatch({ type: 'navigate', view: 'home' })}>← Terug naar vandaag</PrimaryButton>
    </div>
  );
}
