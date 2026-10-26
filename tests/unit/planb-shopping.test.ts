import { describe, expect, it } from 'vitest';
import { INGREDIENT_MAP } from '@/domain/catalog/ingredients';
import { RECIPE_MAP } from '@/domain/catalog/recipes';
import { leftoverState, leftoverUseBy } from '@/domain/pantry';
import { previewPlanB, sanitizeFreeText, type CurrentSlot } from '@/domain/planb';
import { computeNeeds, reconcileShoppingList, type ShoppingItemRecord } from '@/domain/shopping';
import { assertTransition, canTransition, undoAllowed } from '@/domain/slot-state';
import { baseInput, everyone, LINA, NOW, RUBEN, SAM, rule, rules } from './fixtures';

const wraps = RECIPE_MAP.get('wraps-voor-iedereen')!;
const slot = (over: Partial<CurrentSlot> = {}): CurrentSlot => ({ slotId: 's1', revision: 3, recipe: wraps, variants: [], attendees: everyone, ...over });

describe('Plan B', () => {
  it('U-04: iemand eet niet mee → 4 → 3 eters, zelfde gerecht', () => {
    const out = previewPlanB(slot(), { kind: 'attendee_absent', profileIds: [RUBEN] }, baseInput());
    expect(out.status).toBe('ok');
    if (out.status !== 'ok') return;
    expect(out.diff.eaters).toEqual({ from: 4, to: 3 });
    expect(out.next.recipeId).toBe(wraps.id);
    expect(out.next.attendees.find((a) => a.profileId === RUBEN)!.attendance).toBe('no');
  });

  it('U-05: minder tijd → gecontroleerde snellere variant (20 → 15)', () => {
    const out = previewPlanB(slot(), { kind: 'less_time', availableMinutes: 15 }, baseInput());
    expect(out.status).toBe('ok');
    if (out.status !== 'ok') return;
    expect(out.diff.minutes).toEqual({ from: 20, to: 15 });
    expect(out.next.recipeId).toBe(wraps.id);
  });

  it('U-05: geen verzonnen claim als niets aantoonbaar past', () => {
    const out = previewPlanB(slot(), { kind: 'less_time', availableMinutes: 5 }, baseInput());
    expect(out.status).toBe('not_possible');
  });

  it('ingrediënt ontbreekt → kikkererwten alleen als die bevestigd in huis zijn', () => {
    const unknown = previewPlanB(slot(), { kind: 'ingredient_missing', ingredientId: 'zwarte-bonen' }, baseInput());
    if (unknown.status === 'ok') expect(unknown.diff.substitutions?.[0]?.to).not.toBe('kikkererwten');
    const pantry = [{ ingredientId: 'kikkererwten', quantity: 1, unit: 'blik' as const, status: 'confirmed' as const, verifiedAt: '2026-10-19T10:00:00Z', expiresAt: null }];
    const known = previewPlanB(slot(), { kind: 'ingredient_missing', ingredientId: 'zwarte-bonen' }, baseInput({ pantry }));
    expect(known.status).toBe('ok');
    if (known.status !== 'ok') return;
    expect(known.diff.substitutions).toEqual([{ from: 'zwarte-bonen', to: 'kikkererwten', fromName: 'Zwarte bonen', toName: 'Kikkererwten' }]);
  });

  it('kind lust het niet → tomaat apart; geen wijziging in profiel', () => {
    const r = rules([rule(SAM, 'ingredient', 'tomaat', 'SOFT_DISLIKE', 'raw')]);
    const out = previewPlanB(slot(), { kind: 'taste_conflict', profileId: SAM, ingredientId: 'tomaat' }, baseInput({ rulesByProfile: r }));
    expect(out.status).toBe('ok');
    if (out.status !== 'ok') return;
    expect(out.title).toBe('Tomaat gewoon apart');
    expect(r.get(SAM)).toHaveLength(1);
  });

  it('Plan B-alternatief respecteert harde regels', () => {
    const r = rules([rule(LINA, 'allergen', 'nuts', 'HARD_ALLERGY')]);
    const pasta = RECIPE_MAP.get('romige-tomatenpasta')!;
    const out = previewPlanB(slot({ recipe: RECIPE_MAP.get('spinazie-lasagne')!, variants: [] }), { kind: 'less_time', availableMinutes: 30 }, baseInput({ rulesByProfile: r }));
    if (out.status === 'ok') {
      expect(out.next.recipeId).not.toBe('pasta-pesto-kip');
      expect(out.next.recipeId).not.toBe(pasta.id); // pasta = onvolledige allergeneninfo
    }
  });

  it('vrije tekst max. 500 tekens en zonder controletekens', () => {
    expect(sanitizeFreeText('x'.repeat(600))!.length).toBe(500);
    expect(sanitizeFreeText('  hallo\u0000 ')).toBe('hallo');
    expect(sanitizeFreeText('   ')).toBeNull();
  });
});

