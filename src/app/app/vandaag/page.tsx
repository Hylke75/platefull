import { appContext } from '@/server/page-context';
import { dayView } from '@/server/views';
import { TodayClient } from './TodayClient';

export const dynamic = 'force-dynamic';

export default async function VandaagPage({ searchParams }: { searchParams: Promise<{ datum?: string }> }) {
  const ctx = await appContext();
  const view = await dayView(ctx, (await searchParams).datum);
  return <TodayClient view={view} />;
}
