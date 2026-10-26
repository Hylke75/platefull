// Deterministische aanbevelingsengine (§7.2 stappen 3–6 en 9).
// Harde uitsluitingen worden VÓÓR de ranking gefilterd en kunnen nooit door een hoge score worden gecompenseerd.
import { pantryAvailability } from './pantry';
import { evaluatePreferences, type PreferenceEvaluation } from './preferences';
import { checkHardRules, effectiveIngredients, effectiveTotalMinutes, type HardBlock, type IngredientCatalog } from './safety';
import { scaleQuantity, toBase } from './units';
import type {
  Attendee, FeedbackEntry, HistoryEntry, HouseholdContext, Leftover, PantryItem, Profile, ProfileRule, Recipe, RecipeVariant,
} from './types';

/** §7.3 startgewichten — producthypothesen. */
export const WEIGHTS = {
  preference: 0.30,
  time: 0.20,
  pantry: 0.15,
  budget: 0.10,
  variety: 0.10,
  tableBalance: 0.10,
  leftovers: 0.05,
} as const;
export type ScoreComponent = keyof typeof WEIGHTS;

export interface EngineInput {
  localDate: string; // YYYY-MM-DD, Europe/Amsterdam
  now: Date;
  profiles: readonly Profile[];
  attendees: readonly Attendee[];
  rulesByProfile: ReadonlyMap<string, readonly ProfileRule[]>;
  parentDecides: ReadonlyMap<string, boolean>;
  context: HouseholdContext;
  recipes: readonly Recipe[];
  catalog: IngredientCatalog;
  pantry: readonly PantryItem[];
  leftovers: readonly Leftover[];
  history: readonly HistoryEntry[];
  feedback: readonly FeedbackEntry[];
  /** Recepten die het gezin bewust opnieuw kiest ondanks R-04. */
  allowRepeatRecipeIds?: readonly string[];
  /** Recepten die niet mogen terugkomen in dit verzoek (bijv. huidige suggestie bij 'Ander idee'). */
  excludeRecipeIds?: readonly string[];
}

export interface ScoredCandidate {
  recipeId: string;
  variantIds: string[];
  score: number;
  components: Record<ScoreComponent, { value: number; known: boolean }>;
  preference: PreferenceEvaluation;
  totalMinutes: number;
  activeMinutes: number;
  eaters: number;
  reasons: string[];
  /** Ingrediënten waarvan de voorraad gecontroleerd moet worden (U-08). */
  pantryChecks: string[];
  inStock: string[];
}

export interface RejectedCandidate {
  recipeId: string;
  stage: 'hard' | 'feasibility' | 'variety' | 'veto' | 'excluded';
  blocks?: HardBlock[];
  detail?: string;
}

export type EngineStatus = 'ok' | 'insufficient_data' | 'no_safe_candidate';

export interface EngineResult {
  status: EngineStatus;
  ranked: ScoredCandidate[];
  rejected: RejectedCandidate[];
  warnings: string[];
  /** 'Past bij jullie gezin' mag alleen als alle harde checks zijn doorlopen en er geen open vragen zijn (S-03.3). */
  fitLabelAllowed: boolean;
  confidence: 'hoog' | 'gemiddeld' | 'laag';
  eaters: number;
}

const DAY = 24 * 60 * 60 * 1000;
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / DAY);
}

export function countEaters(attendees: readonly Attendee[]): number {
  return attendees.filter((a) => a.attendance !== 'no').length;
}

/** Kies de minimale set gecontroleerde varianten die een recept veilig maakt (max. één variant per poging). */
function safeVariantChoice(recipe: Recipe, input: EngineInput): { variants: RecipeVariant[] } | { blocks: HardBlock[] } {
  const base = checkHardRules(recipe, [], input.attendees, input.rulesByProfile, input.catalog);
  if (base.safe) return { variants: [] };
  for (const v of recipe.variants) {
    if (v.safetyReviewStatus !== 'reviewed') continue;
    const r = checkHardRules(recipe, [v], input.attendees, input.rulesByProfile, input.catalog);
    if (r.safe) return { variants: [v] };
  }
  return { blocks: base.blocks };
}

function names(input: EngineInput): Map<string, string> {
  return new Map(input.profiles.map((p) => [p.id, p.displayName]));
}

