// De harde veiligheidscontrole bestaat twee keer: in TypeScript (engine/postvalidatie) en in SQL
// (laatste verdedigingslinie in commit_slot_change). Deze test bewaakt dat beide exact gelijk oordelen.
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INGREDIENT_MAP } from '@/domain/catalog/ingredients';
import { RECIPES } from '@/domain/catalog/recipes';
import { applyHouseholdChecks } from '@/domain/household-checks';
import { checkHardRules } from '@/domain/safety';
import type { ProfileRule } from '@/domain/types';
import { connect, createUser, freshDatabase } from './harness';

let admin: pg.Client;
const USER = '40000000-0000-4000-8000-000000000001';
const HID = '40000000-0000-4000-8000-0000000000aa';
const P1 = '40000000-0000-4000-8000-0000000000b1';
const P2 = '40000000-0000-4000-8000-0000000000b2';

type R = Pick<ProfileRule, 'targetType' | 'targetId' | 'severity'> & { profileId: string };
const RULE_SETS: Record<string, R[]> = {
  noten: [{ profileId: P1, targetType: 'allergen', targetId: 'nuts', severity: 'HARD_ALLERGY' }],
  pinda: [{ profileId: P1, targetType: 'allergen', targetId: 'peanuts', severity: 'HARD_ALLERGY' }],
  gluten_medisch: [{ profileId: P1, targetType: 'allergen', targetId: 'gluten', severity: 'HARD_MEDICAL' }],
  melk: [{ profileId: P2, targetType: 'allergen', targetId: 'milk', severity: 'HARD_ALLERGY' }],
  vegetarisch: [{ profileId: P2, targetType: 'diet', targetId: 'vegetarian', severity: 'HARD_DIET' }],
  vegan: [{ profileId: P2, targetType: 'diet', targetId: 'vegan', severity: 'HARD_DIET' }],
  pesco: [{ profileId: P1, targetType: 'diet', targetId: 'pescatarian', severity: 'HARD_DIET' }],
  geen_varken: [{ profileId: P1, targetType: 'diet', targetId: 'no_pork', severity: 'HARD_DIET' }],
  ingredient_tomaat: [{ profileId: P1, targetType: 'ingredient', targetId: 'tomaat', severity: 'HARD_ALLERGY' }],
  ingredient_bonen_medisch: [{ profileId: P2, targetType: 'ingredient', targetId: 'zwarte-bonen', severity: 'HARD_MEDICAL' }],
  combinatie: [
    { profileId: P1, targetType: 'allergen', targetId: 'nuts', severity: 'HARD_ALLERGY' },
    { profileId: P2, targetType: 'diet', targetId: 'vegetarian', severity: 'HARD_DIET' },
  ],
};

const CHECKS = [
  { ingredientId: 'wraps', containsAllergens: ['gluten'] as const, diet: { meat: false, pork: false, fish: false, animal: false } },
  { ingredientId: 'pasta', containsAllergens: ['gluten', 'eggs'] as const, diet: { meat: false, pork: false, fish: false, animal: true } },
];

beforeAll(async () => {
  const url = await freshDatabase('plateful_consistency');
  admin = await connect(url);
  await createUser(admin, USER, 'c@example.nl');
  await admin.query(`insert into public.households (id, name, created_by) values ($1, 'Test', $2)`, [HID, USER]);
  await admin.query(`insert into public.profiles (id, household_id, display_name, age_band) values ($1, $3, 'Een', 'child'), ($2, $3, 'Twee', 'adult')`, [P1, P2, HID]);
});

afterAll(async () => { await admin?.end(); });

describe('TS checkHardRules ≡ SQL private.hard_violations', () => {
  for (const withChecks of [false, true]) {
    for (const [name, set] of Object.entries(RULE_SETS)) {
      it(`${name}${withChecks ? ' + etiketcontroles' : ''}`, async () => {
        await admin.query('delete from public.profile_rules where household_id = $1', [HID]);
        await admin.query('delete from public.household_ingredient_checks where household_id = $1', [HID]);
        for (const r of set) {
          await admin.query(`insert into public.profile_rules (household_id, profile_id, target_type, target_id, severity, source) values ($1,$2,$3,$4,$5,'adult')`, [HID, r.profileId, r.targetType, r.targetId, r.severity]);
        }
        const now = new Date();
        if (withChecks) {
          for (const c of CHECKS) {
            await admin.query(`insert into public.household_ingredient_checks (household_id, ingredient_id, contains_allergens, diet, checked_by) values ($1,$2,$3,$4,$5)`, [HID, c.ingredientId, c.containsAllergens, JSON.stringify(c.diet), USER]);
          }
        }
        const catalog = withChecks ? applyHouseholdChecks(INGREDIENT_MAP, CHECKS.map((c) => ({ ...c, containsAllergens: [...c.containsAllergens], checkedAt: now.toISOString() })), now) : INGREDIENT_MAP;
        const rulesByProfile = new Map<string, ProfileRule[]>();
        set.forEach((r, i) => rulesByProfile.set(r.profileId, [...(rulesByProfile.get(r.profileId) ?? []), { ...r, id: `r${i}`, preparation: 'any', source: 'adult' }]));
        const attendees = [{ profileId: P1, attendance: 'yes' as const }, { profileId: P2, attendance: 'yes' as const }];

        const mismatches: string[] = [];
        for (const recipe of RECIPES) {
          for (const variants of [[], ...recipe.variants.map((v) => [v])]) {
            const ts = checkHardRules(recipe, variants, attendees, rulesByProfile, catalog).safe;
            const sql = (await admin.query<{ n: number }>('select private.hard_violations($1, $2, $3, $4) as n', [HID, recipe.id, variants.map((v) => v.id), [P1, P2]])).rows[0]!.n === 0;
            if (ts !== sql) mismatches.push(`${recipe.id}${variants[0] ? `+${variants[0].id}` : ''}: ts=${ts} sql=${sql}`);
          }
        }
        expect(mismatches).toEqual([]);
      });
    }
  }
});
