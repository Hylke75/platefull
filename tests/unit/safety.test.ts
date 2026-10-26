import { describe, expect, it } from 'vitest';
import { INGREDIENT_MAP } from '@/domain/catalog/ingredients';
import { RECIPE_MAP } from '@/domain/catalog/recipes';
import { rankCandidates } from '@/domain/engine';
import { checkHardRules } from '@/domain/safety';
import type { Ingredient, Recipe } from '@/domain/types';
import { baseInput, everyone, LINA, RUBEN, rule, rules, vosRules } from './fixtures';

const recipe = (id: string) => RECIPE_MAP.get(id)!;

describe('R-01 harde regels', () => {
  it('U-03: notenallergie blokkeert pesto (bevat noten), ook als ouder iets wil', () => {
    const r = rules([rule(LINA, 'allergen', 'nuts', 'HARD_ALLERGY')]);
    const res = checkHardRules(recipe('pasta-pesto-kip'), [], everyone, r, INGREDIENT_MAP);
    expect(res.safe).toBe(false);
    expect(res.blocks.some((b) => b.reason === 'contains_allergen' && b.ingredientId === 'pesto')).toBe(true);
  });

  it('U-03: onvolledige allergeneninformatie is niet bewezen veilig', () => {
    const r = rules([rule(LINA, 'allergen', 'nuts', 'HARD_ALLERGY')]);
    // Wraps (samengesteld product) heeft status 'incomplete'.
    const res = checkHardRules(recipe('wraps-voor-iedereen'), [], everyone, r, INGREDIENT_MAP);
    expect(res.safe).toBe(false);
    expect(res.blocks.map((b) => b.reason)).toContain('allergen_status_unknown');
  });

  it('pinda-allergie blokkeert satésaus, ook als die apart en optioneel geserveerd wordt', () => {
    const r = rules([rule(LINA, 'allergen', 'peanuts', 'HARD_ALLERGY')]);
    const res = checkHardRules(recipe('bami-kip'), [], everyone, r, INGREDIENT_MAP);
    expect(res.blocks.some((b) => b.ingredientId === 'pindasaus' && b.reason === 'contains_allergen')).toBe(true);
  });

  it('een gecontroleerde variant die het allergeen verwijdert maakt het allergeen-specifieke conflict weg', () => {
    const r = rules([rule(LINA, 'allergen', 'peanuts', 'HARD_ALLERGY')]);
    const rec = recipe('kipsate-rijst');
    const variant = rec.variants.find((v) => v.id.endsWith('zonder-satesaus'))!;
    const res = checkHardRules(rec, [variant], everyone, r, INGREDIENT_MAP);
    expect(res.blocks.some((b) => b.ingredientId === 'pindasaus')).toBe(false);
    // Ketjap is een samengesteld product met onvolledige info → blijft blokkeren. Conservatief.
    expect(res.blocks.some((b) => b.ingredientId === 'ketjap' && b.reason === 'allergen_status_unknown')).toBe(true);
  });

  it('een ongecontroleerde variant mag een harde regel nooit oplossen', () => {
    const r = rules([rule(LINA, 'allergen', 'peanuts', 'HARD_ALLERGY')]);
    const rec = recipe('kipsate-rijst');
    const variant = { ...rec.variants[0]!, safetyReviewStatus: 'unreviewed' as const };
    const res = checkHardRules(rec, [variant], everyone, r, INGREDIENT_MAP);
    expect(res.safe).toBe(false);
    expect(res.blocks[0]!.reason).toBe('variant_not_reviewed');
  });

  it('een niet-gecontroleerd (eigen) recept is nooit geschikt bij een harde regel', () => {
    const draft: Recipe = { ...recipe('kleurrijke-rijstbowl'), id: 'eigen', reviewStatus: 'draft', variants: [] };
    const r = rules([rule(LINA, 'allergen', 'peanuts', 'HARD_ALLERGY')]);
    expect(checkHardRules(draft, [], everyone, r, INGREDIENT_MAP).blocks[0]!.reason).toBe('recipe_not_reviewed');
    // Zonder harde regels mag hetzelfde concept wel.
    expect(checkHardRules(draft, [], everyone, rules([]), INGREDIENT_MAP).safe).toBe(true);
  });

  it('vegetarisch dieet blokkeert vlees en onbekende dieetstatus (kaas met mogelijk dierlijk stremsel)', () => {
    const r = rules([rule(RUBEN, 'diet', 'vegetarian', 'HARD_DIET')]);
    expect(checkHardRules(recipe('pasta-bolognese'), [], everyone, r, INGREDIENT_MAP).blocks.some((b) => b.reason === 'violates_diet')).toBe(true);
    expect(checkHardRules(recipe('champignonrisotto'), [], everyone, r, INGREDIENT_MAP).blocks.some((b) => b.reason === 'diet_status_unknown' && b.ingredientId === 'parmezaan')).toBe(true);
  });

  it('afwezige eters tellen niet mee voor harde regels', () => {
    const r = rules([rule(LINA, 'allergen', 'nuts', 'HARD_ALLERGY')]);
    const attendees = everyone.map((a) => (a.profileId === LINA ? { ...a, attendance: 'no' as const } : a));
    expect(checkHardRules(recipe('pasta-pesto-kip'), [], attendees, r, INGREDIENT_MAP).safe).toBe(true);
  });

  it('onbekende aanwezigheid telt wél mee (conservatief)', () => {
    const r = rules([rule(LINA, 'allergen', 'nuts', 'HARD_ALLERGY')]);
    const attendees = everyone.map((a) => (a.profileId === LINA ? { ...a, attendance: 'unknown' as const } : a));
    expect(checkHardRules(recipe('pasta-pesto-kip'), [], attendees, r, INGREDIENT_MAP).safe).toBe(false);
  });

  it('gast zonder bekende allergieën geeft een waarschuwing en verhindert het label', () => {
    const attendees = [...everyone, { profileId: null, guestLabel: 'Oma', attendance: 'yes' as const }];
    const res = checkHardRules(recipe('kleurrijke-rijstbowl'), [], attendees, rules([]), INGREDIENT_MAP);
    expect(res.safe).toBe(true);
    expect(res.cautions[0]!.reason).toBe('guest_allergies_unknown');
    const engine = rankCandidates(baseInput({ attendees }));
    expect(engine.fitLabelAllowed).toBe(false);
  });

  it('onbekend ingrediënt in een recept blokkeert bij een harde regel', () => {
    const catalog = new Map<string, Ingredient>(INGREDIENT_MAP);
    catalog.delete('rijst');
    const r = rules([rule(LINA, 'allergen', 'nuts', 'HARD_ALLERGY')]);
    expect(checkHardRules(recipe('kleurrijke-rijstbowl'), [], everyone, r, catalog).blocks.some((b) => b.reason === 'ingredient_unknown')).toBe(true);
  });
});

