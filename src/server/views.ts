// Leesmodellen voor de schermen (S-03, S-04, S-11, S-14). Alles server-side berekend, onder RLS.
import { addDays, dayShort, dayNumber, greeting, weekStart } from '@/domain/dates';
import { countEaters, rankCandidates, type ScoredCandidate } from '@/domain/engine';
import { checkHardRules, describeBlock, effectiveIngredients } from '@/domain/safety';
import { formatQuantity, roundForShopping, scaleQuantity, toBase } from '@/domain/units';
import type { Attendee, Recipe } from '@/domain/types';
import type { RequestContext } from './context';
import { ApiError } from './http';
import { loadBundle, todayFor, type HouseholdBundle } from './planning';
import { loadHousehold, loadSlot, toAttendees, type AttendeeRow, type SlotRow } from './repo';

type Ctx = RequestContext & { householdId: string };

export interface ExplainView {
  safe: boolean;
  blockedReasons: string[];
  cautions: string[];
  reasons: string[];
  adaptations: string[];
  components: { key: string; label: string; value: number; known: boolean; weight: number }[];
  pantryChecks: string[];
}

const COMPONENT_LABELS: Record<string, string> = {
  preference: 'Voorkeuren van jullie gezin', time: 'Past binnen de tijd', pantry: 'Bekende voorraad', budget: 'Geschatte betaalbaarheid',
  variety: 'Afwisseling deze week', tableBalance: 'Tafelbalans (14 dagen)', leftovers: 'Slim benutten',
};

export function explain(recipe: Recipe, variantIds: string[], attendees: Attendee[], b: HouseholdBundle, localDate: string): ExplainView {
  const names = new Map(b.profiles.map((p) => [p.id, p.display_name]));
  const variants = recipe.variants.filter((v) => variantIds.includes(v.id));
  const hard = checkHardRules(recipe, variants, attendees, b.input.rulesByProfile, b.catalog);
  const res = rankCandidates({
    ...b.input, localDate, attendees, recipes: [recipe], allowRepeatRecipeIds: [recipe.id],
    context: { ...b.input.context, availableMinutes: b.input.context.availableMinutes, equipment: null, skill: 'medium' },
    parentDecides: new Map(b.profiles.map((p) => [p.id, true])),
  });
  // Ook buiten de tijd: uitleg moet bestaan voor handmatig gekozen gerechten.
  const c: ScoredCandidate | undefined = res.ranked[0] ?? rankCandidates({
    ...b.input, localDate, attendees, recipes: [recipe], allowRepeatRecipeIds: [recipe.id],
    context: { ...b.input.context, availableMinutes: null, equipment: null, skill: 'medium' },
    parentDecides: new Map(b.profiles.map((p) => [p.id, true])),
  }).ranked[0];
  const adaptations = (c?.preference.conflicts ?? []).filter((x) => x.ingredientId).map((x) => {
    const ing = b.catalog.get(x.ingredientId!)?.canonicalName.toLowerCase() ?? '';
    const who = names.get(x.profileId) ?? '';
    if (x.resolution === 'none') return `${who} vindt ${ing} ${x.severity === 'STRONG_DISLIKE' ? 'echt niet lekker' : 'liever niet'} — zit door het gerecht. Een ouder mag toch kiezen; ${who} hoeft het niet te eten.`;
    return x.resolution === 'variant' ? `Zonder ${ing} voor ${who}` : `${ing[0]?.toUpperCase()}${ing.slice(1)} apart voor ${who}`;
  });
  return {
    safe: hard.safe,
    blockedReasons: [...new Set(hard.blocks.map((x) => describeBlock(x, names, b.catalog)))],
    cautions: [...new Set(hard.cautions.map((x) => describeBlock(x, names, b.catalog)))],
    reasons: c?.reasons ?? [],
    adaptations,
    components: c ? Object.entries(c.components).map(([key, v]) => ({ key, label: COMPONENT_LABELS[key] ?? key, value: v.value, known: v.known, weight: 0 })) : [],
    pantryChecks: (c?.pantryChecks ?? []).map((id) => b.catalog.get(id)?.canonicalName ?? id),
  };
}

export interface ScaledIngredient { name: string; amount: string; optional: boolean; separately: boolean; component: string; replacedFrom?: string; allergens: string[]; verified: boolean }

export function scaledIngredients(recipe: Recipe, variantIds: string[], eaters: number, b: Pick<HouseholdBundle, 'catalog'>): ScaledIngredient[] {
  const n = Math.max(1, Math.min(12, eaters));
  return effectiveIngredients(recipe, recipe.variants.filter((v) => variantIds.includes(v.id))).map((ri) => {
    const ing = b.catalog.get(ri.ingredientId);
    const q = toBase(scaleQuantity(ri.quantity, recipe.servings, n), ri.unit);
    return {
      name: ing?.canonicalName ?? ri.ingredientId,
      amount: formatQuantity(roundForShopping(q.quantity, q.unit), q.unit),
      optional: ri.optional, separately: ri.servedSeparately, component: ri.component,
      replacedFrom: ri.replacedFrom ? b.catalog.get(ri.replacedFrom)?.canonicalName : undefined,
      allergens: ing?.allergens ?? [], verified: ing?.allergenStatus === 'verified',
    };
  });
}

