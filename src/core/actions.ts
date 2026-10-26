// Gedeelde mutaties voor web-API en mobiele app. Alle schrijfacties lopen onder de sessie van de gebruiker (RLS)
// en de veiligheidskritische stappen via de transactionele databasefuncties (commit_slot_change e.d.).
import { countEaters } from '../domain/engine';
import { leftoverUseBy } from '../domain/pantry';
import type { Attendance, Leftover, Unit } from '../domain/types';
import type { CoreCtx } from './context';
import { ApiError } from './errors';
import { commit, loadBundle, postValidate, proposeSlot, recomputeShopping, type AiChooser } from './planning';
import { loadProfiles, loadSlot, toAttendees } from './repo';

export type ActionCtx = CoreCtx & { userId: string };

const HARD = ['HARD_ALLERGY', 'HARD_MEDICAL', 'HARD_DIET'];

/** 'Ander idee': volgend, al gevalideerd alternatief als voorstel — nooit ongevraagd geaccepteerd. */
export async function swapSlot(ctx: CoreCtx, slotId: string, expectedRevision: number, idem: string | null, chooser?: AiChooser) {
  const { slot } = await loadSlot(ctx.supabase, ctx.householdId, slotId);
  if (slot.revision !== expectedRevision) throw new ApiError('revision_conflict', undefined, { current_revision: slot.revision });
  // Recent getoonde voorstellen overslaan, zodat 'Ander idee' echt iets anders laat zien.
  const { data: recent } = await ctx.supabase.from('proposal_snapshots').select('suggested_recipe_id').eq('slot_id', slotId).order('created_at', { ascending: false }).limit(3);
  const exclude = [...new Set([slot.recipe_id, ...(recent ?? []).map((r) => r.suggested_recipe_id as string | null)].filter((x): x is string => !!x))];
  let res = await proposeSlot(ctx, slotId, 'swap', idem, exclude, chooser);
  if (!res.view.suggestion && exclude.length > 1) res = await proposeSlot(ctx, slotId, 'swap', null, slot.recipe_id ? [slot.recipe_id] : [], chooser);
  return res.view;
}

export interface AttendeeInput { profile_id: string | null; guest_label?: string; guest_allergies_known?: boolean; attendance: Attendance }

/** 'Wie eet er mee?' per slot (R-03). Onbekend blijft onbekend; gasten zonder bekende allergieën blijven zo gemarkeerd. */
export async function setAttendance(ctx: CoreCtx, slotId: string, expectedRevision: number, idem: string, input: AttendeeInput[]) {
  const { slot } = await loadSlot(ctx.supabase, ctx.householdId, slotId);
  const profiles = new Set((await loadProfiles(ctx.supabase, ctx.householdId)).map((p) => p.id));
  if (input.some((a) => a.profile_id && !profiles.has(a.profile_id))) throw new ApiError('not_found');
  if (input.some((a) => !a.profile_id && !a.guest_label)) throw new ApiError('invalid_input', 'Geef een gast een naam.');
  const attendees = input.map((a) => ({ profileId: a.profile_id, guestLabel: a.guest_label, guestAllergiesKnown: a.guest_allergies_known ?? false, attendance: a.attendance }));
  const shopping = ['accepted', 'changed', 'cooking'].includes(slot.state) ? await recomputeShopping(ctx, slot.plan_id, { slotId, state: slot.state, attendees }) : null;
  return commit(ctx, {
    slotId, expectedRevision, idempotencyKey: idem, event: 'attendance', newState: slot.state,
    attendees, servings: Math.max(1, countEaters(attendees)), shopping,
  });
}

