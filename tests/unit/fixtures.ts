// Deterministische fixtures: het voorbeeldgezin Vos (Emma, Ruben, Sam 15, Lina 9).
import { INGREDIENT_MAP } from '@/domain/catalog/ingredients';
import { RECIPES } from '@/domain/catalog/recipes';
import type { EngineInput } from '@/domain/engine';
import type { Attendee, Profile, ProfileRule, Severity } from '@/domain/types';

export const EMMA = '00000000-0000-4000-8000-000000000001';
export const RUBEN = '00000000-0000-4000-8000-000000000002';
export const SAM = '00000000-0000-4000-8000-000000000003';
export const LINA = '00000000-0000-4000-8000-000000000004';

export const profiles: Profile[] = [
  { id: EMMA, displayName: 'Emma', ageBand: 'adult', avatarColor: 'p1', active: true },
  { id: RUBEN, displayName: 'Ruben', ageBand: 'adult', avatarColor: 'p2', active: true },
  { id: SAM, displayName: 'Sam', ageBand: 'child', avatarColor: 'p3', active: true },
  { id: LINA, displayName: 'Lina', ageBand: 'child', avatarColor: 'p4', active: true },
];

let n = 0;
export function rule(profileId: string, targetType: ProfileRule['targetType'], targetId: string, severity: Severity, preparation: ProfileRule['preparation'] = 'any'): ProfileRule {
  n += 1;
  return { id: `rule-${n}`, profileId, targetType, targetId, preparation, severity, source: 'adult' };
}

export function rules(list: ProfileRule[]): Map<string, ProfileRule[]> {
  const m = new Map<string, ProfileRule[]>();
  for (const r of list) m.set(r.profileId, [...(m.get(r.profileId) ?? []), r]);
  return m;
}

export const everyone: Attendee[] = [EMMA, RUBEN, SAM, LINA].map((profileId) => ({ profileId, attendance: 'yes' as const }));

export const NOW = new Date('2026-10-20T15:00:00+02:00');

export function baseInput(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    localDate: '2026-10-20',
    now: NOW,
    profiles,
    attendees: everyone,
    rulesByProfile: rules([]),
    parentDecides: new Map([[SAM, true], [LINA, true]]),
    context: { availableMinutes: 30, equipment: null, skill: 'medium', weeklyBudgetCents: null },
    recipes: RECIPES,
    catalog: INGREDIENT_MAP,
    pantry: [],
    leftovers: [],
    history: [],
    feedback: [],
    ...overrides,
  };
}

/** Het voorbeeldgezin uit het designsystem. */
export function vosRules(): Map<string, ProfileRule[]> {
  return rules([
    rule(EMMA, 'ingredient', 'koriander', 'STRONG_DISLIKE'),
    rule(EMMA, 'tag', 'pasta', 'LIKE'),
    rule(RUBEN, 'diet', 'vegetarian', 'HARD_DIET'),
    rule(RUBEN, 'ingredient', 'courgette', 'LIKE'),
    rule(SAM, 'ingredient', 'tomaat', 'SOFT_DISLIKE', 'raw'),
    rule(SAM, 'ingredient', 'passata', 'LIKE'),
    rule(SAM, 'tag', 'wraps', 'LIKE'),
    rule(LINA, 'ingredient', 'champignons', 'STRONG_DISLIKE'),
    rule(LINA, 'ingredient', 'broccoli', 'SOFT_DISLIKE'),
    rule(LINA, 'tag', 'pasta', 'LIKE'),
    rule(LINA, 'allergen', 'nuts', 'HARD_ALLERGY'),
  ]);
}
