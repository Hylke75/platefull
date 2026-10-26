import { requireHousehold } from '@/server/context';
import { expectedRevision, handler, idempotencyKey, ok, parseJson, uuid } from '@/server/http';
import { acceptSlot } from '@/server/planning';
import { acceptSchema } from '@/server/schemas';

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  const body = await parseJson(req, acceptSchema);
  const res = await acceptSlot(ctx, uuid.parse((await params).id), expectedRevision(req), idempotencyKey(req)!, body);
  return ok(res);
});
