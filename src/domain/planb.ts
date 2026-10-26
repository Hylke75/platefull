// Plan B (S-05, F-010): de kleinst mogelijke aanpassing aan een bestaand slot, als diff.
// Preview heeft geen side-effects; toepassen gebeurt atomair op de server.
import { rankCandidates, type EngineInput } from './engine';
import { pantryAvailability } from './pantry';
import { findResolvingVariant } from './preferences';
import { checkHardRules, effectiveIngredients, effectiveTotalMinutes } from './safety';
import type { Attendee, Recipe, RecipeVariant } from './types';

export type PlanBScenario =
  | { kind: 'less_time'; availableMinutes: number }
  | { kind: 'attendee_absent'; profileIds: string[] }
  | { kind: 'ingredient_missing'; ingredientId: string }
  | { kind: 'taste_conflict'; profileId: string; ingredientId: string };

export interface CurrentSlot {
  slotId: string;
  revision: number;
  recipe: Recipe;
  variants: RecipeVariant[];
  attendees: Attendee[];
}

export interface PlanDiff {
  eaters?: { from: number; to: number };
  minutes?: { from: number; to: number };
  recipe?: { from: string; to: string; fromName: string; toName: string };
  substitutions?: { from: string; to: string; fromName: string; toName: string }[];
  servedSeparately?: { ingredientId: string; name: string; forProfileId: string }[];
  attendees?: { profileId: string; from: Attendee['attendance']; to: Attendee['attendance'] }[];
}

export type PlanBOutcome =
  | {
      status: 'ok';
      title: string;
      explanation: string;
      bullets: string[];
      diff: PlanDiff;
      next: { recipeId: string; variantIds: string[]; attendees: Attendee[] };
    }
  | { status: 'no_change_needed'; explanation: string }
  | { status: 'not_possible'; explanation: string };

const MAX_FREE_TEXT = 500;
/** Vrije tekst is alleen context — nooit autorisatie om harde regels te passeren. */
export function sanitizeFreeText(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = text.replace(/[\u0000-\u001f]/g, ' ').trim();
  return t ? t.slice(0, MAX_FREE_TEXT) : null;
}

function eaters(attendees: readonly Attendee[]): number {
  return attendees.filter((a) => a.attendance !== 'no').length;
}

function safeFor(recipe: Recipe, variants: readonly RecipeVariant[], attendees: readonly Attendee[], input: EngineInput): boolean {
  return checkHardRules(recipe, variants, attendees, input.rulesByProfile, input.catalog).safe;
}

function nameOf(input: EngineInput, id: string): string {
  return input.catalog.get(id)?.canonicalName ?? id;
}

/** Alternatief recept zoeken binnen de gecontroleerde catalogus, met dezelfde veiligheidsfilters als het hoofdvoorstel. */
function alternative(input: EngineInput, slot: CurrentSlot, overrides: Partial<EngineInput>) {
  const res = rankCandidates({ ...input, attendees: slot.attendees, excludeRecipeIds: [slot.recipe.id], ...overrides });
  return res.ranked[0] ?? null;
}