describe('§7.2 engine: hard filter vóór ranking', () => {
  it('U-03: geen enkel voorgesteld recept bevat noten of onzekere allergeneninformatie voor Lina', () => {
    const res = rankCandidates(baseInput({ rulesByProfile: vosRules(), context: { availableMinutes: null, equipment: null, skill: 'medium', weeklyBudgetCents: null } }));
    for (const c of res.ranked) {
      const rec = RECIPE_MAP.get(c.recipeId)!;
      const variants = rec.variants.filter((v) => c.variantIds.includes(v.id));
      expect(checkHardRules(rec, variants, everyone, vosRules(), INGREDIENT_MAP).safe).toBe(true);
    }
    expect(res.rejected.find((r) => r.recipeId === 'pasta-pesto-kip')?.stage).toBe('hard');
  });

  it('nul veilige kandidaten → status no_safe_candidate met uitleg, geen voorstel', () => {
    const r = rules([rule(LINA, 'allergen', 'gluten', 'HARD_ALLERGY'), rule(LINA, 'allergen', 'milk', 'HARD_ALLERGY'), rule(RUBEN, 'diet', 'vegan', 'HARD_DIET')]);
    const res = rankCandidates(baseInput({ rulesByProfile: r, context: { availableMinutes: 15, equipment: null, skill: 'medium', weeklyBudgetCents: null } }));
    expect(res.status).toBe('no_safe_candidate');
    expect(res.ranked).toHaveLength(0);
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it('een hoge totaalscore compenseert nooit een harde uitsluiting', () => {
    // Iedereen dol op pesto én alles op voorraad: toch geblokkeerd.
    const r = vosRules();
    r.set(LINA, [...r.get(LINA)!, rule(LINA, 'ingredient', 'pesto', 'LIKE')]);
    const pantry = RECIPE_MAP.get('pasta-pesto-kip')!.ingredients.map((i) => ({ ingredientId: i.ingredientId, quantity: 9999, unit: i.unit, status: 'confirmed' as const, verifiedAt: '2026-10-20T08:00:00Z', expiresAt: null }));
    const res = rankCandidates(baseInput({ rulesByProfile: r, pantry }));
    expect(res.ranked.map((c) => c.recipeId)).not.toContain('pasta-pesto-kip');
  });
});