export interface DayView {
  today: string;
  date: string;
  greeting: string;
  householdName: string;
  days: { date: string; label: string; number: string; selected: boolean }[];
  slot: SlotRow;
  attendees: AttendeeRow[];
  profiles: { id: string; name: string; avatar: string; initial: string; ageBand: string; restrictions: string }[];
  recipe: { id: string; name: string; image: string; totalMinutes: number; activeMinutes: number; variantNames: string[] } | null;
  explanation: ExplainView | null;
  eaters: number;
  fitLabelAllowed: boolean;
  warnings: string[];
  undoAvailable: boolean;
}

export async function dayView(ctx: Ctx, requestedDate?: string | null): Promise<DayView> {
  const household = await loadHousehold(ctx.supabase, ctx.householdId);
  const today = todayFor(household);
  const date = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : today;
  const start = weekStart(date);
  const plan = await ctx.supabase.rpc('ensure_week_plan', { p_week_start: start });
  if (plan.error) throw plan.error;
  const slotRow = await ctx.supabase.from('meal_slots').select('id').eq('plan_id', plan.data as string).eq('local_date', date).single();
  if (slotRow.error) throw slotRow.error;
  const { slot, attendees } = await loadSlot(ctx.supabase, ctx.householdId, slotRow.data.id);
  const b = await loadBundle(ctx, date);
  const att = toAttendees(attendees);
  const recipe = slot.recipe_id ? b.recipes.find((r) => r.id === slot.recipe_id) ?? null : null;
  const explanation = recipe ? explain(recipe, slot.variant_ids, att, b, date) : null;
  const me = b.profiles.find((p) => p.age_band === 'adult');
  const unknownRestrictions = att.some((a) => a.attendance !== 'no' && a.profileId && b.profiles.find((p) => p.id === a.profileId)?.restrictions_status === 'unknown');
  const guestUnknown = att.some((a) => !a.profileId && a.attendance !== 'no' && !a.guestAllergiesKnown);
  const attendanceUnknown = att.some((a) => a.attendance === 'unknown');
  const warnings: string[] = [];
  if (b.household.safety_claims_blocked) warnings.push('Toestemming voor gezondheidsgegevens is ingetrokken: we doen geen uitspraken over geschiktheid.');
  if (unknownRestrictions) warnings.push('Nog niet van iedereen bekend of er allergieën of medische beperkingen zijn.');
  if (guestUnknown) warnings.push('Allergieën van een gast zijn onbekend — vraag het even na.');
  if (attendanceUnknown) warnings.push('Nog niet van iedereen bekend of ze mee-eten.');

  let undoAvailable = false;
  const rev = await ctx.supabase.from('slot_revisions').select('revision, event_type, created_at, undone_at').eq('slot_id', slot.id).eq('revision', slot.revision - 1).maybeSingle();
  if (rev.data && !rev.data.undone_at && ['plan_b_apply', 'accept', 'swap', 'attendance'].includes(rev.data.event_type) && Date.now() - Date.parse(rev.data.created_at) < 10 * 60_000) undoAvailable = true;

  return {
    today, date,
    greeting: `${greeting(new Date(), household.timezone)}${me ? `, ${me.display_name.toUpperCase()}` : ''}`,
    householdName: household.name,
    days: Array.from({ length: 7 }, (_, i) => addDays(start, i)).map((d) => ({ date: d, label: dayShort(d), number: dayNumber(d), selected: d === date })),
    slot, attendees,
    profiles: b.profiles.map((p) => ({ id: p.id, name: p.display_name, avatar: p.avatar, initial: p.display_name.slice(0, 1).toUpperCase(), ageBand: p.age_band, restrictions: p.restrictions_status })),
    recipe: recipe ? { id: recipe.id, name: recipe.name, image: recipe.image, totalMinutes: recipe.totalMinutes + recipe.variants.filter((v) => slot.variant_ids.includes(v.id)).flatMap((v) => v.changes).reduce((s, c) => s + (c.op === 'time' ? c.deltaMinutes : 0), 0), activeMinutes: recipe.activeMinutes, variantNames: recipe.variants.filter((v) => slot.variant_ids.includes(v.id)).map((v) => v.name) } : null,
    explanation,
    eaters: countEaters(att),
    fitLabelAllowed: !!explanation?.safe && !b.household.safety_claims_blocked && !unknownRestrictions && !guestUnknown && !attendanceUnknown,
    warnings,
    undoAvailable,
  };
}

export async function slotRecipeView(ctx: Ctx, slotId: string) {
  const { slot, attendees } = await loadSlot(ctx.supabase, ctx.householdId, slotId);
  if (!slot.recipe_id) throw new ApiError('not_found');
  const b = await loadBundle(ctx, slot.local_date);
  const recipe = b.recipes.find((r) => r.id === slot.recipe_id);
  if (!recipe) throw new ApiError('not_found');
  const att = toAttendees(attendees);
  return { slot, recipe, attendees: att, bundle: b, eaters: Math.max(1, countEaters(att)), explanation: explain(recipe, slot.variant_ids, att, b, slot.local_date), ingredients: scaledIngredients(recipe, slot.variant_ids, Math.max(1, countEaters(att)), b) };
}

export { todayFor };
