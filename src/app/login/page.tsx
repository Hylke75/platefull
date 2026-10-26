import type { Metadata } from 'next';
import { isSupabaseConfigured } from '@/lib/env';
import { LoginClient } from './LoginClient';

export const metadata: Metadata = { title: 'Inloggen — Plateful' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/app/vandaag';
  return (
    <div className="app-body">
      <div className="app-shell"><main className="screen-scroll"><LoginClient configured={isSupabaseConfigured()} next={next} initialError={sp.error ?? null} /></main></div>
    </div>
  );
}
