// Harde veiligheidsregels (R-01, §7.2 stap 3, §11.3).
// Conservatief: onbekende of onvolledige informatie is NOOIT bewezen veilig.
import type {
  Attendee, DietFlags, HardSeverity, Ingredient, ProfileRule, Recipe, RecipeIngredient, RecipeVariant, StrictDiet,
} from './types';
import { isHard } from './types';

export type IngredientCatalog = ReadonlyMap<string, Ingredient>;

export interface EffectiveIngredient extends RecipeIngredient {
  /** Herkomst: ingrediënt is via een variant vervangen. */
  replacedFrom?: string;
}

/** Past varianten toe op de ingrediëntenlijst. Onbekende varianten worden genegeerd door de aanroeper. */
export function effectiveIngredients(recipe: Recipe, variants: readonly RecipeVariant[] = []): EffectiveIngredient[] {
  let list: EffectiveIngredient[] = recipe.ingredients.map((i) => ({ ...i }));
  for (const variant of variants) {
    if (variant.recipeId !== recipe.id) throw new Error(`Variant ${variant.id} hoort niet bij recept ${recipe.id}`);
    for (const change of variant.changes) {
      switch (change.op) {
        case 'remove':
          list = list.filter((i) => i.ingredientId !== change.ingredientId);
          break;
        case 'replace':
          list = list.map((i) => i.ingredientId === change.from
            ? { ...i, ingredientId: change.to, quantity: change.quantity, unit: change.unit, replacedFrom: change.from }
            : i);
          break;
        case 'serve_separately':
          list = list.map((i) => i.ingredientId === change.ingredientId ? { ...i, servedSeparately: true } : i);
          break;
        case 'time':
          break;
      }
    }
  }
  return list;
}

export function effectiveTotalMinutes(recipe: Recipe, variants: readonly RecipeVariant[] = []): number {
  const delta = variants.flatMap((v) => v.changes).reduce((sum, c) => sum + (c.op === 'time' ? c.deltaMinutes : 0), 0);
  return Math.max(1, recipe.totalMinutes + delta);
}

export type BlockReason =
  | 'contains_allergen'
  | 'allergen_status_unknown'
  | 'ingredient_unknown'
  | 'recipe_not_reviewed'
  | 'variant_not_reviewed'
  | 'violates_diet'
  | 'diet_status_unknown'
  | 'medical_exclusion'
  | 'guest_allergies_unknown';

export interface HardBlock {
  /** null = gast */
  profileId: string | null;
  guestLabel?: string;
  severity: HardSeverity | 'GUEST_UNKNOWN';
  reason: BlockReason;
  ingredientId?: string;
  ruleId?: string;
}

export interface HardCheckResult {
  /** true alleen als alle harde regels van alle aanwezigen aantoonbaar zijn gecontroleerd. */
  safe: boolean;
  blocks: HardBlock[];
  /** Waarschuwingen die het label 'Past bij jullie gezin' verhinderen maar het recept niet blokkeren. */
  cautions: HardBlock[];
}

const DIET_FIELDS: Record<StrictDiet, (keyof DietFlags)[]> = {
  vegetarian: ['meat', 'fish'],
  vegan: ['meat', 'fish', 'animal'],
  pescatarian: ['meat'],
  no_pork: ['pork'],
};

/** Overtreden als één relevant kenmerk true is; onbekend als één relevant kenmerk ontbreekt. */
export function dietViolated(diet: StrictDiet, ing: Pick<Ingredient, 'diet'>): boolean | 'unknown' {
  if (!ing.diet) return 'unknown';
  const values = DIET_FIELDS[diet].map((f) => ing.diet![f]);
  if (values.some((v) => v === true)) return true;
  if (values.some((v) => v === null || v === undefined)) return 'unknown';
  return false;
}

function attendeeRules(attendee: Attendee, rulesByProfile: ReadonlyMap<string, readonly ProfileRule[]>): readonly ProfileRule[] {
  if (attendee.profileId) return rulesByProfile.get(attendee.profileId) ?? [];
  return attendee.guestRules ?? [];
}

/**
 * Controleert één recept (+ optionele varianten) tegen alle harde regels van de aanwezige eters.
 * - Een allergeen in óók een optioneel of apart geserveerd ingrediënt blokkeert: geen claims over kruisbesmetting.
 * - Een ingrediënt met onvolledige allergeneninformatie blokkeert bij elke harde allergie.
 * - Een ongecontroleerd recept of ongecontroleerde variant blokkeert bij elke harde regel.
 */
