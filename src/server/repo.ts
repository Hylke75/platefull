// Datatoegang via Supabase (RLS). Zet databaserijen om naar domeintypes.
import type { SupabaseClient } from '@supabase/supabase-js';
import { applyHouseholdChecks, type HouseholdIngredientCheck } from '@/domain/household-checks';
import type { IngredientCatalog } from '@/domain/safety';
import type {
  AllergenCode, Attendee, FeedbackEntry, HistoryEntry, HouseholdContext, Ingredient, Leftover, PantryItem, Profile, ProfileRule,
  Recipe, RecipeStepDef, RecipeVariant, Unit,
} from '@/domain/types';
import type { SlotState } from '@/domain/slot-state';
import { ApiError } from './http';

function must<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  if (res.data === null) throw new ApiError('not_found');
  return res.data;
}

export interface HouseholdRow {
  id: string; name: string; locale: string; timezone: string; usual_diners: number;
  weekday_minutes: number | null; weekend_minutes: number | null; dinner_time: string | null;
  skill: 'easy' | 'medium'; equipment: string[]; weekly_budget_cents: number | null; meal_style: string | null;
  safety_claims_blocked: boolean; onboarding_step: string;
}

export interface ProfileRow { id: string; display_name: string; age_band: Profile['ageBand']; avatar: string; active: boolean; parent_decides: boolean; restrictions_status: 'unknown' | 'none' | 'recorded' }

export async function loadHousehold(db: SupabaseClient, householdId: string): Promise<HouseholdRow> {
  return must(await db.from('households').select('*').eq('id', householdId).single()) as HouseholdRow;
}

export async function loadProfiles(db: SupabaseClient, householdId: string, includeArchived = false): Promise<ProfileRow[]> {
  let q = db.from('profiles').select('id, display_name, age_band, avatar, active, parent_decides, restrictions_status').eq('household_id', householdId).order('created_at');
  if (!includeArchived) q = q.eq('active', true);
  return must(await q) as ProfileRow[];
}

export function toProfile(r: ProfileRow): Profile {
  return { id: r.id, displayName: r.display_name, ageBand: r.age_band, avatarColor: r.avatar, active: r.active };
}

interface RuleRow { id: string; profile_id: string; target_type: ProfileRule['targetType']; target_id: string; preparation: ProfileRule['preparation']; severity: ProfileRule['severity']; source: ProfileRule['source'] }

export async function loadRules(db: SupabaseClient, householdId: string): Promise<ProfileRule[]> {
  const rows = must(await db.from('profile_rules').select('id, profile_id, target_type, target_id, preparation, severity, source').eq('household_id', householdId)) as RuleRow[];
  return rows.map((r) => ({ id: r.id, profileId: r.profile_id, targetType: r.target_type, targetId: r.target_id, preparation: r.preparation, severity: r.severity, source: r.source }));
}

export function groupRules(rules: readonly ProfileRule[]): Map<string, ProfileRule[]> {
  const m = new Map<string, ProfileRule[]>();
  for (const r of rules) m.set(r.profileId, [...(m.get(r.profileId) ?? []), r]);
  return m;
}