export function rankCandidates(input: EngineInput): EngineResult {
  const warnings: string[] = [];
  const rejected: RejectedCandidate[] = [];
  const eaters = countEaters(input.attendees);
  const profileNames = names(input);

  if (eaters === 0) {
    return { status: 'insufficient_data', ranked: [], rejected, warnings: ['Er eet vanavond niemand mee volgens de planning.'], fitLabelAllowed: false, confidence: 'laag', eaters };
  }
  if (input.attendees.some((a) => a.attendance === 'unknown')) {
    warnings.push('Nog niet van iedereen bekend of ze mee-eten — bevestig dit voor boodschappen en porties.');
  }
  const guestsUnknown = input.attendees.filter((a) => !a.profileId && a.attendance !== 'no' && a.guestAllergiesKnown !== true);
  if (guestsUnknown.length) warnings.push('Allergieën van een gast zijn onbekend — vraag het even na.');

  // Stap 3: hard filter
  const safe: { recipe: Recipe; variants: RecipeVariant[] }[] = [];
  for (const recipe of input.recipes) {
    if (input.excludeRecipeIds?.includes(recipe.id)) { rejected.push({ recipeId: recipe.id, stage: 'excluded' }); continue; }
    const choice = safeVariantChoice(recipe, input);
    if ('blocks' in choice) { rejected.push({ recipeId: recipe.id, stage: 'hard', blocks: choice.blocks }); continue; }
    safe.push({ recipe, variants: choice.variants });
  }

  // Stap 4: haalbaarheid
  const feasible = safe.filter(({ recipe, variants }) => {
    const minutes = effectiveTotalMinutes(recipe, variants);
    if (input.context.availableMinutes != null && minutes > input.context.availableMinutes) {
      rejected.push({ recipeId: recipe.id, stage: 'feasibility', detail: `duurt ${minutes} min` });
      return false;
    }
    if (input.context.equipment && !recipe.equipment.every((e) => input.context.equipment!.includes(e))) {
      rejected.push({ recipeId: recipe.id, stage: 'feasibility', detail: 'apparatuur ontbreekt' });
      return false;
    }
    if (input.context.skill === 'easy' && recipe.difficulty !== 'easy') {
      rejected.push({ recipeId: recipe.id, stage: 'feasibility', detail: 'te bewerkelijk' });
      return false;
    }
    return true;
  });

  // R-04: geen identiek hoofdgerecht binnen 7 dagen, tenzij bewust gekozen of er geen alternatief is.
  const recentIds = new Set(input.history.filter((h) => { const d = daysBetween(input.localDate, h.localDate); return d > 0 && d <= 7; }).map((h) => h.recipeId));
  let varied = feasible.filter(({ recipe }) => {
    if (!recentIds.has(recipe.id) || input.allowRepeatRecipeIds?.includes(recipe.id)) return true;
    rejected.push({ recipeId: recipe.id, stage: 'variety', detail: 'deze week al gegeten' });
    return false;
  });
  if (varied.length === 0 && feasible.length > 0) {
    varied = feasible;
    warnings.push('Alle passende gerechten zijn deze week al gegeten.');
  }

  // Stap 5–6: varianten voor zachte conflicten en ranking
  const ranked: ScoredCandidate[] = [];
  for (const { recipe, variants: hardVariants } of varied) {
    let variants = hardVariants;
    let pref = evaluatePreferences(recipe, variants, input.attendees, input.rulesByProfile, input.parentDecides);
    // Probeer een variant die een sterke afkeer oplost, mits het recept daarna nog steeds veilig is.
    const fixable = pref.conflicts.find((c) => c.resolution === 'variant' && c.variantId);
    if (fixable) {
      const v = recipe.variants.find((x) => x.id === fixable.variantId)!;
      const withV = [...variants, v];
      if (checkHardRules(recipe, withV, input.attendees, input.rulesByProfile, input.catalog).safe) {
        variants = withV;
        pref = evaluatePreferences(recipe, variants, input.attendees, input.rulesByProfile, input.parentDecides);
      }
    }
    if (pref.vetoes.length) {
      rejected.push({ recipeId: recipe.id, stage: 'veto', detail: 'sterke afkeer zonder aanpassing' });
      continue;
    }
    ranked.push(scoreCandidate(recipe, variants, pref, input, eaters, profileNames));
  }
  ranked.sort((a, b) => b.score - a.score || a.recipeId.localeCompare(b.recipeId));

  const hardRulesPresent = [...input.rulesByProfile.values()].some((rs) => rs.some((r) => r.severity.startsWith('HARD')));
  if (ranked.length === 0) {
    const anySafe = safe.length > 0;
    return {
      status: 'no_safe_candidate', ranked, rejected,
      warnings: [...warnings, anySafe
        ? 'Geen gerecht past binnen de huidige tijd, apparatuur of voorkeuren. Pas de context aan of kies zelf uit de catalogus.'
        : 'Geen gecontroleerd gerecht is veilig voor alle harde beperkingen. Vul ingrediëntinformatie aan of kies handmatig.'],
      fitLabelAllowed: false, confidence: 'laag', eaters,
    };
  }

  const anyPreferenceData = ranked.some((r) => r.preference.hasPreferenceData);
  const unknownCount = ranked[0] ? Object.values(ranked[0].components).filter((c) => !c.known).length : 0;
  const confidence = !anyPreferenceData ? 'laag' : unknownCount >= 3 ? 'gemiddeld' : 'hoog';
  const fitLabelAllowed = guestsUnknown.length === 0 && !input.attendees.some((a) => a.attendance === 'unknown');
  if (!anyPreferenceData) warnings.push('Nog weinig smaakgegevens — vul profielen aan voor betere voorstellen.');
  if (hardRulesPresent) warnings.push('Controleer bij allergieën altijd de verpakking en bereidingsomgeving.');
  return {
    status: anyPreferenceData ? 'ok' : 'insufficient_data',
    ranked, rejected, warnings, fitLabelAllowed, confidence, eaters,
  };
}