/** 'Gekookt' (S-11): slot afronden, optioneel restjes en feedback. */
export async function completeSlot(
  ctx: ActionCtx, slotId: string, expectedRevision: number, idem: string,
  body: { leftovers?: { portions: number; storage: Leftover['storage'] } | null; feedback?: { profile_id: string | null; rating: 'repeat' | 'fine' | 'rather_not' }[] },
) {
  const { slot } = await loadSlot(ctx.supabase, ctx.householdId, slotId);
  let revision = expectedRevision;
  if (slot.state === 'completed') return { slot_id: slotId, revision: slot.revision, state: 'completed', recipe_id: slot.recipe_id };
  if (!['accepted', 'changed', 'cooking'].includes(slot.state)) throw new ApiError('unsafe_or_unavailable', 'Bevestig eerst de maaltijd.');
  if (slot.state !== 'cooking') {
    revision = (await commit(ctx, { slotId, expectedRevision: revision, idempotencyKey: `${idem}-c`, event: 'start_cooking', newState: 'cooking' })).revision;
  }
  const res = await commit(ctx, { slotId, expectedRevision: revision, idempotencyKey: idem, event: 'complete', newState: 'completed' });
  if (body.leftovers) {
    const { data: recipe } = await ctx.supabase.from('recipes').select('name').eq('id', slot.recipe_id ?? '').maybeSingle();
    await addLeftover(ctx, { label: (recipe?.name as string | undefined) ?? 'Restjes', portions: body.leftovers.portions, storage: body.leftovers.storage, source_slot_id: slotId });
  }
  if (body.feedback?.length) {
    // Eén waardering per eter per maaltijd; een tweede verzoek (retry) wordt genegeerd.
    const { data: prior } = await ctx.supabase.from('meal_feedback').select('profile_id').eq('slot_id', slotId);
    const seen = new Set((prior ?? []).map((f) => f.profile_id as string | null));
    const rows = body.feedback.filter((f) => !seen.has(f.profile_id)).map((f) => ({ household_id: ctx.householdId, slot_id: slotId, profile_id: f.profile_id, rating: f.rating, created_by: ctx.userId }));
    if (rows.length) {
      const { error } = await ctx.supabase.from('meal_feedback').insert(rows);
      if (error) throw error;
    }
  }
  return res;
}

/** Handmatig een dag wijzigen (F-009). Ook handmatige keuzes gaan door dezelfde veiligheidscontrole. */
export async function planDay(ctx: CoreCtx, planId: string, slotId: string, recipeId: string | null, expectedRevision: number, idem: string | null) {
  const { slot, attendees: rows } = await loadSlot(ctx.supabase, ctx.householdId, slotId);
  if (slot.plan_id !== planId) throw new ApiError('not_found');
  if (recipeId === null) {
    const target = ['accepted', 'changed', 'cooking'].includes(slot.state) ? 'cancelled' : 'dismissed';
    const shopping = target === 'cancelled' ? await recomputeShopping(ctx, planId, { slotId: slot.id, state: 'cancelled' }) : null;
    return commit(ctx, { slotId: slot.id, expectedRevision, idempotencyKey: idem, event: 'cancel', newState: target, shopping });
  }
  const bundle = await loadBundle(ctx, slot.local_date);
  const attendees = toAttendees(rows);
  postValidate({ recipeId, variantIds: [] }, attendees, bundle);
  const shopping = slot.state === 'accepted' ? await recomputeShopping(ctx, planId, { slotId: slot.id, state: 'proposed' }) : null;
  return commit(ctx, {
    slotId: slot.id, expectedRevision, idempotencyKey: idem, event: 'manual_plan', newState: 'proposed',
    recipeId, variantIds: [], servings: countEaters(attendees), shopping,
  });
}

export interface SoftRuleInput { target_type: 'ingredient' | 'tag'; target_id: string; preparation: string; severity: string }

/** Volledige set zachte voorkeuren vervangen. Harde regels blijven onaangetast (RLS weigert ze hier sowieso). */
export async function savePreferences(ctx: ActionCtx, profileId: string, rules: SoftRuleInput[], source: 'adult' | 'child_shared_device' | 'teen') {
  const { data: own } = await ctx.supabase.from('profiles').select('id').eq('id', profileId).eq('household_id', ctx.householdId).maybeSingle();
  if (!own) throw new ApiError('not_found');
  if (rules.some((r) => HARD.includes(r.severity))) throw new ApiError('invalid_input', 'Harde beperkingen leg je apart vast.');
  const { data: hard } = await ctx.supabase.from('profile_rules').select('target_type, target_id').eq('profile_id', profileId).in('severity', HARD);
  const hardKeys = new Set((hard ?? []).map((h) => `${h.target_type}:${h.target_id}`));
  const rows = rules
    .filter((r) => !hardKeys.has(`${r.target_type}:${r.target_id}`))
    .map((r) => ({ household_id: ctx.householdId, profile_id: profileId, target_type: r.target_type, target_id: r.target_id, preparation: r.preparation, severity: r.severity, source, created_by: ctx.userId }));
  // Eerst upsert, dan pas overbodige zachte regels weg: een fout halverwege verliest geen voorkeuren.
  if (rows.length) {
    const up = await ctx.supabase.from('profile_rules').upsert(rows, { onConflict: 'profile_id,target_type,target_id,preparation' });
    if (up.error) throw up.error;
  }
  const keep = new Set(rows.map((r) => `${r.target_type}:${r.target_id}:${r.preparation}`));
  const { data: current, error } = await ctx.supabase.from('profile_rules').select('id, target_type, target_id, preparation, severity').eq('profile_id', profileId);
  if (error) throw error;
  const remove = current.filter((r) => !HARD.includes(r.severity as string) && !keep.has(`${r.target_type}:${r.target_id}:${r.preparation}`)).map((r) => r.id as string);
  if (remove.length) {
    const del = await ctx.supabase.from('profile_rules').delete().in('id', remove);
    if (del.error) throw del.error;
  }
  return { saved: rows.length, skipped_hard: rules.length - rows.length };
}

