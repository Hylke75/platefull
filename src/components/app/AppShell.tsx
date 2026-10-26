'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const NAV = [
  { href: '/app/vandaag', icon: '⌂', label: 'Vandaag', match: ['/app/vandaag', '/app/plan-b', '/app/koken', '/app/gerecht', '/app/waarom'] },
  { href: '/app/week', icon: '▦', label: 'Week', match: ['/app/week'] },
  { href: '/app/gezin', icon: '♡', label: 'Gezin', match: ['/app/gezin'] },
  { href: '/app/boodschappen', icon: '☷', label: 'Lijst', match: ['/app/boodschappen', '/app/voorraad', '/app/restjes'] },
];

interface ToastState { id: number; message: string; action?: { label: string; run: () => void } }
const ToastContext = createContext<(message: string, action?: ToastState['action']) => void>(() => {});
export const useToast = () => useContext(ToastContext);

/** Dezelfde schil als het telefoonframe uit het designsystem: interne scroll en vaste bottom-navigatie. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [toast, setToast] = useState<ToastState | null>(null);
  const show = useCallback((message: string, action?: ToastState['action']) => setToast((t) => ({ id: (t?.id ?? 0) + 1, message, action })), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((t) => (t?.id === toast.id ? null : t)), toast.action ? 8000 : 3000);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <ToastContext.Provider value={show}>
      <div className="app-shell">
        <main className="screen-scroll" id="screen" aria-live="polite">{children}</main>
        <nav className="phone-nav" aria-label="App-navigatie">
          {NAV.map((n) => {
            const active = n.match.some((m) => pathname.startsWith(m));
            return (
              <Link key={n.href} href={n.href} className={`nav-button${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
                <span className="nav-icon" aria-hidden="true">{n.icon}</span><span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        {toast ? (
          <div className="toast" role="status" key={toast.id}>
            {toast.message}
            {toast.action ? <button type="button" onClick={() => { toast.action!.run(); setToast(null); }}>{toast.action.label}</button> : null}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
