import { appContext } from '@/server/page-context';
import { loadLeftovers } from '@/server/repo';
import { LeftoversClient } from './LeftoversClient';

export const dynamic = 'force-dynamic';

/** S-12 Restjes (F-015, R-07). */
export default async function RestjesPage() {
  const ctx = await appContext();
  return <LeftoversClient items={await loadLeftovers(ctx.supabase, ctx.householdId)} />;
}
