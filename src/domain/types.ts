// Kerntypes van het Plateful-domein (functioneel ontwerp §6, §7, §9).
// Pure TypeScript zonder I/O, zodat alle veiligheidsregels deterministisch testbaar zijn.

export type Uuid = string;

/** De veertien wettelijk te vermelden allergenen (NVWA / EU 1169/2011). */
export const ALLERGEN_CODES = [
  'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soy', 'milk',
  'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
] as const;
export type AllergenCode = (typeof ALLERGEN_CODES)[number];

export const ALLERGEN_LABELS: Record<AllergenCode, string> = {
  gluten: 'Gluten', crustaceans: 'Schaaldieren', eggs: 'Ei', fish: 'Vis', peanuts: 'Pinda',
  soy: 'Soja', milk: 'Melk', nuts: 'Noten', celery: 'Selderij', mustard: 'Mosterd',
  sesame: 'Sesam', sulphites: 'Sulfiet', lupin: 'Lupine', molluscs: 'Weekdieren',
};

export const STRICT_DIETS = ['vegetarian', 'vegan', 'pescatarian', 'no_pork'] as const;
export type StrictDiet = (typeof STRICT_DIETS)[number];

export const DIET_LABELS: Record<StrictDiet, string> = {
  vegetarian: 'Vegetarisch', vegan: 'Veganistisch', pescatarian: 'Pescotarisch', no_pork: 'Geen varkensvlees',
};

/** R-01: formeel onderscheid tussen harde regels en zachte voorkeuren. */
export const SEVERITIES = [
  'HARD_ALLERGY', 'HARD_MEDICAL', 'HARD_DIET',
  'STRONG_DISLIKE', 'SOFT_DISLIKE', 'NEUTRAL', 'UNKNOWN', 'LIKE',
] as const;
export type Severity = (typeof SEVERITIES)[number];
export type HardSeverity = Extract<Severity, 'HARD_ALLERGY' | 'HARD_MEDICAL' | 'HARD_DIET'>;
export type SoftSeverity = Exclude<Severity, HardSeverity>;

export const HARD_SEVERITIES: readonly HardSeverity[] = ['HARD_ALLERGY', 'HARD_MEDICAL', 'HARD_DIET'];
export function isHard(severity: Severity): severity is HardSeverity {
  return (HARD_SEVERITIES as readonly string[]).includes(severity);
}

export type AgeBand = 'adult' | 'teen16' | 'child';
export type Preparation = 'raw' | 'cooked' | 'sauce' | 'baked' | 'fried' | 'any';
export type RuleTargetType = 'ingredient' | 'allergen' | 'tag' | 'diet';

export interface ProfileRule {
  id: Uuid;
  profileId: Uuid;
  targetType: RuleTargetType;
  /** ingredient-id, allergeencode, receptlabel (bijv. 'pasta') of dieetcode. */
  targetId: string;
  /** 'Rauwe tomaat' is een ander profielitem dan 'tomatensaus' (S-08). */
  preparation: Preparation;
  severity: Severity;
  /** Wie heeft het vastgelegd: ouder, kind op gedeeld toestel, systeem. */
  source: 'adult' | 'child_shared_device' | 'teen' | 'system';
}

export interface Profile {
  id: Uuid;
  displayName: string;
  ageBand: AgeBand;
  avatarColor: string;
  active: boolean;
}

export type Attendance = 'yes' | 'no' | 'unknown';

export interface Attendee {
  profileId: Uuid | null;
  guestLabel?: string;
  attendance: Attendance;
  /** Alleen bij gasten: is bekend of de gast allergieën heeft? */
  guestAllergiesKnown?: boolean;
  guestRules?: ProfileRule[];
}

export type UnitKind = 'mass' | 'volume' | 'count';
export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'stuk' | 'el' | 'tl' | 'blik' | 'pak' | 'bakje' | 'teen' | 'snuf';

/** Per kenmerk: true = bevat, false = bevat aantoonbaar niet, null = onbekend (telt bij een harde regel als niet veilig). */
export interface DietFlags {
  meat: boolean | null;
  pork: boolean | null;
  fish: boolean | null;
  /** Bevat dierlijk product (zuivel, ei, honing, vlees, vis). */
  animal: boolean | null;
}

export type ShoppingCategory = 'groente_fruit' | 'voorraad' | 'koeling' | 'brood_granen' | 'overig';

export interface Ingredient {
  id: string;
  canonicalName: string;
  unitKind: UnitKind;
  synonyms: string[];
  category: ShoppingCategory;
  allergens: AllergenCode[];
  /** 'verified' = allergeneninformatie is gecontroleerd en compleet; anders nooit 'veilig'. */
  allergenStatus: 'verified' | 'incomplete';
  diet: DietFlags | null;
  /** Geschatte prijs per basiseenheid (per 100 g / 100 ml / stuk). null = onbekend. */
  priceEstimate: { cents: number; per: '100g' | '100ml' | 'stuk'; source: string; date: string } | null;
}

export type RecipeComponent = 'base' | 'sauce' | 'topping' | 'side';

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: Unit;
  optional: boolean;
  component: RecipeComponent;
  preparation: Preparation;
  /** Wordt al standaard apart op tafel gezet. */
  servedSeparately: boolean;
}

export interface RecipeStepDef {
  title: string;
  body: string;
  minutes: number | null;
}

export type VariantChange =
  | { op: 'remove'; ingredientId: string }
  | { op: 'replace'; from: string; to: string; quantity: number; unit: Unit }
  | { op: 'serve_separately'; ingredientId: string }
  | { op: 'time'; deltaMinutes: number; note: string };

export interface RecipeVariant {
  id: string;
  recipeId: string;
  name: string;
  changes: VariantChange[];
  /** Alleen 'reviewed' varianten mogen een harde conflictsituatie oplossen. */
  safetyReviewStatus: 'reviewed' | 'unreviewed';
}

export type Equipment = 'oven' | 'airfryer' | 'stove' | 'microwave' | 'blender';

export interface Recipe {
  id: string;
  ownerHouseholdId: Uuid | null;
  name: string;
  image: string;
  activeMinutes: number;
  totalMinutes: number;
  servings: number;
  equipment: Equipment[];
  difficulty: 'easy' | 'medium';
  cuisine: string;
  mainProtein: string;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStepDef[];
  variants: RecipeVariant[];
  source: string;
  /** Gecontroleerde catalogus: 'reviewed'. Concept/eigen recept zonder controle: 'draft'. */
  reviewStatus: 'reviewed' | 'draft';
}

export interface PantryItem {
  ingredientId: string;
  quantity: number | null;
  unit: Unit | null;
  status: 'confirmed' | 'unknown';
  verifiedAt: string | null;
  expiresAt: string | null;
}

export interface Leftover {
  id: Uuid;
  sourceRecipeId: string | null;
  label: string;
  portions: number;
  storedAt: string;
  storage: 'fridge' | 'freezer';
  useBy: string;
  status: 'available' | 'used' | 'discarded' | 'unsafe';
}

export interface HistoryEntry {
  localDate: string;
  recipeId: string;
  /** Profielen die meeaten. */
  profileIds: Uuid[];
}

export interface FeedbackEntry {
  recipeId: string;
  profileId: Uuid | null;
  rating: 'repeat' | 'fine' | 'rather_not';
}

export interface HouseholdContext {
  availableMinutes: number | null;
  equipment: Equipment[] | null;
  skill: 'easy' | 'medium';
  weeklyBudgetCents: number | null;
}