/** Afvinken met optimistische versiecontrole: een gelijktijdige wijziging geeft 409, geen stille overschrijving. */
export async function setShoppingItemState(ctx: ActionCtx, itemId: string, state: 'open' | 'checked' | 'removed', version: number) {
  const res = await ctx.supabase.from('shopping_items')
    .update({ state, version: version + 1, updated_by: ctx.userId })
    .eq('id', itemId).eq('household_id', ctx.householdId).eq('version', version).select('*').maybeSingle();
  if (res.error) throw res.error;
  if (res.data) return res.data;
  const cur = await ctx.supabase.from('shopping_items').select('*').eq('id', itemId).eq('household_id', ctx.householdId).maybeSingle();
  if (!cur.data) throw new ApiError('not_found');
  if (cur.data.state === state) return cur.data; // zelfde eindtoestand = idempotent
  throw new ApiError('revision_conflict', undefined, { current: cur.data });
}

/** Handmatig item; blijft staan bij elke automatische herberekening (§8.3). */
export async function addManualItem(ctx: ActionCtx, listId: string, description: string, qty?: number, unit?: string) {
  const list = await ctx.supabase.from('shopping_lists').select('id').eq('id', listId).eq('household_id', ctx.householdId).maybeSingle();
  if (!list.data) throw new ApiError('not_found');
  const ins = await ctx.supabase.from('shopping_items').insert({
    household_id: ctx.householdId, list_id: listId, description, qty: qty ?? null, unit: unit ?? null, origin: 'manual', category: 'overig', updated_by: ctx.userId,
  }).select('*').single();
  if (ins.error) throw ins.error;
  return ins.data;
}

/** Bewaardatum altijd volgens de conservatieve termijn (R-07). */
export async function addLeftover(ctx: CoreCtx, input: { label: string; portions: number; storage: Leftover['storage']; source_slot_id?: string | null }) {
  const storedAt = new Date();
  const res = await ctx.supabase.from('leftovers').insert({
    household_id: ctx.householdId, source_slot_id: input.source_slot_id ?? null, label: input.label, portions: input.portions,
    storage: input.storage, stored_at: storedAt.toISOString(), use_by: leftoverUseBy(storedAt, input.storage).toISOString(),
  }).select('*').single();
  if (res.error) throw res.error;
  return res.data;
}

/** Voorraad (R-06): 'confirmed' zet verified_at; 'unknown' telt nooit als aanwezig. */
export async function upsertPantry(ctx: CoreCtx, input: { ingredient_id: string; quantity: number | null; unit: Unit | null; status: 'confirmed' | 'unknown'; location?: string; expires_at?: string | null }) {
  const res = await ctx.supabase.from('pantry_items').upsert({
    household_id: ctx.householdId, ingredient_id: input.ingredient_id, quantity: input.quantity, unit: input.unit, status: input.status,
    location: input.location ?? 'kast', expires_at: input.expires_at ?? null, verified_at: input.status === 'confirmed' ? new Date().toISOString() : null,
  }, { onConflict: 'household_id,ingredient_id' }).select('*').single();
  if (res.error) throw res.error;
  return res.data;
}

export async function rpc<T>(ctx: CoreCtx, fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await ctx.supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
}