export async function loadCatalog(db: SupabaseClient, householdId: string, now: Date): Promise<{ catalog: IngredientCatalog; recipes: Recipe[] }> {
  const [ings, allergens, recipes, ris, variants, checks] = await Promise.all([
    db.from('ingredients').select('*').eq('status', 'active'),
    db.from('ingredient_allergens').select('ingredient_id, allergen_code'),
    db.from('recipes').select('*'),
    db.from('recipe_ingredients').select('*').order('position'),
    db.from('recipe_variants').select('*'),
    db.from('household_ingredient_checks').select('ingredient_id, contains_allergens, diet, checked_at').eq('household_id', householdId),
  ]);
  const allergenMap = new Map<string, AllergenCode[]>();
  for (const a of must(allergens) as { ingredient_id: string; allergen_code: AllergenCode }[]) {
    allergenMap.set(a.ingredient_id, [...(allergenMap.get(a.ingredient_id) ?? []), a.allergen_code]);
  }
  const base = new Map<string, Ingredient>();
  for (const i of must(ings) as Record<string, unknown>[]) {
    const id = i.id as string;
    base.set(id, {
      id, canonicalName: i.canonical_name as string, unitKind: i.unit_kind as Ingredient['unitKind'], synonyms: (i.synonyms as string[]) ?? [],
      category: i.category as Ingredient['category'], allergens: allergenMap.get(id) ?? [], allergenStatus: i.allergen_status as Ingredient['allergenStatus'],
      diet: (i.diet as Ingredient['diet']) ?? null, priceEstimate: (i.price_estimate as Ingredient['priceEstimate']) ?? null,
    });
  }
  const checkList: HouseholdIngredientCheck[] = (must(checks) as { ingredient_id: string; contains_allergens: AllergenCode[]; diet: Ingredient['diet']; checked_at: string }[])
    .map((c) => ({ ingredientId: c.ingredient_id, containsAllergens: c.contains_allergens, diet: c.diet, checkedAt: c.checked_at }));
  const catalog = applyHouseholdChecks(base, checkList, now);

  const riByRecipe = new Map<string, Recipe['ingredients']>();
  for (const r of must(ris) as Record<string, unknown>[]) {
    const list = riByRecipe.get(r.recipe_id as string) ?? [];
    list.push({
      ingredientId: r.ingredient_id as string, quantity: Number(r.quantity), unit: r.unit as Unit, optional: r.optional as boolean,
      component: r.component as Recipe['ingredients'][number]['component'], preparation: r.preparation as Recipe['ingredients'][number]['preparation'],
      servedSeparately: r.served_separately as boolean,
    });
    riByRecipe.set(r.recipe_id as string, list);
  }
  const varByRecipe = new Map<string, RecipeVariant[]>();
  for (const v of must(variants) as Record<string, unknown>[]) {
    const list = varByRecipe.get(v.recipe_id as string) ?? [];
    list.push({ id: v.id as string, recipeId: v.recipe_id as string, name: v.variant_name as string, changes: v.changes_json as RecipeVariant['changes'], safetyReviewStatus: v.safety_review_status as RecipeVariant['safetyReviewStatus'] });
    varByRecipe.set(v.recipe_id as string, list);
  }
  const recipeList: Recipe[] = (must(recipes) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, ownerHouseholdId: (r.owner_household_id as string | null) ?? null, name: r.name as string, image: (r.image as string) ?? '',
    activeMinutes: r.active_minutes as number, totalMinutes: r.total_minutes as number, servings: r.servings as number,
    equipment: r.equipment as Recipe['equipment'], difficulty: r.difficulty as Recipe['difficulty'], cuisine: r.cuisine as string,
    mainProtein: r.main_protein as string, tags: r.tags as string[], ingredients: riByRecipe.get(r.id as string) ?? [],
    steps: r.instructions as RecipeStepDef[], variants: varByRecipe.get(r.id as string) ?? [], source: r.source as string,
    reviewStatus: r.review_status as Recipe['reviewStatus'],
  }));
  return { catalog, recipes: recipeList };
}

export async function loadPantry(db: SupabaseClient, householdId: string): Promise<(PantryItem & { id: string; location: string; version: number })[]> {
  const rows = must(await db.from('pantry_items').select('*').eq('household_id', householdId)) as Record<string, unknown>[];
  return rows.map((p) => ({
    id: p.id as string, ingredientId: p.ingredient_id as string, quantity: p.quantity == null ? null : Number(p.quantity), unit: (p.unit as Unit) ?? null,
    status: p.status as PantryItem['status'], verifiedAt: (p.verified_at as string) ?? null, expiresAt: (p.expires_at as string) ?? null,
    location: p.location as string, version: p.version as number,
  }));
}

export async function loadLeftovers(db: SupabaseClient, householdId: string): Promise<Leftover[]> {
  const rows = must(await db.from('leftovers').select('*').eq('household_id', householdId).order('stored_at', { ascending: false })) as Record<string, unknown>[];
  return rows.map((l) => ({
    id: l.id as string, sourceRecipeId: null, label: l.label as string, portions: l.portions as number, storedAt: l.stored_at as string,
    storage: l.storage as Leftover['storage'], useBy: l.use_by as string, status: l.status as Leftover['status'],
  }));
}

