import { requireHousehold } from '@/server/context';
import { ApiError, handler, ok, uuid } from '@/server/http';

export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireHousehold();
  const id = uuid.parse((await params).id);
  const list = await ctx.supabase.from('shopping_lists').select('id, plan_id, revision').eq('id', id).eq('household_id', ctx.householdId).maybeSingle();
  if (list.error) throw list.error;
  if (!list.data) throw new ApiError('not_found');
  const items = await ctx.supabase.from('shopping_items').select('*').eq('list_id', id).order('category').order('description');
  if (items.error) throw items.error;
  return ok({ list: list.data, items: items.data });
});
