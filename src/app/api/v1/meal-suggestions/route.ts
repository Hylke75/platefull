import { requireHousehold } from '@/server/context';
import { handler, idempotencyKey, ok, parseJson } from '@/server/http';
import { proposeSlot, suggestForSlot } from '@/server/planning';
import { suggestionSchema } from '@/server/schemas';

/** Veilige suggestie(s) berekenen. Met persist=true wordt het hoofdvoorstel als voorstelversie bewaard (niet geaccepteerd). */
export const POST = handler(async (req: Request) => {
  const ctx = await requireHousehold();
  const body = await parseJson(req, suggestionSchema);
  if (body.persist) {
    const res = await proposeSlot(ctx, body.slot_id, 'propose', idempotencyKey(req, false));
    return ok(res.view);
  }
  const { view } = await suggestForSlot(ctx, body.slot_id);
  return ok(view);
});
