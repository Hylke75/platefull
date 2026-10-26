// State-overgangen 1:1 overgenomen uit design-source/dist/app.js.
import { planBNotes, type MealKey, type ScenarioKey } from './data';

export type DemoView = 'home' | 'planb' | 'family' | 'person' | 'week' | 'groceries' | 'cook';

export interface DemoState {
  view: DemoView;
  person: number;
  scenario: ScenarioKey;
  planBReady: boolean;
  currentMeal: MealKey;
  mealConfirmed: boolean;
  parentOverride: boolean;
  planBNote: string | null;
  planBMinutes: number | null;
  planBPeople: number | null;
  checked: ReadonlySet<string>;
  /** Scrollgedrag na render: 'top' (navigatie), 'keep' (render(true)) of 'bottom' (Plan B berekenen). */
  scroll: 'top' | 'keep' | 'bottom';
  /** Telt mee zodat een identieke toast opnieuw verschijnt. */
  toast: { message: string; id: number } | null;
}

export const initialDemoState: DemoState = {
  view: 'home', person: 2, scenario: 'time', planBReady: false,
  currentMeal: 'wraps', mealConfirmed: false, parentOverride: true,
  planBNote: null, planBMinutes: null, planBPeople: null,
  checked: new Set(['Paprika’s']), scroll: 'top', toast: null,
};

export type DemoAction =
  | { type: 'navigate'; view: DemoView }
  | { type: 'select-person'; index: number }
  | { type: 'select-scenario'; scenario: ScenarioKey }
  | { type: 'back' }
  | { type: 'back-family' }
  | { type: 'confirm' }
  | { type: 'swap' }
  | { type: 'calculate' }
  | { type: 'apply-planb' }
  | { type: 'toggle-override' }
  | { type: 'week-day' }
  | { type: 'toggle-grocery'; item: string; checked: boolean }
  | { type: 'dismiss-toast'; id: number };

function navigate(state: DemoState, view: DemoView): DemoState {
  return { ...state, view, planBReady: view === 'planb' ? false : state.planBReady, scroll: 'top' };
}

function withToast(state: DemoState, message: string): DemoState {
  return { ...state, toast: { message, id: (state.toast?.id ?? 0) + 1 } };
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'navigate':
      return navigate(state, action.view);
    case 'select-person':
      return navigate({ ...state, person: action.index }, 'person');
    case 'select-scenario':
      return { ...state, scenario: action.scenario, planBReady: false, scroll: 'keep' };
    case 'back':
      return navigate(state, state.view === 'person' ? 'family' : 'home');
    case 'back-family':
      return navigate(state, 'family');
    case 'confirm':
      return withToast({ ...state, mealConfirmed: true, scroll: 'keep' }, 'Vanavond is geregeld!');
    case 'swap': {
      const next: MealKey = state.currentMeal === 'wraps' ? 'pasta' : state.currentMeal === 'pasta' ? 'bowl' : 'wraps';
      return withToast({ ...state, currentMeal: next, mealConfirmed: false, planBNote: null, planBMinutes: null, planBPeople: null, scroll: 'keep' }, 'Nieuw gerecht voorgesteld');
    }
    case 'calculate':
      return { ...state, planBReady: true, scroll: 'bottom' };
    case 'apply-planb':
      return withToast(navigate({
        ...state,
        mealConfirmed: false,
        currentMeal: 'wraps',
        planBNote: planBNotes[state.scenario],
        planBMinutes: state.scenario === 'time' ? 15 : null,
        planBPeople: state.scenario === 'away' ? 3 : null,
      }, 'home'), 'Je maaltijdplan is aangepast');
    case 'toggle-override': {
      const parentOverride = !state.parentOverride;
      return withToast({ ...state, parentOverride, scroll: 'keep' }, parentOverride ? 'Ouderlijke regie ingeschakeld' : 'Ouderlijke regie aangepast');
    }
    case 'week-day':
      return withToast(state, 'Voorbeelddag geselecteerd');
    case 'toggle-grocery': {
      const checked = new Set(state.checked);
      if (action.checked) checked.add(action.item); else checked.delete(action.item);
      return { ...state, checked, scroll: 'keep' };
    }
    case 'dismiss-toast':
      return state.toast?.id === action.id ? { ...state, toast: null } : state;
  }
}

/** Welke tab in de bottom-navigatie actief is (zelfde regel als app.js render()). */
export function activeNav(view: DemoView): DemoView {
  if (view === 'person') return 'family';
  if (view === 'planb' || view === 'cook') return 'home';
  return view;
}
