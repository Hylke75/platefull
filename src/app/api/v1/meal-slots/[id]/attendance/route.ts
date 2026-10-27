import { setAttendance } from '@/core/actions';
import { requireHousehold } from '@/server/context';
import { expectedRevision, handler, idempotencyKey, ok, parseJson, uuid } from '@/server/http';
import { attendanceSchema } from '@/server/schemas';

/** 'Wie eet er mee?' per slot (R-03). */
export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  const body = await parseJson(req, attendanceSchema);
  return ok(await setAttendance(ctx, uuid.parse((await params).id), expectedRevision(req), idempotencyKey(req)!, body.attendees));
});
