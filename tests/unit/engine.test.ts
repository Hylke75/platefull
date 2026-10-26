import { describe, expect, it } from 'vitest';
import { INGREDIENT_MAP } from '@/domain/catalog/ingredients';
import { RECIPE_MAP, RECIPES } from '@/domain/catalog/recipes';
import { rankCandidates, WEIGHTS } from '@/domain/engine';
import { applyHouseholdChecks } from '@/domain/household-checks';
import { evaluatePreferences } from '@/domain/preferences';
import { baseInput, EMMA, everyone, LINA, NOW, SAM, rule, rules, vosRules } from './fixtures';

describe('§7.3 gewichten', () => {
  it('tellen op tot 100%', () => {
    expect(Object.values(WEIGHTS).reduce((s, x) => s + x, 0)).toBeCloseTo(1, 10);
  });
});

describe('catalogus', () => {
  it('bevat minimaal 30 volledig gestructureerde recepten met bestaande ingrediënten', () => {
    expect(RECIPES.length).toBeGreaterThanOrEqual(30);
    for (const r of RECIPES) {
      expect(r.ingredients.length, r.id).toBeGreaterThan(0);
      expect(r.steps.length, r.id).toBeGreaterThan(0);
      for (const i of r.ingredients) expect(INGREDIENT_MAP.has(i.ingredientId), `${r.id}: ${i.ingredientId}`).toBe(true);
      for (const v of r.variants) {
        for (const c of v.changes) {
          if (c.op === 'replace') expect(INGREDIENT_MAP.has(c.to), `${v.id}`).toBe(true);
        }
      }
    }
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length);
  });
});

describe('U-02 kind wijst champignons af', () => {
  it('zachte afkeur = penalty en eerst een variant zonder champignons; de afkeer blijft staan', () => {
    const r = rules([rule(LINA, 'ingredient', 'champignons', 'STRONG_DISLIKE')]);
    const rec = RECIPE_MAP.get('omelet-groente')!;
    const before = evaluatePreferences(rec, [], everyone, r, new Map());
    expect(before.conflicts[0]).toMatchObject({ profileId: LINA, ingredientId: 'champignons' });
    const res = rankCandidates(baseInput({ rulesByProfile: r }));
    const omelet = res.ranked.find((c) => c.recipeId === 'omelet-groente');
    // Champignons zijn optioneel in de omelet: apart houden volstaat (R-02: eerst topping apart).
    expect(omelet?.preference.conflicts[0]?.resolution).toBe('topping_apart');
    expect(r.get(LINA)).toHaveLength(1);
  });

  it('niet-scheidbare sterke afkeer: lager gescoord, niet uitgesloten zolang de ouder beslist', () => {
    const r = rules([rule(LINA, 'ingredient', 'champignons', 'STRONG_DISLIKE')]);
    const res = rankCandidates(baseInput({ rulesByProfile: r, context: { availableMinutes: 60, equipment: null, skill: 'medium', weeklyBudgetCents: null } }));
    const risotto = res.ranked.find((c) => c.recipeId === 'champignonrisotto');
    expect(risotto).toBeDefined();
    expect(risotto!.preference.conflicts[0]!.resolution).toBe('none');
    const without = rankCandidates(baseInput({ context: { availableMinutes: 60, equipment: null, skill: 'medium', weeklyBudgetCents: null } }));
    expect(risotto!.components.preference.value).toBeLessThan(without.ranked.find((c) => c.recipeId === 'champignonrisotto')!.components.preference.value);
  });

  it('ouderlijke regie uit: onoplosbare sterke afkeer wordt een veto in de suggesties', () => {
    const r = rules([rule(LINA, 'ingredient', 'champignons', 'STRONG_DISLIKE')]);
    const res = rankCandidates(baseInput({ rulesByProfile: r, parentDecides: new Map([[LINA, false]]), context: { availableMinutes: 60, equipment: null, skill: 'medium', weeklyBudgetCents: null } }));
    expect(res.ranked.find((c) => c.recipeId === 'champignonrisotto')).toBeUndefined();
    expect(res.rejected.find((x) => x.recipeId === 'champignonrisotto')?.stage).toBe('veto');
  });

  it('rauwe tomaat ≠ tomatensaus', () => {
    const r = rules([rule(SAM, 'ingredient', 'tomaat', 'SOFT_DISLIKE', 'raw')]);
    const pasta = evaluatePreferences(RECIPE_MAP.get('romige-tomatenpasta')!, [], everyone, r, new Map());
    expect(pasta.conflicts).toHaveLength(0);
    const wraps = evaluatePreferences(RECIPE_MAP.get('wraps-voor-iedereen')!, [], everyone, r, new Map());
    expect(wraps.conflicts[0]).toMatchObject({ ingredientId: 'tomaat', resolution: 'topping_apart' });
  });

  it('onbekend wordt niet als lekker behandeld', () => {
    const r = rules([rule(EMMA, 'tag', 'pasta', 'UNKNOWN')]);
    const p = evaluatePreferences(RECIPE_MAP.get('romige-tomatenpasta')!, [], everyone, r, new Map());
    expect(p.likes).toHaveLength(0);
    expect(p.fit).toBe(0.5);
  });
});