export function previewPlanB(slot: CurrentSlot, scenario: PlanBScenario, input: EngineInput): PlanBOutcome {
  const curMinutes = effectiveTotalMinutes(slot.recipe, slot.variants);
  const curEaters = eaters(slot.attendees);

  switch (scenario.kind) {
    case 'less_time': {
      const target = scenario.availableMinutes;
      if (curMinutes <= target) return { status: 'no_change_needed', explanation: `${slot.recipe.name} past al binnen ${target} minuten (${curMinutes} min).` };
      // 1. Gecontroleerde snellere variant van hetzelfde gerecht.
      const quick = slot.recipe.variants.find((v) => v.changes.some((c) => c.op === 'time') && !slot.variants.includes(v));
      if (quick) {
        const vs = [...slot.variants, quick];
        const m = effectiveTotalMinutes(slot.recipe, vs);
        if (m <= target && safeFor(slot.recipe, vs, slot.attendees, input)) {
          const note = quick.changes.find((c) => c.op === 'time');
          return {
            status: 'ok', title: `${slot.recipe.name} in ${m} minuten`,
            explanation: note && note.op === 'time' ? note.note : quick.name,
            bullets: [`${curMinutes - m} minuten sneller`, 'Zelfde boodschappen'],
            diff: { minutes: { from: curMinutes, to: m } },
            next: { recipeId: slot.recipe.id, variantIds: vs.map((v) => v.id), attendees: slot.attendees },
          };
        }
      }
      // 2. Ander gecontroleerd gerecht dat aantoonbaar past.
      const alt = alternative(input, slot, { context: { ...input.context, availableMinutes: target } });
      if (!alt) return { status: 'not_possible', explanation: `We vinden geen gecontroleerd gerecht dat aantoonbaar binnen ${target} minuten past. Kies zelf of geef meer tijd op.` };
      const altRecipe = input.recipes.find((r) => r.id === alt.recipeId)!;
      return {
        status: 'ok', title: `${altRecipe.name} in ${alt.totalMinutes} minuten`,
        explanation: `${slot.recipe.name} duurt ${curMinutes} minuten. Dit gerecht past wel binnen ${target} minuten.`,
        bullets: [`${curMinutes - alt.totalMinutes} minuten sneller`, ...alt.reasons.filter((r) => !r.endsWith(' min')).slice(0, 1)],
        diff: { minutes: { from: curMinutes, to: alt.totalMinutes }, recipe: { from: slot.recipe.id, to: altRecipe.id, fromName: slot.recipe.name, toName: altRecipe.name } },
        next: { recipeId: altRecipe.id, variantIds: alt.variantIds, attendees: slot.attendees },
      };
    }

    case 'attendee_absent': {
      const attendees = slot.attendees.map((a) => a.profileId && scenario.profileIds.includes(a.profileId) ? { ...a, attendance: 'no' as const } : a);
      const to = eaters(attendees);
      if (to === curEaters) return { status: 'no_change_needed', explanation: 'Deze personen stonden al niet als eter gepland.' };
      if (to === 0) return { status: 'not_possible', explanation: 'Dan eet er niemand mee. Annuleer de maaltijd in het weekplan als dat klopt.' };
      return {
        status: 'ok', title: 'Dezelfde maaltijd, minder porties',
        explanation: `${slot.recipe.name} blijft op het menu, voor ${to} in plaats van ${curEaters} personen. Hoeveelheden en boodschappen rekenen mee.`,
        bullets: [`${to} ${to === 1 ? 'persoon' : 'personen'} vanavond`, 'Boodschappen automatisch bijgewerkt'],
        diff: {
          eaters: { from: curEaters, to },
          attendees: slot.attendees.filter((a) => a.profileId && scenario.profileIds.includes(a.profileId) && a.attendance !== 'no').map((a) => ({ profileId: a.profileId!, from: a.attendance, to: 'no' as const })),
        },
        next: { recipeId: slot.recipe.id, variantIds: slot.variants.map((v) => v.id), attendees },
      };
    }

    case 'ingredient_missing': {
      const missing = scenario.ingredientId;
      if (!effectiveIngredients(slot.recipe, slot.variants).some((i) => i.ingredientId === missing)) {
        return { status: 'no_change_needed', explanation: `${nameOf(input, missing)} zit niet in dit gerecht.` };
      }
      const pantryMap = new Map(input.pantry.map((p) => [p.ingredientId, p]));
      // 1. Gecontroleerde vervanging met aantoonbaar aanwezige voorraad (R-06, F-022).
      for (const v of slot.recipe.variants) {
        if (slot.variants.includes(v)) continue;
        const rep = v.changes.find((c) => c.op === 'replace' && c.from === missing);
        const rem = v.changes.find((c) => c.op === 'remove' && c.ingredientId === missing);
        if (!rep && !rem) continue;
        const vs = [...slot.variants, v];
        if (!safeFor(slot.recipe, vs, slot.attendees, input)) continue;
        if (rep && rep.op === 'replace') {
          const av = pantryAvailability(pantryMap.get(rep.to), null, input.now);
          if (av.status !== 'in_stock') continue;
          return {
            status: 'ok', title: 'Slimme wissel zonder winkelbezoek',
            explanation: `Geen ${nameOf(input, missing).toLowerCase()}? Gebruik ${nameOf(input, rep.to).toLowerCase()} uit de voorraad.`,
            bullets: ['Geen extra winkelbezoek', 'Zelfde basisgerecht'],
            diff: { substitutions: [{ from: missing, to: rep.to, fromName: nameOf(input, missing), toName: nameOf(input, rep.to) }] },
            next: { recipeId: slot.recipe.id, variantIds: vs.map((x) => x.id), attendees: slot.attendees },
          };
        }
        return {
          status: 'ok', title: `Zonder ${nameOf(input, missing).toLowerCase()}`,
          explanation: v.name, bullets: ['Geen extra winkelbezoek', 'Zelfde basisgerecht'],
          diff: { substitutions: [{ from: missing, to: '', fromName: nameOf(input, missing), toName: '—' }] },
          next: { recipeId: slot.recipe.id, variantIds: vs.map((x) => x.id), attendees: slot.attendees },
        };
      }
      // 2. Optioneel ingrediënt: gewoon weglaten.
      const ri = slot.recipe.ingredients.find((i) => i.ingredientId === missing);
      if (ri?.optional) {
        return {
          status: 'ok', title: `Zonder ${nameOf(input, missing).toLowerCase()}`,
          explanation: `${nameOf(input, missing)} is optioneel in dit recept en kan worden weggelaten.`,
          bullets: ['Geen extra winkelbezoek', 'Zelfde basisgerecht'],
          diff: { substitutions: [{ from: missing, to: '', fromName: nameOf(input, missing), toName: '—' }] },
          next: { recipeId: slot.recipe.id, variantIds: slot.variants.map((v) => v.id), attendees: slot.attendees },
        };
      }
      // 3. Ander gerecht zonder dat ingrediënt.
      const alt = alternative(input, slot, { recipes: input.recipes.filter((r) => !r.ingredients.some((i) => i.ingredientId === missing && !i.optional)) });
      if (!alt) return { status: 'not_possible', explanation: `Er is geen gecontroleerde vervanging voor ${nameOf(input, missing).toLowerCase()} beschikbaar. Zet het op de boodschappenlijst of kies zelf.` };
      const altRecipe = input.recipes.find((r) => r.id === alt.recipeId)!;
      return {
        status: 'ok', title: altRecipe.name,
        explanation: `Zonder ${nameOf(input, missing).toLowerCase()} lukt ${slot.recipe.name} niet goed. ${altRecipe.name} past wel.`,
        bullets: alt.reasons.slice(0, 2),
        diff: { recipe: { from: slot.recipe.id, to: altRecipe.id, fromName: slot.recipe.name, toName: altRecipe.name }, minutes: { from: curMinutes, to: alt.totalMinutes } },
        next: { recipeId: altRecipe.id, variantIds: alt.variantIds, attendees: slot.attendees },
      };
    }

    case 'taste_conflict': {
      const who = input.profiles.find((p) => p.id === scenario.profileId)?.displayName ?? 'Je kind';
      const ingName = nameOf(input, scenario.ingredientId).toLowerCase();
      const present = effectiveIngredients(slot.recipe, slot.variants).find((i) => i.ingredientId === scenario.ingredientId);
      if (!present) return { status: 'no_change_needed', explanation: `${nameOf(input, scenario.ingredientId)} zit niet in dit gerecht.` };
      // R-02: saus/topping apart → gelijkwaardig onderdeel → ander basisgerecht.
      if (present.servedSeparately || present.optional || present.component === 'topping' || present.component === 'sauce') {
        return {
          status: 'ok', title: `${nameOf(input, scenario.ingredientId)} gewoon apart`,
          explanation: `${who} lust geen ${ingName}? Serveer het los. De smaakvoorkeur blijft opgeslagen, ook als jij het gerecht kiest.`,
          bullets: ['Eén maaltijd voor iedereen', 'Ouders houden de regie'],
          diff: { servedSeparately: [{ ingredientId: scenario.ingredientId, name: nameOf(input, scenario.ingredientId), forProfileId: scenario.profileId }] },
          next: { recipeId: slot.recipe.id, variantIds: slot.variants.map((v) => v.id), attendees: slot.attendees },
        };
      }
      const v = findResolvingVariant(slot.recipe, scenario.ingredientId);
      if (v && !slot.variants.includes(v) && safeFor(slot.recipe, [...slot.variants, v], slot.attendees, input)) {
        return {
          status: 'ok', title: v.name,
          explanation: `Een gelijkwaardig onderdeel zonder ${ingName} voor ${who}. Het basisgerecht blijft hetzelfde.`,
          bullets: ['Eén maaltijd voor iedereen', 'Ouders houden de regie'],
          diff: { servedSeparately: [{ ingredientId: scenario.ingredientId, name: nameOf(input, scenario.ingredientId), forProfileId: scenario.profileId }] },
          next: { recipeId: slot.recipe.id, variantIds: [...slot.variants, v].map((x) => x.id), attendees: slot.attendees },
        };
      }
      const alt = alternative(input, slot, { recipes: input.recipes.filter((r) => !r.ingredients.some((i) => i.ingredientId === scenario.ingredientId && !i.optional && !i.servedSeparately)) });
      if (!alt) return { status: 'not_possible', explanation: `${ingName} is niet los te serveren en er is geen passend alternatief. Jij kunt het gerecht toch kiezen; ${who} hoeft het onderdeel niet te eten.` };
      const altRecipe = input.recipes.find((r) => r.id === alt.recipeId)!;
      return {
        status: 'ok', title: altRecipe.name,
        explanation: `${ingName} zit door het hele gerecht. ${altRecipe.name} is een gezamenlijk alternatief.`,
        bullets: alt.reasons.slice(0, 2),
        diff: { recipe: { from: slot.recipe.id, to: altRecipe.id, fromName: slot.recipe.name, toName: altRecipe.name } },
        next: { recipeId: altRecipe.id, variantIds: alt.variantIds, attendees: slot.attendees },
      };
    }
  }
}
