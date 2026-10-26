import { requireHousehold } from '@/server/context';
import { handler, ok, uuid } from '@/server/http';

export const DELETE = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  const { error } = await ctx.supabase.rpc('remove_hard_rule', { p_rule_id: uuid.parse((await params).id) });
  if (error) throw error;
  return ok({ removed: true });
});
