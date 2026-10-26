// Zachte voorkeuren (R-01 soft, R-02 gezamenlijke basis, F-006 ouderlijke regie).
// Zachte voorkeuren beïnvloeden alleen de ranking; ze verwijderen nooit iets uit een profiel.
import { effectiveIngredients, type EffectiveIngredient } from './safety';
import type { Attendee, ProfileRule, Recipe, RecipeVariant, Severity } from './types';
import { isHard } from './types';

export type Resolution = 'sauce_apart' | 'topping_apart' | 'variant' | 'none';

export interface SoftConflict {
  profileId: string;
  ruleId: string;
  severity: Extract<Severity, 'STRONG_DISLIKE' | 'SOFT_DISLIKE'>;
  ingredientId: string | null;
  tag: string | null;
  resolution: Resolution;
  variantId?: string;
}

export interface PreferenceEvaluation {
  /** 0..1, gemiddelde over aanwezige profielen; zonder gegevens 0.5 (neutraal). */
  fit: number;
  conflicts: SoftConflict[];
  likes: { profileId: string; ruleId: string; ingredientId: string | null; tag: string | null }[];
  /** Profielen waarvoor ouderlijke regie uit staat en een onoplosbare sterke afkeer geldt. */
  vetoes: string[];
  hasPreferenceData: boolean;
}

function matchesIngredient(rule: ProfileRule, ri: EffectiveIngredient): boolean {
  if (rule.targetType !== 'ingredient' || rule.targetId !== ri.ingredientId) return false;
  return rule.preparation === 'any' || rule.preparation === ri.preparation;
}

function separableResolution(ri: EffectiveIngredient): Resolution {
  if (ri.component === 'sauce' && (ri.optional || ri.servedSeparately)) return 'sauce_apart';
  if (ri.optional || ri.servedSeparately || ri.component === 'topping') return 'topping_apart';
  return 'none';
}

/** Zoekt een variant die het ingrediënt verwijdert, vervangt of apart serveert (R-02 stap 3). */
export function findResolvingVariant(recipe: Recipe, ingredientId: string): RecipeVariant | undefined {
  return recipe.variants.find((v) => v.changes.some((c) =>
    (c.op === 'remove' && c.ingredientId === ingredientId)
    || (c.op === 'replace' && c.from === ingredientId)
    || (c.op === 'serve_separately' && c.ingredientId === ingredientId)));
}

export function evaluatePreferences(
  recipe: Recipe,
  variants: readonly RecipeVariant[],
  attendees: readonly Attendee[],
  rulesByProfile: ReadonlyMap<string, readonly ProfileRule[]>,
  parentDecides: ReadonlyMap<string, boolean>,
): PreferenceEvaluation {
  const ingredients = effectiveIngredients(recipe, variants);
  const conflicts: SoftConflict[] = [];
  const likes: PreferenceEvaluation['likes'] = [];
  const vetoes: string[] = [];
  const scores: number[] = [];
  let hasPreferenceData = false;

  for (const a of attendees) {
    if (a.attendance === 'no' || !a.profileId) continue;
    const rules = (rulesByProfile.get(a.profileId) ?? []).filter((r) => !isHard(r.severity));
    if (rules.length) hasPreferenceData = true;
    let score = 0.5;
    for (const rule of rules) {
      if (rule.severity === 'NEUTRAL' || rule.severity === 'UNKNOWN') continue; // onbekend ≠ lekker
      if (rule.targetType === 'tag') {
        if (!recipe.tags.includes(rule.targetId)) continue;
        if (rule.severity === 'LIKE') { score += 0.3; likes.push({ profileId: a.profileId, ruleId: rule.id, ingredientId: null, tag: rule.targetId }); }
        else {
          const severity = rule.severity as SoftConflict['severity'];
          score -= severity === 'STRONG_DISLIKE' ? 0.6 : 0.3;
          conflicts.push({ profileId: a.profileId, ruleId: rule.id, severity, ingredientId: null, tag: rule.targetId, resolution: 'none' });
          if (severity === 'STRONG_DISLIKE' && parentDecides.get(a.profileId) === false) vetoes.push(a.profileId);
        }
        continue;
      }
      if (rule.targetType !== 'ingredient') continue;
      for (const ri of ingredients) {
        if (!matchesIngredient(rule, ri)) continue;
        if (rule.severity === 'LIKE') {
          score += 0.2;
          likes.push({ profileId: a.profileId, ruleId: rule.id, ingredientId: ri.ingredientId, tag: null });
          continue;
        }
        const severity = rule.severity as SoftConflict['severity'];
        let resolution = separableResolution(ri);
        let variantId: string | undefined;
        if (resolution === 'none') {
          const v = findResolvingVariant(recipe, ri.ingredientId);
          if (v && !variants.includes(v)) { resolution = 'variant'; variantId = v.id; }
        }
        const strong = severity === 'STRONG_DISLIKE';
        score -= resolution === 'none' ? (strong ? 0.6 : 0.3) : (strong ? 0.15 : 0.05);
        conflicts.push({ profileId: a.profileId, ruleId: rule.id, severity, ingredientId: ri.ingredientId, tag: null, resolution, variantId });
        if (strong && resolution === 'none' && parentDecides.get(a.profileId) === false) vetoes.push(a.profileId);
      }
    }
    scores.push(Math.min(1, Math.max(0, score)));
  }
  const fit = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 0.5;
  return { fit, conflicts, likes, vetoes, hasPreferenceData };
}