describe('haalbaarheid en uitleg', () => {
  it('U-05: geen recept boven de beschikbare tijd', () => {
    const res = rankCandidates(baseInput({ context: { availableMinutes: 20, equipment: null, skill: 'medium', weeklyBudgetCents: null } }));
    for (const c of res.ranked) expect(c.totalMinutes).toBeLessThanOrEqual(20);
  });

  it('apparatuur ontbreekt → geen ovenrecepten', () => {
    const res = rankCandidates(baseInput({ context: { availableMinutes: 60, equipment: ['stove'], skill: 'medium', weeklyBudgetCents: null } }));
    for (const c of res.ranked) expect(RECIPE_MAP.get(c.recipeId)!.equipment).not.toContain('oven');
  });

  it('maximaal drie redenen; ontbrekende data neutraal en zichtbaar onbekend', () => {
    const res = rankCandidates(baseInput({ rulesByProfile: vosRules() }));
    expect(res.ranked.length).toBeGreaterThan(0);
    for (const c of res.ranked) expect(c.reasons.length).toBeLessThanOrEqual(3);
    expect(res.ranked[0]!.components.budget).toEqual({ value: 0.5, known: false });
    expect(res.ranked[0]!.components.pantry).toEqual({ value: 0.5, known: false });
  });

  it('deterministisch: dezelfde input geeft dezelfde volgorde', () => {
    const a = rankCandidates(baseInput({ rulesByProfile: vosRules() })).ranked.map((c) => c.recipeId);
    const b = rankCandidates(baseInput({ rulesByProfile: vosRules() })).ranked.map((c) => c.recipeId);
    expect(a).toEqual(b);
  });

  it('geen voorkeuren → insufficient_data, maar wel veilige kandidaten', () => {
    const res = rankCandidates(baseInput());
    expect(res.status).toBe('insufficient_data');
    expect(res.ranked.length).toBeGreaterThan(0);
  });

  it('niemand eet mee → geen voorstel', () => {
    const res = rankCandidates(baseInput({ attendees: everyone.map((a) => ({ ...a, attendance: 'no' as const })) }));
    expect(res.ranked).toHaveLength(0);
  });

  it('onbekende aanwezigheid → waarschuwing en geen fit-label', () => {
    const res = rankCandidates(baseInput({ attendees: everyone.map((a, i) => (i === 0 ? { ...a, attendance: 'unknown' as const } : a)) }));
    expect(res.fitLabelAllowed).toBe(false);
    expect(res.warnings.join(' ')).toMatch(/bevestig/);
  });
});

