// Sessie en huishouden. Dezelfde regels als de webserver: alleen volwassen accounts loggen in,
// het huishouden komt uit een actief lidmaatschap (household_accounts), nooit uit invoer van de client.
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ActionCtx } from '@shared/core/actions';
import { supabase } from './supabase';

interface SessionState {
  ready: boolean;
  session: Session | null;
  householdId: string | null;
  role: 'owner' | 'co_parent' | null;
  /** Onboarding afgerond (households.onboarding_step = 'done'). */
  onboarded: boolean;
  refreshHousehold: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [household, setHousehold] = useState<{ id: string | null; role: SessionState['role']; onboarded: boolean }>({ id: null, role: null, onboarded: false });
  const [ready, setReady] = useState(false);

  const loadHousehold = useCallback(async (s: Session | null) => {
    if (!s) { setHousehold({ id: null, role: null, onboarded: false }); return; }
    const { data } = await supabase.from('household_accounts').select('household_id, role, households(onboarding_step)').eq('auth_user_id', s.user.id).eq('status', 'active').maybeSingle();
    const step = (data?.households as unknown as { onboarding_step?: string } | null)?.onboarding_step;
    setHousehold({ id: (data?.household_id as string | undefined) ?? null, role: (data?.role as SessionState['role']) ?? null, onboarded: step === 'done' });
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadHousehold(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      void loadHousehold(s);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [loadHousehold]);

  const value = useMemo<SessionState>(() => ({
    ready, session, householdId: household.id, role: household.role, onboarded: household.onboarded,
    refreshHousehold: () => loadHousehold(session),
    signOut: async () => { await supabase.auth.signOut(); },
  }), [ready, session, household, loadHousehold]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession buiten SessionProvider');
  return v;
}

/** Context voor de gedeelde core-acties. Alleen bruikbaar binnen de ingelogde app met een huishouden. */
export function useCore(): ActionCtx {
  const { session, householdId } = useSession();
  const userId = session?.user.id ?? null;
  const ctx = useMemo(() => (userId && householdId ? { supabase, householdId, userId } : null), [householdId, userId]);
  if (!ctx) throw new Error('Geen actief huishouden');
  return ctx;
}
