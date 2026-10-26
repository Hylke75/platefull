// Planningsservice: §7.2 (autorisatie → engine → AI → postvalidatie → voorstelversie) en §8 (mutaties).
import { createHash } from 'node:crypto';
import { addDays, localDate } from '@/domain/dates';
import { countEaters, rankCandidates, type EngineInput, type EngineResult, type ScoredCandidate } from '@/domain/engine';
import { previewPlanB, sanitizeFreeText, type PlanBOutcome, type PlanBScenario } from '@/domain/planb';
import { evaluatePreferences } from '@/domain/preferences';
import { checkHardRules, describeBlock, type IngredientCatalog } from '@/domain/safety';
import { computeNeeds, reconcileShoppingList, type PlannedMeal, type ShoppingItemRecord } from '@/domain/shopping';
import type { Attendee, Recipe } from '@/domain/types';
import { chooseWithAi, type AiChoice } from './ai';
import type { RequestContext } from './context';
import { ApiError } from './http';
import {
  groupRules, householdContext, loadCatalog, loadFeedback, loadHistory, loadHousehold, loadLeftovers, loadPantry, loadPlanSlots,
  loadProfiles, loadRules, loadSlot, toAttendees, toProfile, type HouseholdRow, type ProfileRow, type SlotRow,
} from './repo';

type Ctx = RequestContext & { householdId: string };

export interface HouseholdBundle {
  household: HouseholdRow;
  profiles: ProfileRow[];
  input: Omit<EngineInput, 'attendees' | 'localDate'>;
  recipes: Recipe[];
  catalog: IngredientCatalog;
}

export async function loadBundle(ctx: Ctx, forDate: string, now = new Date()): Promise<HouseholdBundle> {
  const db = ctx.supabase;
  const [household, profiles, rules, { catalog, recipes }, pantry, leftovers, history, feedback] = await Promise.all([
    loadHousehold(db, ctx.householdId),
    loadProfiles(db, ctx.householdId),
    loadRules(db, ctx.householdId),
    loadCatalog(db, ctx.householdId, now),
    loadPantry(db, ctx.householdId),
    loadLeftovers(db, ctx.householdId),
    loadHistory(db, ctx.householdId, addDays(forDate, -14), forDate),
    loadFeedback(db, ctx.householdId),
  ]);
  return {
    household, profiles, recipes, catalog,
    input: {
      now,
      profiles: profiles.map(toProfile),
      rulesByProfile: groupRules(rules),
      parentDecides: new Map(profiles.map((p) => [p.id, p.parent_decides])),
      context: householdContext(household, forDate),
      recipes, catalog, pantry, leftovers, history, feedback,
    },
  };
}

export interface SuggestionView {
  status: 'ok' | 'insufficient_data' | 'no_safe_candidate' | 'unavailable';
  slotId: string;
  revision: number;
  suggestion: CandidateView | null;
  alternatives: CandidateView[];
  warnings: string[];
  fitLabelAllowed: boolean;
  confidence: EngineResult['confidence'];
  aiStatus: 'not_used' | 'ok' | 'unavailable' | 'rejected';
}

export interface CandidateView {
  recipeId: string;
  name: string;
  image: string;
  totalMinutes: number;
  activeMinutes: number;
  eaters: number;
  variantIds: string[];
  variantNames: string[];
  reasons: string[];
  adaptations: string[];
  pantryChecks: string[];
}

