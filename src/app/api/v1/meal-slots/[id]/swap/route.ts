import { requireHousehold } from '@/server/context';
import { ApiError, expectedRevision, handler, idempotencyKey, ok, uuid } from '@/server/http';
import { proposeSlot } from '@/server/planning';
import { loadSlot } from '@/server/repo';

/** 'Ander idee': volgend, al gevalideerd alternatief als voorstel — nooit ongevraagd geaccepteerd. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  const slotId = uuid.parse((await params).id);
  const { slot } = await loadSlot(ctx.supabase, ctx.householdId, slotId);
  if (slot.revision !== expectedRevision(req)) throw new ApiError('revision_conflict', undefined, { current_revision: slot.revision });
  // Recent getoonde voorstellen overslaan, zodat 'Ander idee' echt iets anders laat zien.
  const { data: recent } = await ctx.supabase.from('proposal_snapshots').select('suggested_recipe_id').eq('slot_id', slotId).order('created_at', { ascending: false }).limit(3);
  const exclude = [...new Set([slot.recipe_id, ...(recent ?? []).map((r) => r.suggested_recipe_id)].filter((x): x is string => !!x))];
  let res = await proposeSlot(ctx, slotId, 'swap', idempotencyKey(req, false), exclude);
  if (!res.view.suggestion && exclude.length > 1) res = await proposeSlot(ctx, slotId, 'swap', null, slot.recipe_id ? [slot.recipe_id] : []);
  return ok(res.view);
});
