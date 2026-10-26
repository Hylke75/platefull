import { requireHousehold } from '@/server/context';
import { expectedRevision, handler, idempotencyKey, ok, parseJson, uuid } from '@/server/http';
import { planBApply } from '@/server/planning';
import { planBSchema } from '@/server/schemas';

/** Atomair toepassen met versiecontrole; vorige revisie blijft bewaard voor undo. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  const body = await parseJson(req, planBSchema);
  return ok(await planBApply(ctx, uuid.parse((await params).id), expectedRevision(req), idempotencyKey(req)!, body.scenario, body.free_text));
});
