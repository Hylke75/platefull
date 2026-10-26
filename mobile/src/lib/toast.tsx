import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Toast } from '@/components/ui';

interface ToastState { id: number; message: string; action?: { label: string; run: () => void } }
const ToastCtx = createContext<(message: string, action?: ToastState['action']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/** Statusmelding zoals in het ontwerp: ~3 seconden, met actie (bijv. 'Maak ongedaan') iets langer. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const show = useCallback((message: string, action?: ToastState['action']) => setToast((t) => ({ id: (t?.id ?? 0) + 1, message, action })), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast((t) => (t?.id === toast.id ? null : t)), toast.action ? 8000 : 3000);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast ? <Toast key={toast.id} message={toast.message} action={toast.action ? { label: toast.action.label, run: () => { toast.action!.run(); setToast(null); } } : undefined} /> : null}
    </ToastCtx.Provider>
  );
}