export function checkHardRules(
  recipe: Recipe,
  variants: readonly RecipeVariant[],
  attendees: readonly Attendee[],
  rulesByProfile: ReadonlyMap<string, readonly ProfileRule[]>,
  catalog: IngredientCatalog,
): HardCheckResult {
  const blocks: HardBlock[] = [];
  const cautions: HardBlock[] = [];
  const ingredients = effectiveIngredients(recipe, variants);
  const eating = attendees.filter((a) => a.attendance !== 'no');

  for (const attendee of eating) {
    const who = { profileId: attendee.profileId, guestLabel: attendee.guestLabel };
    if (!attendee.profileId && attendee.guestAllergiesKnown !== true) {
      // R-03 / §11.3: gast met onbekende allergieën nooit als 'geen allergie' beschouwen.
      cautions.push({ ...who, severity: 'GUEST_UNKNOWN', reason: 'guest_allergies_unknown' });
    }
    const hardRules = attendeeRules(attendee, rulesByProfile).filter((r) => isHard(r.severity));
    if (hardRules.length === 0) continue;

    if (recipe.reviewStatus !== 'reviewed') {
      blocks.push({ ...who, severity: hardRules[0]!.severity as HardSeverity, reason: 'recipe_not_reviewed', ruleId: hardRules[0]!.id });
      continue;
    }
    const unreviewed = variants.find((v) => v.safetyReviewStatus !== 'reviewed');
    if (unreviewed) {
      blocks.push({ ...who, severity: hardRules[0]!.severity as HardSeverity, reason: 'variant_not_reviewed', ruleId: hardRules[0]!.id });
      continue;
    }

    for (const rule of hardRules) {
      const severity = rule.severity as HardSeverity;
      for (const ri of ingredients) {
        const ing = catalog.get(ri.ingredientId);
        if (!ing) {
          blocks.push({ ...who, severity, reason: 'ingredient_unknown', ingredientId: ri.ingredientId, ruleId: rule.id });
          continue;
        }
        if (rule.targetType === 'allergen') {
          if (ing.allergens.includes(rule.targetId as never)) {
            blocks.push({ ...who, severity, reason: severity === 'HARD_MEDICAL' ? 'medical_exclusion' : 'contains_allergen', ingredientId: ing.id, ruleId: rule.id });
          } else if (ing.allergenStatus !== 'verified') {
            blocks.push({ ...who, severity, reason: 'allergen_status_unknown', ingredientId: ing.id, ruleId: rule.id });
          }
        } else if (rule.targetType === 'ingredient') {
          // Harde uitsluiting van een ingrediënt geldt voor elke bereidingsvorm.
          if (ing.id === rule.targetId || ri.replacedFrom === rule.targetId) {
            blocks.push({ ...who, severity, reason: severity === 'HARD_ALLERGY' ? 'contains_allergen' : 'medical_exclusion', ingredientId: ing.id, ruleId: rule.id });
          } else if (severity === 'HARD_ALLERGY' && ing.allergenStatus !== 'verified') {
            blocks.push({ ...who, severity, reason: 'allergen_status_unknown', ingredientId: ing.id, ruleId: rule.id });
          }
        } else if (rule.targetType === 'diet') {
          const violated = dietViolated(rule.targetId as StrictDiet, ing);
          if (violated === 'unknown') blocks.push({ ...who, severity, reason: 'diet_status_unknown', ingredientId: ing.id, ruleId: rule.id });
          else if (violated) blocks.push({ ...who, severity, reason: 'violates_diet', ingredientId: ing.id, ruleId: rule.id });
        } else if (rule.targetType === 'tag') {
          if (recipe.tags.includes(rule.targetId)) {
            blocks.push({ ...who, severity, reason: 'medical_exclusion', ruleId: rule.id });
            break;
          }
        }
      }
    }
  }
  return { safe: blocks.length === 0, blocks, cautions };
}

/** Dutch, human-readable uitleg voor een blokkade. Nooit de gevoelige regel zelf loggen. */
export function describeBlock(block: HardBlock, names: ReadonlyMap<string, string>, catalog: IngredientCatalog): string {
  const who = block.profileId ? names.get(block.profileId) ?? 'Een gezinslid' : block.guestLabel ?? 'Een gast';
  const ing = block.ingredientId ? catalog.get(block.ingredientId)?.canonicalName ?? block.ingredientId : '';
  switch (block.reason) {
    case 'contains_allergen': return `Bevat ${ing.toLowerCase()} — niet geschikt voor ${who}.`;
    case 'allergen_status_unknown': return `Allergeneninformatie van ${ing.toLowerCase()} is niet compleet — niet als veilig te beschouwen voor ${who}.`;
    case 'ingredient_unknown': return `Onbekend ingrediënt in het recept — eerst controleren voor ${who}.`;
    case 'recipe_not_reviewed': return `Dit recept is nog niet gecontroleerd — niet geschikt bij de harde beperking van ${who}.`;
    case 'variant_not_reviewed': return `Deze aanpassing is niet gecontroleerd — niet bruikbaar bij de harde beperking van ${who}.`;
    case 'violates_diet': return `${ing} past niet bij het dieet van ${who}.`;
    case 'diet_status_unknown': return `Van ${ing.toLowerCase()} is niet bekend of het bij het dieet van ${who} past.`;
    case 'medical_exclusion': return `Medische uitsluiting voor ${who}.`;
    case 'guest_allergies_unknown': return `Allergieën van ${who} zijn onbekend — even navragen.`;
  }
}
