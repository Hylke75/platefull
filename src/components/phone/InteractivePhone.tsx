'use client';
// Klikbaar telefoonframe van de landingspagina. Gedrag = design-source/dist/app.js.
import { useEffect, useLayoutEffect, useReducer, useRef, type ComponentType, type Dispatch } from 'react';
import { activeNav, demoReducer, initialDemoState, type DemoAction, type DemoState, type DemoView } from '@/demo/state';
import { Toast } from '@/components/ui/phone-ui';
import {
  CookingScreen, FamilyScreen, GroceryScreen, PlanBScreen, TasteProfileScreen, TodayScreen, WeekScreen,
} from './screens/DemoScreens';

const screens: Record<DemoView, ComponentType<{ state: DemoState; dispatch: Dispatch<DemoAction> }>> = {
  home: TodayScreen, planb: PlanBScreen, family: FamilyScreen, person: TasteProfileScreen,
  week: WeekScreen, groceries: GroceryScreen, cook: CookingScreen,
};

export function StatusBar() {
  return (
    <div className="phone-top">
      <span>9:41</span><span className="island" aria-hidden="true"></span><span className="phone-status" aria-hidden="true">◕ ▰ ▮</span>
    </div>
  );
}

export const navItems: { view: DemoView; icon: string; label: string }[] = [
  { view: 'home', icon: '⌂', label: 'Vandaag' },
  { view: 'week', icon: '▦', label: 'Week' },
  { view: 'family', icon: '♡', label: 'Gezin' },
  { view: 'groceries', icon: '☷', label: 'Lijst' },
];

export function BottomNavigation({ active, onNavigate }: { active: DemoView; onNavigate: (v: DemoView) => void }) {
  return (
    <nav className="phone-nav" aria-label="App-navigatie">
      {navItems.map((n) => (
        <button key={n.view} type="button" className={`nav-button${active === n.view ? ' active' : ''}`} data-nav={n.view} onClick={() => onNavigate(n.view)}>
          <span className="nav-icon">{n.icon}</span><span>{n.label}</span>
        </button>
      ))}
    </nav>
  );
}

const quickViews: { view: DemoView; label: string }[] = [
  { view: 'home', label: 'Vanavond' },
  { view: 'planb', label: 'Plan B ↗' },
  { view: 'family', label: 'Smaakprofielen' },
  { view: 'week', label: 'Weekoverzicht' },
  { view: 'groceries', label: 'Boodschappen' },
];

export function QuickViewSwitch({ view, onNavigate }: { view: DemoView; onNavigate: (v: DemoView) => void }) {
  return (
    <div className="quick-views" aria-label="Voorbeeldschermen kiezen">
      {quickViews.map((q) => (
        <button key={q.view} data-screen={q.view} className={`quick-view${view === q.view ? ' active' : ''}`} onClick={() => onNavigate(q.view)}>{q.label}</button>
      ))}
    </div>
  );
}

export function InteractivePhone() {
  const [state, dispatch] = useReducer(demoReducer, initialDemoState);
  const screenRef = useRef<HTMLDivElement>(null);
  const Screen = screens[state.view];

  // Scrollpositie na elke render, zoals render()/render(true) in app.js.
  useLayoutEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    if (state.scroll === 'top') el.scrollTop = 0;
    else if (state.scroll === 'bottom') el.scrollTop = el.scrollHeight;
  }, [state]);

  useEffect(() => {
    if (!state.toast) return;
    const id = state.toast.id;
    const timer = setTimeout(() => dispatch({ type: 'dismiss-toast', id }), 3000);
    return () => clearTimeout(timer);
  }, [state.toast]);

  const navigate = (view: DemoView) => dispatch({ type: 'navigate', view });

  return (
    <>
      <div className="phone" role="region" aria-label="Interactieve mobiele preview van Plateful">
        <StatusBar />
        <div id="screen" ref={screenRef} className="screen-scroll" aria-live="polite">
          <Screen state={state} dispatch={dispatch} />
        </div>
        <BottomNavigation active={activeNav(state.view)} onNavigate={navigate} />
        {state.toast ? <Toast key={state.toast.id} message={state.toast.message} /> : null}
      </div>
      <div className="device-caption"><span className="pulse-dot"></span> Probeer de knoppen en tabbladen</div>
      <QuickViewSwitch view={state.view} onNavigate={navigate} />
    </>
  );
}