function candidateView(c: ScoredCandidate, b: HouseholdBundle, reasons?: string[]): CandidateView {
  const recipe = b.recipes.find((r) => r.id === c.recipeId)!;
  const names = new Map(b.profiles.map((p) => [p.id, p.display_name]));
  const adaptations = c.preference.conflicts.filter((x) => x.ingredientId).map((x) => {
    const ing = b.catalog.get(x.ingredientId!)?.canonicalName.toLowerCase() ?? '';
    const who = names.get(x.profileId) ?? '';
    if (x.resolution === 'none') return `${who} vindt ${ing} ${x.severity === 'STRONG_DISLIKE' ? 'echt niet lekker' : 'liever niet'} — zit door het gerecht`;
    return x.resolution === 'variant' ? `Zonder ${ing} voor ${who}` : `${ing[0]?.toUpperCase()}${ing.slice(1)} apart voor ${who}`;
  });
  return {
    recipeId: c.recipeId, name: recipe.name, image: recipe.image, totalMinutes: c.totalMinutes, activeMinutes: c.activeMinutes,
    eaters: c.eaters, variantIds: c.variantIds, variantNames: recipe.variants.filter((v) => c.variantIds.includes(v.id)).map((v) => v.name),
    reasons: reasons ?? c.reasons, adaptations, pantryChecks: c.pantryChecks.map((id) => b.catalog.get(id)?.canonicalName ?? id),
  };
}

