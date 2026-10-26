import { requireHousehold } from '@/server/context';
import { handler, ok, parseJson, uuid } from '@/server/http';
import { planBPreview } from '@/server/planning';
import { planBSchema } from '@/server/schemas';

/** Diff berekenen zonder side-effects (S-05). Vrije tekst is alleen context. */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  const body = await parseJson(req, planBSchema);
  return ok(await planBPreview(ctx, uuid.parse((await params).id), body.scenario, body.free_text));
});
