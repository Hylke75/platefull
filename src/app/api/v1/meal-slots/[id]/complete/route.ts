import { completeSlot } from '@/core/actions';
import { actionCtx, requireHousehold } from '@/server/context';
import { expectedRevision, handler, idempotencyKey, ok, parseJson, uuid } from '@/server/http';
import { completeSchema } from '@/server/schemas';

/** 'Gekookt' (S-11): slot afronden, optioneel restjes en feedback. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  const body = await parseJson(req, completeSchema);
  return ok(await completeSlot(actionCtx(ctx), uuid.parse((await params).id), expectedRevision(req), idempotencyKey(req)!, body));
});
