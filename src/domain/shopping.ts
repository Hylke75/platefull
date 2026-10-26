// Boodschappen (S-09, §8.3): deterministische herberekening per planrevisie.
// Handmatige items blijven; overbodige automatische items gaan naar 'niet meer nodig' met herstelmogelijkheid.
import { pantryAvailability } from './pantry';
import { effectiveIngredients, type IngredientCatalog } from './safety';
import { roundForShopping, scaleQuantity, toBase, type BaseUnit } from './units';
import type { PantryItem, Recipe, RecipeVariant, ShoppingCategory } from './types';

export interface PlannedMeal {
  slotId: string;
  recipe: Recipe;
  variants: RecipeVariant[];
  eaters: number;
}

export interface Need {
  key: string; // ingredientId|unit
  ingredientId: string;
  unit: BaseUnit;
  category: ShoppingCategory;
  description: string;
  required: number;
  /** Bevestigde voorraad; null = onbekend (telt niet als aanwezig). */
  inStock: number | null;
  toBuy: number;
  check: 'confirmed' | 'check' | 'unknown';
  slotIds: string[];
}

export function needKey(ingredientId: string, unit: BaseUnit): string {
  return `${ingredientId}|${unit}`;
}

export function computeNeeds(meals: readonly PlannedMeal[], pantry: readonly PantryItem[], catalog: IngredientCatalog, now: Date): Need[] {
  const acc = new Map<string, Need>();
  for (const meal of meals) {
    for (const ri of effectiveIngredients(meal.recipe, meal.variants)) {
      const ing = catalog.get(ri.ingredientId);
      const scaled = toBase(scaleQuantity(ri.quantity, meal.recipe.servings, meal.eaters), ri.unit);
      const key = needKey(ri.ingredientId, scaled.unit);
      const existing = acc.get(key);
      if (existing) {
        existing.required += scaled.quantity;
        if (!existing.slotIds.includes(meal.slotId)) existing.slotIds.push(meal.slotId);
      } else {
        acc.set(key, {
          key, ingredientId: ri.ingredientId, unit: scaled.unit, category: ing?.category ?? 'overig',
          description: ing?.canonicalName ?? ri.ingredientId, required: scaled.quantity, inStock: null, toBuy: 0, check: 'unknown', slotIds: [meal.slotId],
        });
      }
    }
  }
  const pantryMap = new Map(pantry.map((p) => [p.ingredientId, p]));
  for (const need of acc.values()) {
    need.required = roundForShopping(need.required, need.unit);
    const av = pantryAvailability(pantryMap.get(need.ingredientId), { quantity: need.required, unit: need.unit }, now);
    if (av.status === 'in_stock' || av.status === 'insufficient') {
      need.inStock = av.knownQuantity;
      need.check = 'confirmed';
      need.toBuy = av.status === 'in_stock' ? 0 : roundForShopping(need.required - (av.knownQuantity ?? 0), need.unit);
    } else {
      need.inStock = null;
      need.check = av.status === 'check' ? 'check' : 'unknown';
      need.toBuy = need.required;
    }
  }
  return [...acc.values()].sort((a, b) => a.category.localeCompare(b.category) || a.description.localeCompare(b.description, 'nl'));
}

export type ShoppingState = 'open' | 'checked' | 'removed';

export interface ShoppingItemRecord {
  id: string;
  ingredientId: string | null;
  key: string | null;
  description: string;
  qty: number | null;
  unit: string | null;
  category: ShoppingCategory;
  origin: 'auto' | 'manual';
  state: ShoppingState;
  /** Voor auto-items: staat op 'niet meer nodig' door planwijziging. */
  notNeeded: boolean;
  check: 'confirmed' | 'check' | 'unknown';
}

/**
 * Past een nieuwe behoefteberekening toe op de bestaande lijst.
 * Idempotent: dezelfde input levert exact dezelfde lijst op, zonder dubbele regels.
 */
export function reconcileShoppingList(existing: readonly ShoppingItemRecord[], needs: readonly Need[], newId: (key: string) => string): ShoppingItemRecord[] {
  const result: ShoppingItemRecord[] = [];
  const byKey = new Map(existing.filter((i) => i.origin === 'auto' && i.key).map((i) => [i.key!, i]));
  const seen = new Set<string>();
  for (const need of needs) {
    if (need.toBuy <= 0) continue;
    seen.add(need.key);
    const prev = byKey.get(need.key);
    const qtyChanged = prev ? prev.qty !== need.toBuy : false;
    result.push({
      id: prev?.id ?? newId(need.key),
      ingredientId: need.ingredientId,
      key: need.key,
      description: need.description,
      qty: need.toBuy,
      unit: need.unit,
      category: need.category,
      origin: 'auto',
      // Een al afgevinkt item blijft afgevinkt, tenzij er méér nodig is dan eerst.
      state: prev?.state === 'checked' && !(qtyChanged && need.toBuy > (prev.qty ?? 0)) ? 'checked' : prev?.state === 'removed' && !prev.notNeeded ? 'removed' : 'open',
      notNeeded: false,
      check: need.check,
    });
  }
  for (const item of existing) {
    if (item.origin === 'manual') { result.push(item); continue; }
    if (item.key && !seen.has(item.key)) result.push({ ...item, notNeeded: true });
  }
  return result;
}

export const CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  groente_fruit: 'Groente & fruit',
  voorraad: 'Voorraad',
  koeling: 'Koeling',
  brood_granen: 'Brood & granen',
  overig: 'Overig',
};
export const CATEGORY_ORDER: ShoppingCategory[] = ['groente_fruit', 'voorraad', 'koeling', 'brood_granen', 'overig'];
