// Stap 1 van §7.2: de server autoriseert gebruiker en gezin. Rollen worden ook hier gecontroleerd,
// bovenop RLS (§11.2: 'serverrollen controleren eigenaar vs mede-ouder').
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ApiError } from './http';

export interface RequestContext {
  supabase: SupabaseClient;
  user: User;
  householdId: string | null;
  role: 'owner' | 'co_parent' | null;
}

export async function getContext(): Promise<RequestContext> {
  if (!isSupabaseConfigured()) throw new ApiError('not_configured');
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ApiError('unauthenticated');
  const { data: acc } = await supabase
    .from('household_accounts')
    .select('household_id, role')
    .eq('auth_user_id', data.user.id)
    .eq('status', 'active')
    .maybeSingle();
  return { supabase, user: data.user, householdId: acc?.household_id ?? null, role: (acc?.role as RequestContext['role']) ?? null };
}

export async function requireHousehold(): Promise<RequestContext & { householdId: string; role: 'owner' | 'co_parent' }> {
  const ctx = await getContext();
  if (!ctx.householdId || !ctx.role) throw new ApiError('forbidden', 'Nog geen gezin aangemaakt.');
  return ctx as RequestContext & { householdId: string; role: 'owner' | 'co_parent' };
}

/** Een id in de URL moet bij het eigen gezin horen (R-10), ook al dwingt RLS dat al af. */
export function assertSameHousehold(ctx: { householdId: string }, householdId: string | null | undefined): void {
  if (!householdId || householdId !== ctx.householdId) throw new ApiError('not_found');
}

export function requireOwner(ctx: { role: string }): void {
  if (ctx.role !== 'owner') throw new ApiError('forbidden', 'Alleen de eigenaar kan dit.');
}

/** Context voor de gedeelde core-acties (src/core/actions.ts). */
export function actionCtx(ctx: RequestContext & { householdId: string }) {
  return { supabase: ctx.supabase, householdId: ctx.householdId, userId: ctx.user.id };
}
