import { swapSlot } from '@/core/actions';
import { requireHousehold } from '@/server/context';
import { expectedRevision, handler, idempotencyKey, ok, uuid } from '@/server/http';
import { chooseWithAi } from '@/server/ai';

/** 'Ander idee': volgend, al gevalideerd alternatief als voorstel — nooit ongevraagd geaccepteerd. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  return ok(await swapSlot(ctx, uuid.parse((await params).id), expectedRevision(req), idempotencyKey(req, false), chooseWithAi));
});
