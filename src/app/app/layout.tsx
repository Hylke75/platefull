import type { Metadata } from 'next';
import { AppShell } from '@/components/app/AppShell';

export const metadata: Metadata = { title: 'Plateful' };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="app-body"><AppShell>{children}</AppShell></div>;
}