function scoreCandidate(
  recipe: Recipe, variants: RecipeVariant[], pref: PreferenceEvaluation, input: EngineInput, eaters: number, profileNames: Map<string, string>,
): ScoredCandidate {
  const totalMinutes = effectiveTotalMinutes(recipe, variants);
  const components = {} as ScoredCandidate['components'];

  components.preference = { value: pref.fit, known: pref.hasPreferenceData };

  const avail = input.context.availableMinutes;
  components.time = avail == null
    ? { value: 0.5, known: false }
    : { value: totalMinutes <= avail * 0.75 ? 1 : 0.8, known: true };

  // Voorraad: alleen bevestigde voorraad telt (R-06).
  const ingredients = effectiveIngredients(recipe, variants).filter((i) => !i.optional);
  const pantryMap = new Map(input.pantry.map((p) => [p.ingredientId, p]));
  const inStock: string[] = [];
  const pantryChecks: string[] = [];
  for (const ri of ingredients) {
    const needed = toBase(scaleQuantity(ri.quantity, recipe.servings, Math.min(12, Math.max(1, eaters))), ri.unit);
    const av = pantryAvailability(pantryMap.get(ri.ingredientId), needed, input.now);
    if (av.status === 'in_stock') inStock.push(ri.ingredientId);
    else if (av.status === 'check' || (av.status === 'unknown' && pantryMap.has(ri.ingredientId))) pantryChecks.push(ri.ingredientId);
  }
  components.pantry = input.pantry.length === 0
    ? { value: 0.5, known: false }
    : { value: ingredients.length ? inStock.length / ingredients.length : 0.5, known: true };

  // Budget: alleen bekende prijzen; onvolledig = neutraal + 'onbekend' (R-05).
  const priced = ingredients.map((ri) => {
    const ing = input.catalog.get(ri.ingredientId);
    if (!ing?.priceEstimate) return null;
    const q = toBase(scaleQuantity(ri.quantity, recipe.servings, Math.max(1, eaters)), ri.unit);
    const per = ing.priceEstimate.per;
    if (per === 'stuk') return q.unit === 'g' || q.unit === 'ml' ? null : q.quantity * ing.priceEstimate.cents;
    return (q.quantity / 100) * ing.priceEstimate.cents;
  });
  const complete = priced.every((p) => p != null);
  if (complete && input.context.weeklyBudgetCents) {
    const cost = (priced as number[]).reduce((s, x) => s + x, 0);
    const perMeal = input.context.weeklyBudgetCents / 7;
    components.budget = { value: cost <= perMeal ? 1 : Math.max(0, 1 - (cost - perMeal) / perMeal), known: true };
  } else {
    components.budget = { value: 0.5, known: false };
  }

  // Afwisseling: keuken/eiwit van de afgelopen 7 dagen.
  const recent = input.history.filter((h) => { const d = daysBetween(input.localDate, h.localDate); return d > 0 && d <= 7; });
  const recentRecipes = recent.map((h) => input.recipes.find((r) => r.id === h.recipeId)).filter((r): r is Recipe => !!r);
  if (recent.length === 0) components.variety = { value: 0.5, known: false };
  else {
    const sameCuisine = recentRecipes.filter((r) => r.cuisine === recipe.cuisine).length;
    const sameProtein = recentRecipes.filter((r) => r.mainProtein === recipe.mainProtein).length;
    const sameRecipe = recent.filter((h) => h.recipeId === recipe.id).length;
    components.variety = { value: Math.max(0, 1 - 0.15 * sameCuisine - 0.15 * sameProtein - 0.5 * sameRecipe), known: true };
  }

  // Tafelbalans (F-018): wie heeft de afgelopen 14 dagen het minst 'eigen favoriet' gehad?
  const last14 = input.history.filter((h) => { const d = daysBetween(input.localDate, h.localDate); return d > 0 && d <= 14; });
  const likers = new Set(pref.likes.map((l) => l.profileId));
  if (last14.length === 0 || likers.size === 0) components.tableBalance = { value: 0.5, known: last14.length > 0 };
  else {
    const favCount = (pid: string) => last14.filter((h) => {
      const r = input.recipes.find((x) => x.id === h.recipeId);
      if (!r) return false;
      const rules = input.rulesByProfile.get(pid) ?? [];
      return rules.some((rule) => rule.severity === 'LIKE' && ((rule.targetType === 'tag' && r.tags.includes(rule.targetId)) || (rule.targetType === 'ingredient' && r.ingredients.some((i) => i.ingredientId === rule.targetId))));
    }).length;
    const avg = [...likers].reduce((s, pid) => s + favCount(pid), 0) / likers.size;
    components.tableBalance = { value: Math.max(0, 1 - avg / 7), known: true };
  }

  // Restjes slim benutten: gebruikt bijna-verlopen voorraad.
  const soon = input.pantry.filter((p) => p.status === 'confirmed' && p.expiresAt && Date.parse(p.expiresAt) - input.now.getTime() < 2 * 24 * 3600 * 1000 && Date.parse(p.expiresAt) >= input.now.getTime());
  components.leftovers = soon.length === 0
    ? { value: 0.5, known: false }
    : { value: ingredients.some((i) => soon.some((s) => s.ingredientId === i.ingredientId)) ? 1 : 0.3, known: true };

  // Feedback (F-017): verbetert de ranking subtiel, geen permanente uitsluiting (R-08).
  const fb = input.feedback.filter((f) => f.recipeId === recipe.id);
  const fbAdj = fb.reduce((s, f) => s + (f.rating === 'repeat' ? 0.02 : f.rating === 'rather_not' ? -0.02 : 0), 0);

  const score = (Object.keys(WEIGHTS) as ScoreComponent[]).reduce((s, k) => s + WEIGHTS[k] * components[k].value, 0) + Math.max(-0.06, Math.min(0.06, fbAdj));

  // Redenen: maximaal drie, feitelijk verifieerbaar (§7.4).
  const reasons: string[] = [];
  if (avail != null) reasons.push(`${totalMinutes} min`);
  for (const id of inStock.slice(0, 1)) reasons.push(`${input.catalog.get(id)?.canonicalName.toLowerCase()} op voorraad`);
  for (const c of pref.conflicts) {
    if (reasons.length >= 3) break;
    if (c.resolution === 'none' || !c.ingredientId) continue;
    const ing = input.catalog.get(c.ingredientId)?.canonicalName.toLowerCase() ?? '';
    const who = profileNames.get(c.profileId) ?? '';
    reasons.push(c.resolution === 'variant' ? `zonder ${ing} voor ${who}` : `${ing} apart voor ${who}`);
  }
  if (reasons.length < 3 && pref.likes.length) {
    const who = [...new Set(pref.likes.map((l) => profileNames.get(l.profileId)).filter(Boolean))];
    if (who.length) reasons.push(`favoriet van ${who.slice(0, 2).join(' en ')}`);
  }
  if (avail == null && reasons.length < 3) reasons.unshift(`${totalMinutes} min`);

  return {
    recipeId: recipe.id, variantIds: variants.map((v) => v.id), score, components, preference: pref,
    totalMinutes, activeMinutes: recipe.activeMinutes, eaters, reasons: reasons.slice(0, 3), pantryChecks, inStock,
  };
}
