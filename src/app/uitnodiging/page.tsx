import { redirect } from 'next/navigation';
import { getContext } from '@/server/context';
import { InviteClient } from './InviteClient';

export const dynamic = 'force-dynamic';

export default async function UitnodigingPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ctx = await getContext().catch(() => null);
  if (!ctx) redirect(`/login?next=${encodeURIComponent(`/uitnodiging?token=${token ?? ''}`)}`);
  return <div className="app-body"><div className="app-shell"><main className="screen-scroll"><InviteClient token={token ?? ''} alreadyMember={!!ctx.householdId} /></main></div></div>;
}
