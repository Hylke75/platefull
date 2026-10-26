// Etiketcontrole door het gezin (R-01 conservatieve veiligheidsregel):
// een samengesteld product is pas 'gecontroleerd' als een volwassene het etiket van hún product
// heeft vastgelegd. Dat geldt alleen voor dit huishouden en vervalt na een termijn.
import type { IngredientCatalog } from './safety';
import type { AllergenCode, DietFlags, Ingredient } from './types';

export interface HouseholdIngredientCheck {
  ingredientId: string;
  /** Allergenen die volgens het etiket aanwezig zijn (incl. 'kan sporen bevatten'). */
  containsAllergens: AllergenCode[];
  diet: DietFlags | null;
  checkedAt: string;
}

/** Na deze periode vraagt de app opnieuw om het etiket te controleren (receptuur kan wijzigen). */
export const LABEL_CHECK_VALID_DAYS = 180;

export function applyHouseholdChecks(catalog: IngredientCatalog, checks: readonly HouseholdIngredientCheck[], now: Date): Map<string, Ingredient> {
  const out = new Map(catalog);
  for (const c of checks) {
    const base = catalog.get(c.ingredientId);
    if (!base) continue;
    if (now.getTime() - Date.parse(c.checkedAt) > LABEL_CHECK_VALID_DAYS * 86_400_000) continue;
    // Nooit allergenen wegnemen die de catalogus al kent: een controle kan alleen aanvullen.
    const allergens = [...new Set([...base.allergens, ...c.containsAllergens])];
    out.set(c.ingredientId, {
      ...base,
      allergens,
      allergenStatus: 'verified',
      diet: c.diet ?? base.diet,
    });
  }
  return out;
}
