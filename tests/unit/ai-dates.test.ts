import { describe, expect, it } from 'vitest';
import { addDays, localDate, weekStart } from '@/domain/dates';
import { rankCandidates } from '@/domain/engine';
import { dietViolated } from '@/domain/safety';
import { validateAiOutput } from '@/server/ai';
import { baseInput, vosRules } from './fixtures';

const result = rankCandidates(baseInput({ rulesByProfile: vosRules(), context: { availableMinutes: null, equipment: null, skill: 'medium', weeklyBudgetCents: null } }));
const safeId = result.ranked[0]!.recipeId;
const ok = (over: Record<string, unknown> = {}) => ({
  status: 'ok', suggested_recipe_id: safeId, alternative_recipe_ids: [], optional_variant_ids: [], reasons: ['Snel klaar'],
  warnings: [], plan_diff: null, confidence_label: 'hoog', ...over,
});

describe('§7.4/7.5 AI-outputvalidatie', () => {
  it('accepteert een keuze uit de veilige set', () => {
    expect(validateAiOutput(ok(), result)).toMatchObject({ status: 'ok', suggestedRecipeId: safeId });
  });
  it('weigert een niet-bestaand of onveilig recept', () => {
    expect(validateAiOutput(ok({ suggested_recipe_id: 'pasta-pesto-kip' }), result).status).toBe('rejected');
    expect(validateAiOutput(ok({ suggested_recipe_id: 'verzonnen-gerecht' }), result).status).toBe('rejected');
    expect(validateAiOutput(ok({ alternative_recipe_ids: ['pasta-pesto-kip'] }), result).status).toBe('rejected');
  });
  it('weigert zelfbedachte varianten en schema-afwijkingen', () => {
    expect(validateAiOutput(ok({ optional_variant_ids: ['wraps-voor-iedereen--kikkererwten'] }), result).status).toBe('rejected');
    expect(validateAiOutput({ ...ok(), reasons: ['a', 'b', 'c', 'd'] }, result).status).toBe('rejected');
    expect(validateAiOutput('geen json', result).status).toBe('rejected');
  });
  it('filtert veiligheids- en gezondheidsclaims uit de redenen', () => {
    const out = validateAiOutput(ok({ reasons: ['Veilig voor Lina', 'Gezond en snel', 'Courgette op voorraad'] }), result);
    expect(out).toMatchObject({ status: 'ok', reasons: ['Courgette op voorraad'] });
  });
  it('status anders dan ok → geen AI-keuze (deterministische fallback)', () => {
    expect(validateAiOutput(ok({ status: 'unavailable', suggested_recipe_id: null }), result).status).toBe('rejected');
  });
});

describe('dieetvlaggen per kenmerk', () => {
  it('onbekend kenmerk telt als onbekend, bekend plantaardig niet', () => {
    expect(dietViolated('vegetarian', { diet: { meat: false, pork: false, fish: false, animal: null } })).toBe(false);
    expect(dietViolated('vegan', { diet: { meat: false, pork: false, fish: false, animal: null } })).toBe('unknown');
    expect(dietViolated('vegetarian', { diet: { meat: null, pork: false, fish: false, animal: true } })).toBe('unknown');
    expect(dietViolated('no_pork', { diet: { meat: true, pork: true, fish: false, animal: true } })).toBe(true);
    expect(dietViolated('pescatarian', { diet: { meat: false, pork: false, fish: true, animal: true } })).toBe(false);
    expect(dietViolated('vegetarian', { diet: null })).toBe('unknown');
  });
});

describe('datums Europe/Amsterdam', () => {
  it('lokale datum rond middernacht en zomertijd', () => {
    expect(localDate(new Date('2026-10-24T22:30:00Z'))).toBe('2026-10-25'); // 00:30 zomertijd
    expect(localDate(new Date('2026-10-25T22:30:00Z'))).toBe('2026-10-25'); // 23:30 wintertijd
    expect(localDate(new Date('2026-03-28T23:30:00Z'))).toBe('2026-03-29');
  });
  it('week begint op maandag', () => {
    expect(weekStart('2026-10-26')).toBe('2026-10-26');
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });
});