function inputHash(input: EngineInput): string {
  const payload = JSON.stringify({
    d: input.localDate, a: input.attendees, r: [...input.rulesByProfile.entries()], c: input.context,
    p: input.pantry.map((x) => [x.ingredientId, x.status, x.quantity]), h: input.history, x: input.excludeRecipeIds,
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

/** §7.2 stap 8: iedere gekozen recipe_id bestaat, past bij de huidige context en heeft een veilige ingrediëntstatus. */
export function postValidate(candidate: { recipeId: string; variantIds: string[] }, attendees: readonly Attendee[], b: HouseholdBundle): void {
  const recipe = b.recipes.find((r) => r.id === candidate.recipeId);
  if (!recipe) throw new ApiError('unsafe_or_unavailable', 'Dit gerecht bestaat niet (meer).');
  const variants = candidate.variantIds.map((id) => recipe.variants.find((v) => v.id === id));
  if (variants.some((v) => !v)) throw new ApiError('unsafe_or_unavailable', 'Onbekende aanpassing.');
  const check = checkHardRules(recipe, variants as Recipe['variants'], attendees, b.input.rulesByProfile, b.catalog);
  if (!check.safe) {
    const names = new Map(b.profiles.map((p) => [p.id, p.display_name]));
    // Meest concrete reden eerst: een aanwezig allergeen zegt meer dan 'informatie onvolledig'.
    const order = ['contains_allergen', 'medical_exclusion', 'violates_diet'];
    const rank = (r: string) => (order.includes(r) ? order.indexOf(r) : order.length);
    const first = [...check.blocks].sort((x, y) => rank(x.reason) - rank(y.reason))[0]!;
    throw new ApiError('unsafe_or_unavailable', describeBlock(first, names, b.catalog));
  }
}

export async function suggestForSlot(ctx: Ctx, slotId: string, opts: { excludeRecipeIds?: string[]; useAi?: boolean } = {}): Promise<{ view: SuggestionView; result: EngineResult; input: EngineInput; slot: SlotRow; attendees: Attendee[]; bundle: HouseholdBundle }> {
  const { slot, attendees: attRows } = await loadSlot(ctx.supabase, ctx.householdId, slotId);
  const bundle = await loadBundle(ctx, slot.local_date);
  const attendees = toAttendees(attRows);
  const input: EngineInput = { ...bundle.input, localDate: slot.local_date, attendees, excludeRecipeIds: opts.excludeRecipeIds };
  const result = rankCandidates(input);

  let aiStatus: SuggestionView['aiStatus'] = 'not_used';
  let main = result.ranked[0] ?? null;
  let alts = result.ranked.slice(1, 3);
  let aiReasons: string[] | undefined;
  if (opts.useAi !== false && result.ranked.length > 1) {
    const choice: AiChoice = await chooseWithAi(result, bundle, input);
    aiStatus = choice.status;
    if (choice.status === 'ok') {
      main = result.ranked.find((c) => c.recipeId === choice.suggestedRecipeId) ?? main;
      alts = choice.alternativeRecipeIds.map((id) => result.ranked.find((c) => c.recipeId === id)!).filter((c) => c && c !== main).slice(0, 2);
      if (alts.length < 2) alts = [...alts, ...result.ranked.filter((c) => c !== main && !alts.includes(c))].slice(0, 2);
      aiReasons = choice.reasons;
    }
  }
  // Postvalidatie, ook voor de deterministische keuze.
  if (main) postValidate(main, attendees, bundle);
  for (const a of alts) postValidate(a, attendees, bundle);

  const blocked = bundle.household.safety_claims_blocked;
  const unknownRestrictions = attendees.some((a) => a.attendance !== 'no' && a.profileId && bundle.profiles.find((p) => p.id === a.profileId)?.restrictions_status === 'unknown');
  const warnings = [...result.warnings];
  if (unknownRestrictions) warnings.unshift('Nog niet van iedereen bekend of er allergieën of medische beperkingen zijn.');
  if (blocked) warnings.unshift('Toestemming voor gezondheidsgegevens is ingetrokken: we doen geen uitspraken over geschiktheid.');
  if (aiStatus === 'unavailable') warnings.push('De slimme toelichting is tijdelijk niet beschikbaar.');

  const view: SuggestionView = {
    status: result.status,
    slotId: slot.id,
    revision: slot.revision,
    suggestion: main ? candidateView(main, bundle, aiReasons) : null,
    alternatives: alts.map((a) => candidateView(a, bundle)),
    warnings,
    fitLabelAllowed: result.fitLabelAllowed && !blocked && !unknownRestrictions,
    confidence: result.confidence,
    aiStatus,
  };
  return { view, result, input, slot, attendees, bundle };
}

function proposalSnapshot(view: SuggestionView, result: EngineResult, input: EngineInput) {
  return {
    input_hash: inputHash(input),
    safe_candidate_ids: result.ranked.map((c) => c.recipeId),
    suggested_recipe_id: view.suggestion?.recipeId ?? null,
    alternative_recipe_ids: view.alternatives.map((a) => a.recipeId),
    reasons: view.suggestion?.reasons ?? [],
    warnings: view.warnings,
    engine_status: result.status,
    ai_status: view.aiStatus,
  };
}

interface CommitArgs {
  slotId: string; expectedRevision: number; idempotencyKey: string | null; event: string; newState: string;
  recipeId?: string | null; variantIds?: string[] | null; servings?: number | null; attendees?: Attendee[] | null;
  planBNote?: string | null; shopping?: ShoppingItemRecord[] | null; proposal?: unknown;
}

export async function commit(ctx: Ctx, a: CommitArgs): Promise<{ slot_id: string; revision: number; state: string; recipe_id: string | null }> {
  const { data, error } = await ctx.supabase.rpc('commit_slot_change', {
    p_slot_id: a.slotId, p_expected_revision: a.expectedRevision, p_idempotency_key: a.idempotencyKey, p_event_type: a.event,
    p_new_state: a.newState, p_recipe_id: a.recipeId ?? null, p_variant_ids: a.variantIds ?? null, p_servings: a.servings ?? null,
    p_attendees: a.attendees ? a.attendees.map((x) => ({ profile_id: x.profileId, guest_label: x.guestLabel ?? null, guest_allergies_known: x.guestAllergiesKnown ?? false, attendance: x.attendance })) : null,
    p_plan_b_note: a.planBNote ?? null,
    p_shopping: a.shopping ? a.shopping.filter((i) => i.origin === 'auto').map((i) => ({ origin: 'auto', item_key: i.key, ingredient_id: i.ingredientId, description: i.description, qty: i.qty, unit: i.unit, category: i.category, state: i.state, not_needed: i.notNeeded, check_status: i.check })) : null,
    p_proposal: a.proposal ?? null,
  });
  if (error) throw error;
  return data as { slot_id: string; revision: number; state: string; recipe_id: string | null };
}

/** Bewaar een voorstel als voorstelversie (§7.2 stap 10). Accepteren gebeurt pas na een menselijke klik. */
export async function proposeSlot(ctx: Ctx, slotId: string, event: 'propose' | 'swap', idem: string | null, exclude?: string[]) {
  const s = await suggestForSlot(ctx, slotId, { excludeRecipeIds: exclude });
  if (!s.view.suggestion) return { view: s.view, revision: s.slot.revision };
  if (!['draft', 'proposed', 'dismissed', 'cancelled', 'blocked', 'accepted'].includes(s.slot.state)) throw new ApiError('unsafe_or_unavailable', 'Deze maaltijd is al begonnen of afgerond.');
  // Een nieuw voorstel is altijd 'proposed'; een eerder geaccepteerd gerecht wordt daarmee weer een voorstel.
  const res = await commit(ctx, {
    slotId, expectedRevision: s.slot.revision, idempotencyKey: idem, event, newState: 'proposed',
    recipeId: s.view.suggestion.recipeId, variantIds: s.view.suggestion.variantIds, servings: countEaters(s.attendees),
    shopping: s.slot.state === 'accepted' ? await recomputeShopping(ctx, s.slot.plan_id, { slotId, state: 'proposed' }) : null,
    proposal: proposalSnapshot(s.view, s.result, s.input),
  });
  return { view: { ...s.view, revision: res.revision }, revision: res.revision };
}

/** Herberekent de automatische boodschappen voor het hele weekplan, met een optionele (nog niet opgeslagen) slotwijziging. */
export async function recomputeShopping(ctx: Ctx, planId: string, change?: { slotId: string; state: string; recipeId?: string; variantIds?: string[]; attendees?: Attendee[] }): Promise<ShoppingItemRecord[]> {
  const { slots, attendees } = await loadPlanSlots(ctx.supabase, planId);
  const { catalog, recipes } = await loadCatalog(ctx.supabase, ctx.householdId, new Date());
  const pantry = await loadPantry(ctx.supabase, ctx.householdId);
  const meals: PlannedMeal[] = [];
  for (const s of slots) {
    const isChanged = change?.slotId === s.id;
    const state = isChanged ? change!.state : s.state;
    if (!['accepted', 'changed', 'cooking'].includes(state)) continue;
    const recipeId = isChanged && change!.recipeId ? change!.recipeId : s.recipe_id;
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) continue;
    const variantIds = isChanged && change!.variantIds ? change!.variantIds : s.variant_ids;
    const att = isChanged && change!.attendees ? change!.attendees : toAttendees(attendees.get(s.id) ?? []);
    const eaters = Math.max(1, Math.min(12, countEaters(att)));
    meals.push({ slotId: s.id, recipe, variants: recipe.variants.filter((v) => variantIds.includes(v.id)), eaters });
  }
  const needs = computeNeeds(meals, pantry, catalog, new Date());
  const list = await ctx.supabase.from('shopping_lists').select('id').eq('plan_id', planId).single();
  if (list.error) throw list.error;
  const existing = await ctx.supabase.from('shopping_items').select('*').eq('list_id', list.data.id);
  if (existing.error) throw existing.error;
  const records: ShoppingItemRecord[] = (existing.data as Record<string, unknown>[]).map((i) => ({
    id: i.id as string, ingredientId: (i.ingredient_id as string) ?? null, key: (i.item_key as string) ?? null, description: i.description as string,
    qty: i.qty == null ? null : Number(i.qty), unit: (i.unit as string) ?? null, category: i.category as ShoppingItemRecord['category'],
    origin: i.origin as 'auto' | 'manual', state: i.state as ShoppingItemRecord['state'], notNeeded: i.not_needed as boolean, check: i.check_status as ShoppingItemRecord['check'],
  }));
  return reconcileShoppingList(records, needs, (key) => key);
}

export async function acceptSlot(ctx: Ctx, slotId: string, expectedRevision: number, idem: string, body: { recipe_id?: string; variant_ids?: string[]; override_soft?: boolean }) {
  const { slot, attendees: attRows } = await loadSlot(ctx.supabase, ctx.householdId, slotId);
  if (slot.revision !== expectedRevision) throw new ApiError('revision_conflict', undefined, { current_revision: slot.revision });
  const bundle = await loadBundle(ctx, slot.local_date);
  const attendees = toAttendees(attRows);
  const recipeId = body.recipe_id ?? slot.recipe_id;
  const variantIds = body.variant_ids ?? slot.variant_ids;
  if (!recipeId) throw new ApiError('invalid_input', 'Kies eerst een gerecht.');
  postValidate({ recipeId, variantIds }, attendees, bundle);

  // F-006: zachte afkeer van een kind zonder aanpassing → ouder bevestigt bewust 'Toch kiezen'.
  const recipe = bundle.recipes.find((r) => r.id === recipeId)!;
  const pref = evaluatePreferences(recipe, recipe.variants.filter((v) => variantIds.includes(v.id)), attendees, bundle.input.rulesByProfile, bundle.input.parentDecides);
  const unresolved = pref.conflicts.filter((c) => c.resolution === 'none' && c.severity === 'STRONG_DISLIKE');
  if (unresolved.length && !body.override_soft) {
    const names = new Map(bundle.profiles.map((p) => [p.id, p.display_name]));
    throw new ApiError('unsafe_or_unavailable', 'Iemand vindt een onderdeel echt niet lekker. Kies bewust ‘Toch kiezen’ of een ander idee.', {
      soft_conflicts: unresolved.map((c) => ({ profile: names.get(c.profileId), ingredient: c.ingredientId ? bundle.catalog.get(c.ingredientId)?.canonicalName : c.tag })),
    });
  }

  let revision = slot.revision;
  if (!['proposed', 'accepted', 'changed'].includes(slot.state) || slot.recipe_id !== recipeId || slot.variant_ids.join() !== variantIds.join()) {
    const p = await commit(ctx, { slotId, expectedRevision: revision, idempotencyKey: `${idem}-p`, event: 'manual_plan', newState: 'proposed', recipeId, variantIds, servings: countEaters(attendees) });
    revision = p.revision;
  }
  const shopping = await recomputeShopping(ctx, slot.plan_id, { slotId, state: 'accepted', recipeId, variantIds });
  return commit(ctx, { slotId, expectedRevision: revision, idempotencyKey: idem, event: 'accept', newState: 'accepted', servings: countEaters(attendees), shopping });
}

export async function planBPreview(ctx: Ctx, slotId: string, scenario: PlanBScenario, freeText?: string | null): Promise<{ outcome: PlanBOutcome; revision: number; note: string | null; shoppingDelta: { added: number; removed: number; changed: number } }> {
  const { slot, attendees: attRows } = await loadSlot(ctx.supabase, ctx.householdId, slotId);
  if (!slot.recipe_id) throw new ApiError('invalid_input', 'Er staat nog geen maaltijd op deze dag.');
  if (['completed', 'cancelled'].includes(slot.state)) throw new ApiError('unsafe_or_unavailable', 'Deze maaltijd is al afgerond.');
  const bundle = await loadBundle(ctx, slot.local_date);
  const recipe = bundle.recipes.find((r) => r.id === slot.recipe_id);
  if (!recipe) throw new ApiError('not_found');
  const attendees = toAttendees(attRows);
  if (scenario.kind === 'attendee_absent' || scenario.kind === 'taste_conflict') {
    const ids = scenario.kind === 'attendee_absent' ? scenario.profileIds : [scenario.profileId];
    if (ids.some((id) => !bundle.profiles.some((p) => p.id === id))) throw new ApiError('not_found');
  }
  const input: EngineInput = { ...bundle.input, localDate: slot.local_date, attendees };
  const outcome = previewPlanB({ slotId, revision: slot.revision, recipe, variants: recipe.variants.filter((v) => slot.variant_ids.includes(v.id)), attendees }, scenario, input);
  if (outcome.status === 'ok') postValidate(outcome.next, outcome.next.attendees, bundle);
  let shoppingDelta = { added: 0, removed: 0, changed: 0 };
  if (outcome.status === 'ok' && ['accepted', 'changed', 'cooking'].includes(slot.state)) {
    const before = await recomputeShopping(ctx, slot.plan_id);
    const after = await recomputeShopping(ctx, slot.plan_id, { slotId, state: slot.state, recipeId: outcome.next.recipeId, variantIds: outcome.next.variantIds, attendees: outcome.next.attendees });
    const b = new Map(before.filter((i) => i.origin === 'auto' && !i.notNeeded).map((i) => [i.key, i.qty]));
    const a = new Map(after.filter((i) => i.origin === 'auto' && !i.notNeeded).map((i) => [i.key, i.qty]));
    shoppingDelta = {
      added: [...a.keys()].filter((k) => !b.has(k)).length,
      removed: [...b.keys()].filter((k) => !a.has(k)).length,
      changed: [...a.keys()].filter((k) => b.has(k) && b.get(k) !== a.get(k)).length,
    };
  }
  return { outcome, revision: slot.revision, note: sanitizeFreeText(freeText), shoppingDelta };
}

export async function planBApply(ctx: Ctx, slotId: string, expectedRevision: number, idem: string, scenario: PlanBScenario, freeText?: string | null) {
  // Nooit de diff van de client vertrouwen: opnieuw berekenen op de huidige revisie.
  const { outcome, revision } = await planBPreview(ctx, slotId, scenario, freeText);
  if (revision !== expectedRevision) throw new ApiError('revision_conflict', undefined, { current_revision: revision });
  if (outcome.status !== 'ok') throw new ApiError('unsafe_or_unavailable', outcome.explanation);
  const { slot } = await loadSlot(ctx.supabase, ctx.householdId, slotId);
  const newState = slot.state === 'proposed' ? 'proposed' : slot.state === 'cooking' ? 'cooking' : 'accepted';
  const shopping = ['accepted', 'changed', 'cooking'].includes(slot.state)
    ? await recomputeShopping(ctx, slot.plan_id, { slotId, state: newState, recipeId: outcome.next.recipeId, variantIds: outcome.next.variantIds, attendees: outcome.next.attendees })
    : null;
  const note = planBNote(scenario, outcome);
  return commit(ctx, {
    slotId, expectedRevision, idempotencyKey: idem, event: 'plan_b_apply', newState,
    recipeId: outcome.next.recipeId, variantIds: outcome.next.variantIds, attendees: outcome.next.attendees,
    servings: countEaters(outcome.next.attendees), planBNote: note, shopping,
  });
}

function planBNote(scenario: PlanBScenario, outcome: Extract<PlanBOutcome, { status: 'ok' }>): string {
  const d = outcome.diff;
  if (d.substitutions?.length && d.substitutions[0]!.to) return `${d.substitutions[0]!.toName} vervangen ${d.substitutions[0]!.fromName.toLowerCase()}`;
  if (d.eaters) return `${d.eaters.to} eters: hoeveelheden aangepast`;
  if (d.servedSeparately?.length) return `${d.servedSeparately[0]!.name} apart geserveerd`;
  if (d.recipe) return `Gewisseld naar ${d.recipe.toName}`;
  if (d.minutes) return `Snellere bereiding: ${d.minutes.to} minuten`;
  return outcome.title;
}

export async function undoSlot(ctx: Ctx, slotId: string, expectedRevision: number, idem: string) {
  await loadSlot(ctx.supabase, ctx.householdId, slotId);
  const { data, error } = await ctx.supabase.rpc('undo_slot_change', { p_slot_id: slotId, p_expected_revision: expectedRevision, p_idempotency_key: idem });
  if (error) throw error;
  return data as { slot_id: string; revision: number; state: string };
}

export function todayFor(household: Pick<HouseholdRow, 'timezone'>, now = new Date()): string {
  return localDate(now, household.timezone);
}