export interface SlotRow {
  id: string; plan_id: string; local_date: string; recipe_id: string | null; variant_ids: string[]; servings: number | null;
  state: SlotState; blocked_reason: string | null; plan_b_note: string | null; revision: number; accepted_at: string | null; updated_at: string;
}
export interface AttendeeRow { profile_id: string | null; guest_label: string | null; guest_allergies_known: boolean; attendance: Attendee['attendance'] }

export function toAttendees(rows: readonly AttendeeRow[]): Attendee[] {
  return rows.map((a) => ({ profileId: a.profile_id, guestLabel: a.guest_label ?? undefined, attendance: a.attendance, guestAllergiesKnown: a.guest_allergies_known }));
}

export async function loadSlot(db: SupabaseClient, householdId: string, slotId: string): Promise<{ slot: SlotRow; attendees: AttendeeRow[] }> {
  const slot = (await db.from('meal_slots').select('*').eq('id', slotId).eq('household_id', householdId).maybeSingle());
  if (slot.error) throw slot.error;
  if (!slot.data) throw new ApiError('not_found');
  const att = must(await db.from('meal_attendees').select('profile_id, guest_label, guest_allergies_known, attendance').eq('slot_id', slotId)) as AttendeeRow[];
  return { slot: slot.data as SlotRow, attendees: att };
}

export async function loadPlanSlots(db: SupabaseClient, planId: string): Promise<{ slots: SlotRow[]; attendees: Map<string, AttendeeRow[]> }> {
  const slots = must(await db.from('meal_slots').select('*').eq('plan_id', planId).order('local_date')) as SlotRow[];
  const ids = slots.map((s) => s.id);
  const att = ids.length ? must(await db.from('meal_attendees').select('slot_id, profile_id, guest_label, guest_allergies_known, attendance').in('slot_id', ids)) as (AttendeeRow & { slot_id: string })[] : [];
  const map = new Map<string, AttendeeRow[]>();
  for (const a of att) map.set(a.slot_id, [...(map.get(a.slot_id) ?? []), a]);
  return { slots, attendees: map };
}

export async function loadHistory(db: SupabaseClient, householdId: string, fromDate: string, toDate: string): Promise<HistoryEntry[]> {
  const rows = must(await db.from('meal_slots').select('id, local_date, recipe_id, state').eq('household_id', householdId)
    .gte('local_date', fromDate).lt('local_date', toDate).in('state', ['accepted', 'cooking', 'completed', 'changed']).not('recipe_id', 'is', null)) as { id: string; local_date: string; recipe_id: string }[];
  return rows.map((r) => ({ localDate: r.local_date, recipeId: r.recipe_id, profileIds: [] }));
}

export async function loadFeedback(db: SupabaseClient, householdId: string): Promise<FeedbackEntry[]> {
  const rows = must(await db.from('meal_feedback').select('rating, profile_id, meal_slots(recipe_id)').eq('household_id', householdId).limit(500)) as unknown as { rating: FeedbackEntry['rating']; profile_id: string | null; meal_slots: { recipe_id: string | null } | null }[];
  return rows.filter((r) => r.meal_slots?.recipe_id).map((r) => ({ recipeId: r.meal_slots!.recipe_id!, profileId: r.profile_id, rating: r.rating }));
}

export function householdContext(h: HouseholdRow, localDate: string): HouseholdContext {
  const dow = new Date(`${localDate}T12:00:00Z`).getUTCDay();
  const weekend = dow === 0 || dow === 6;
  return {
    availableMinutes: (weekend ? h.weekend_minutes ?? h.weekday_minutes : h.weekday_minutes) ?? null,
    equipment: (h.equipment as HouseholdContext['equipment']) ?? null,
    skill: h.skill,
    weeklyBudgetCents: h.weekly_budget_cents,
  };
}
