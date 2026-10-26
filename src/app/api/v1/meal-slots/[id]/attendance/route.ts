import { countEaters } from '@/domain/engine';
import { requireHousehold } from '@/server/context';
import { ApiError, expectedRevision, handler, idempotencyKey, ok, parseJson, uuid } from '@/server/http';
import { commit, recomputeShopping } from '@/server/planning';
import { loadProfiles, loadSlot } from '@/server/repo';
import { attendanceSchema } from '@/server/schemas';

/** 'Wie eet er mee?' per slot (R-03). Onbekend blijft onbekend; gasten zonder bekende allergieën blijven zo gemarkeerd. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  const slotId = uuid.parse((await params).id);
  const body = await parseJson(req, attendanceSchema);
  const { slot } = await loadSlot(ctx.supabase, ctx.householdId, slotId);
  const profiles = new Set((await loadProfiles(ctx.supabase, ctx.householdId)).map((p) => p.id));
  if (body.attendees.some((a) => a.profile_id && !profiles.has(a.profile_id))) throw new ApiError('not_found');
  if (body.attendees.some((a) => !a.profile_id && !a.guest_label)) throw new ApiError('invalid_input', 'Geef een gast een naam.');
  const attendees = body.attendees.map((a) => ({ profileId: a.profile_id, guestLabel: a.guest_label, guestAllergiesKnown: a.guest_allergies_known ?? false, attendance: a.attendance }));
  const shopping = ['accepted', 'changed', 'cooking'].includes(slot.state) ? await recomputeShopping(ctx, slot.plan_id, { slotId, state: slot.state, attendees }) : null;
  const res = await commit(ctx, {
    slotId, expectedRevision: expectedRevision(req), idempotencyKey: idempotencyKey(req)!, event: 'attendance', newState: slot.state,
    attendees, servings: Math.max(1, countEaters(attendees)), shopping,
  });
  return ok(res);
});