describe('U-03 met etiketcontrole', () => {
  it('na etiketcontrole van de wraps (geen noten) kunnen wraps weer voor Lina', () => {
    const r = rules([rule(LINA, 'allergen', 'nuts', 'HARD_ALLERGY')]);
    const before = rankCandidates(baseInput({ rulesByProfile: r }));
    expect(before.ranked.find((c) => c.recipeId === 'wraps-voor-iedereen')).toBeUndefined();
    const catalog = applyHouseholdChecks(INGREDIENT_MAP, [
      { ingredientId: 'wraps', containsAllergens: ['gluten'], diet: { meat: false, pork: false, fish: false, animal: false }, checkedAt: '2026-10-01T10:00:00Z' },
      { ingredientId: 'yoghurtsaus', containsAllergens: ['milk'], diet: { meat: false, pork: false, fish: false, animal: true }, checkedAt: '2026-10-01T10:00:00Z' },
    ], NOW);
    const after = rankCandidates(baseInput({ rulesByProfile: r, catalog }));
    expect(after.ranked.find((c) => c.recipeId === 'wraps-voor-iedereen')).toBeDefined();
  });

  it('een etiketcontrole kan nooit een bekend allergeen wegnemen', () => {
    const catalog = applyHouseholdChecks(INGREDIENT_MAP, [{ ingredientId: 'pesto', containsAllergens: [], diet: null, checkedAt: '2026-10-01T10:00:00Z' }], NOW);
    expect(catalog.get('pesto')!.allergens).toContain('nuts');
  });

  it('een verlopen etiketcontrole telt niet', () => {
    const catalog = applyHouseholdChecks(INGREDIENT_MAP, [{ ingredientId: 'wraps', containsAllergens: ['gluten'], diet: null, checkedAt: '2025-01-01T10:00:00Z' }], NOW);
    expect(catalog.get('wraps')!.allergenStatus).toBe('incomplete');
  });
});

describe('R-04 / U-10 weekvariatie', () => {
  it('identiek gerecht binnen 7 dagen wordt niet voorgesteld als er alternatieven zijn', () => {
    const history = [{ localDate: '2026-10-18', recipeId: 'kleurrijke-rijstbowl', profileIds: [] }];
    const res = rankCandidates(baseInput({ history }));
    expect(res.ranked.map((c) => c.recipeId)).not.toContain('kleurrijke-rijstbowl');
  });

  it('gezin mag het bewust opnieuw kiezen', () => {
    const history = [{ localDate: '2026-10-18', recipeId: 'kleurrijke-rijstbowl', profileIds: [] }];
    const res = rankCandidates(baseInput({ history, allowRepeatRecipeIds: ['kleurrijke-rijstbowl'] }));
    expect(res.ranked.map((c) => c.recipeId)).toContain('kleurrijke-rijstbowl');
  });

  it('U-10: twee keer wraps deze week → gelijkwaardig alternatief scoort hoger op afwisseling', () => {
    const history = [
      { localDate: '2026-10-14', recipeId: 'tacos-gehakt', profileIds: [] },
      { localDate: '2026-10-16', recipeId: 'chili-sin-carne', profileIds: [] },
    ];
    const res = rankCandidates(baseInput({ history }));
    const mex = res.ranked.find((c) => c.recipeId === 'wraps-voor-iedereen')!;
    const ital = res.ranked.find((c) => c.recipeId === 'romige-tomatenpasta')!;
    expect(ital.components.variety.value).toBeGreaterThan(mex.components.variety.value);
  });
});

describe('R-06 / U-08 voorraad', () => {
  it('onbekende voorraad telt niet als in huis', () => {
    const pantry = [{ ingredientId: 'kikkererwten', quantity: null, unit: null, status: 'unknown' as const, verifiedAt: null, expiresAt: null }];
    const res = rankCandidates(baseInput({ pantry }));
    const bowl = res.ranked.find((c) => c.recipeId === 'kleurrijke-rijstbowl')!;
    expect(bowl.inStock).not.toContain('kikkererwten');
    expect(bowl.pantryChecks).toContain('kikkererwten');
  });

  it('bevestigde voorraad telt mee en levert een verifieerbare reden', () => {
    const pantry = [{ ingredientId: 'courgette', quantity: 2, unit: 'stuk' as const, status: 'confirmed' as const, verifiedAt: '2026-10-19T10:00:00Z', expiresAt: null }];
    const res = rankCandidates(baseInput({ pantry }));
    const bowl = res.ranked.find((c) => c.recipeId === 'kleurrijke-rijstbowl')!;
    expect(bowl.inStock).toContain('courgette');
    expect(bowl.reasons).toContain('courgette op voorraad');
  });

  it('oude verificatie vraagt bevestiging', () => {
    const pantry = [{ ingredientId: 'courgette', quantity: 2, unit: 'stuk' as const, status: 'confirmed' as const, verifiedAt: '2026-09-01T10:00:00Z', expiresAt: null }];
    const bowl = rankCandidates(baseInput({ pantry })).ranked.find((c) => c.recipeId === 'kleurrijke-rijstbowl')!;
    expect(bowl.inStock).not.toContain('courgette');
    expect(bowl.pantryChecks).toContain('courgette');
  });
});
