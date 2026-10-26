import { requireHousehold } from '@/server/context';
import { expectedRevision, handler, idempotencyKey, ok, uuid } from '@/server/http';
import { undoSlot } from '@/server/planning';

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  return ok(await undoSlot(ctx, uuid.parse((await params).id), expectedRevision(req), idempotencyKey(req)!));
});
