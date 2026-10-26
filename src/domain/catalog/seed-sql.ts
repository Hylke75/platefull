// SQL-seed voor de algemene catalogus (ingredients, ingredient_allergens, recipes, recipe_ingredients, recipe_variants).
import { INGREDIENTS } from './ingredients';
import { RECIPES } from './recipes';

const q = (v: string | null) => (v === null ? 'null' : `'${v.replace(/'/g, "''")}'`);
const arr = (xs: readonly string[]) => `array[${xs.map(q).join(',')}]::text[]`;
const json = (v: unknown) => (v === null || v === undefined ? 'null' : `${q(JSON.stringify(v))}::jsonb`);

export function buildSeedSql(): string {
  const lines: string[] = ['-- Gegenereerd door scripts/generate-seed-sql.ts — niet handmatig wijzigen.', 'begin;'];
  for (const i of INGREDIENTS) {
    lines.push(`insert into public.ingredients (id, canonical_name, unit_kind, synonyms, category, allergen_status, diet, price_estimate, source) values (${q(i.id)}, ${q(i.canonicalName)}, ${q(i.unitKind)}, ${arr(i.synonyms)}, ${q(i.category)}, ${q(i.allergenStatus)}, ${json(i.diet)}, ${json(i.priceEstimate)}, ${q('generiek basisproduct · EU-allergenenlijst 1169/2011')}) on conflict (id) do update set canonical_name = excluded.canonical_name, unit_kind = excluded.unit_kind, synonyms = excluded.synonyms, category = excluded.category, allergen_status = excluded.allergen_status, diet = excluded.diet, price_estimate = excluded.price_estimate;`);
    lines.push(`delete from public.ingredient_allergens where ingredient_id = ${q(i.id)};`);
    for (const a of i.allergens) lines.push(`insert into public.ingredient_allergens (ingredient_id, allergen_code, source) values (${q(i.id)}, ${q(a)}, ${q('redactie Plateful')});`);
  }
  for (const r of RECIPES) {
    lines.push(`insert into public.recipes (id, owner_household_id, name, image, instructions, active_minutes, total_minutes, servings, equipment, difficulty, cuisine, main_protein, tags, source, review_status) values (${q(r.id)}, null, ${q(r.name)}, ${q(r.image)}, ${json(r.steps)}, ${r.activeMinutes}, ${r.totalMinutes}, ${r.servings}, ${arr(r.equipment)}, ${q(r.difficulty)}, ${q(r.cuisine)}, ${q(r.mainProtein)}, ${arr(r.tags)}, ${q(r.source)}, ${q(r.reviewStatus)}) on conflict (id) do update set name = excluded.name, image = excluded.image, instructions = excluded.instructions, active_minutes = excluded.active_minutes, total_minutes = excluded.total_minutes, servings = excluded.servings, equipment = excluded.equipment, difficulty = excluded.difficulty, cuisine = excluded.cuisine, main_protein = excluded.main_protein, tags = excluded.tags, source = excluded.source, review_status = excluded.review_status, revision = public.recipes.revision + 1;`);
    lines.push(`delete from public.recipe_ingredients where recipe_id = ${q(r.id)};`);
    r.ingredients.forEach((ri, idx) => {
      lines.push(`insert into public.recipe_ingredients (recipe_id, position, ingredient_id, quantity, unit, optional, component, preparation, served_separately) values (${q(r.id)}, ${idx + 1}, ${q(ri.ingredientId)}, ${ri.quantity}, ${q(ri.unit)}, ${ri.optional}, ${q(ri.component)}, ${q(ri.preparation)}, ${ri.servedSeparately});`);
    });
    lines.push(`delete from public.recipe_variants where recipe_id = ${q(r.id)};`);
    for (const v of r.variants) {
      lines.push(`insert into public.recipe_variants (id, recipe_id, variant_name, changes_json, safety_review_status) values (${q(v.id)}, ${q(r.id)}, ${q(v.name)}, ${json(v.changes)}, ${q(v.safetyReviewStatus)});`);
    }
  }
  lines.push('commit;', '');
  return lines.join('\n');
}