describe('Boodschappen', () => {
  const meal = { slotId: 's1', recipe: wraps, variants: [], eaters: 4 };

  it('berekent behoefte per ingrediënt, geschaald naar eters', () => {
    const needs = computeNeeds([meal], [], INGREDIENT_MAP, NOW);
    expect(needs.find((n) => n.ingredientId === 'paprika')).toMatchObject({ required: 2, toBuy: 2, check: 'unknown' });
    const three = computeNeeds([{ ...meal, eaters: 3 }], [], INGREDIENT_MAP, NOW);
    expect(three.find((n) => n.ingredientId === 'wraps')!.required).toBe(6);
  });

  it('U-08: bevestigd in huis → niet onnodig op de lijst', () => {
    const pantry = [{ ingredientId: 'zwarte-bonen', quantity: 2, unit: 'blik' as const, status: 'confirmed' as const, verifiedAt: '2026-10-19T10:00:00Z', expiresAt: null }];
    const needs = computeNeeds([meal], pantry, INGREDIENT_MAP, NOW);
    expect(needs.find((n) => n.ingredientId === 'zwarte-bonen')).toMatchObject({ toBuy: 0, check: 'confirmed' });
  });

  it('U-04: herberekening is idempotent, houdt handmatige items en zet overbodige op niet meer nodig', () => {
    let seq = 0;
    const id = () => `id-${++seq}`;
    const needs4 = computeNeeds([meal], [], INGREDIENT_MAP, NOW);
    const manual: ShoppingItemRecord = { id: 'm1', ingredientId: null, key: null, description: 'Koffie', qty: null, unit: null, category: 'overig', origin: 'manual', state: 'open', notNeeded: false, check: 'unknown' };
    const list1 = reconcileShoppingList([manual], needs4, id);
    const again = reconcileShoppingList(list1, needs4, id);
    expect(again).toEqual(list1);
    expect(list1.filter((i) => i.key === 'wraps|stuk')).toHaveLength(1);

    const checked = list1.map((i) => (i.key === 'paprika|stuk' ? { ...i, state: 'checked' as const } : i));
    const needsPasta = computeNeeds([{ slotId: 's1', recipe: RECIPE_MAP.get('romige-tomatenpasta')!, variants: [], eaters: 3 }], [], INGREDIENT_MAP, NOW);
    const list2 = reconcileShoppingList(checked, needsPasta, id);
    expect(list2.find((i) => i.id === 'm1')).toEqual(manual);
    expect(list2.find((i) => i.key === 'wraps|stuk')!.notNeeded).toBe(true);
    expect(list2.find((i) => i.key === 'paprika|stuk')).toMatchObject({ notNeeded: true, state: 'checked' });
    // Terug naar wraps: dezelfde regel komt terug, zonder doublure.
    const list3 = reconcileShoppingList(list2, needs4, id);
    expect(list3.filter((i) => i.key === 'wraps|stuk')).toHaveLength(1);
    expect(list3.find((i) => i.key === 'wraps|stuk')!.notNeeded).toBe(false);
  });

  it('vinkt een item opnieuw open als er meer nodig is dan eerst', () => {
    const id = (k: string) => k;
    const l1 = reconcileShoppingList([], computeNeeds([{ ...meal, eaters: 2 }], [], INGREDIENT_MAP, NOW), id).map((i) => ({ ...i, state: 'checked' as const }));
    const l2 = reconcileShoppingList(l1, computeNeeds([meal], [], INGREDIENT_MAP, NOW), id);
    expect(l2.find((i) => i.key === 'wraps|stuk')!.state).toBe('open');
  });
});

describe('Statemachines', () => {
  it('MealSlot volgt §8.1', () => {
    expect(canTransition('draft', 'proposed')).toBe(true);
    expect(canTransition('proposed', 'accepted')).toBe(true);
    expect(canTransition('accepted', 'cooking')).toBe(true);
    expect(canTransition('cooking', 'completed')).toBe(true);
    expect(canTransition('accepted', 'blocked')).toBe(true);
    expect(canTransition('blocked', 'proposed')).toBe(true);
    expect(canTransition('completed', 'proposed')).toBe(false);
    expect(canTransition('blocked', 'accepted')).toBe(false);
    expect(() => assertTransition('draft', 'completed')).toThrow();
  });

  it('undo: binnen 10 minuten, één keer, zonder latere mutatie', () => {
    const appliedAt = new Date('2026-10-20T17:00:00Z');
    expect(undoAllowed({ appliedAt, now: new Date('2026-10-20T17:09:00Z'), appliedRevision: 5, currentRevision: 5, alreadyUndone: false })).toEqual({ ok: true });
    expect(undoAllowed({ appliedAt, now: new Date('2026-10-20T17:11:00Z'), appliedRevision: 5, currentRevision: 5, alreadyUndone: false })).toEqual({ ok: false, reason: 'expired' });
    expect(undoAllowed({ appliedAt, now: new Date('2026-10-20T17:01:00Z'), appliedRevision: 5, currentRevision: 6, alreadyUndone: false })).toEqual({ ok: false, reason: 'later_change' });
    expect(undoAllowed({ appliedAt, now: new Date('2026-10-20T17:01:00Z'), appliedRevision: 5, currentRevision: 5, alreadyUndone: true })).toEqual({ ok: false, reason: 'already_undone' });
  });
});

describe('R-07 / U-09 restjes', () => {
  it('koelkast: maximaal twee dagen, daarna controle nodig en nooit automatisch veilig', () => {
    const stored = new Date('2026-10-19T19:00:00+02:00');
    const useBy = leftoverUseBy(stored, 'fridge');
    const l = { id: 'l1', sourceRecipeId: 'romige-tomatenpasta', label: 'Pasta', portions: 2, storedAt: stored.toISOString(), storage: 'fridge' as const, useBy: useBy.toISOString(), status: 'available' as const };
    expect(leftoverState(l, new Date('2026-10-20T19:00:00+02:00'))).toBe('usable');
    expect(leftoverState(l, new Date('2026-10-21T19:00:01+02:00'))).toBe('check_needed');
    expect(leftoverState({ ...l, status: 'unsafe' }, new Date('2026-10-20T08:00:00+02:00'))).toBe('check_needed');
  });
});
