import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { supabasePublishableKey, supabaseUrl } from '@/lib/env';

/** Supabase-client met de sessie van de gebruiker: alle queries vallen onder RLS. */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const url = supabaseUrl();
  const key = supabasePublishableKey();
  if (!url || !key) throw new Error('Supabase is niet geconfigureerd');
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Aangeroepen vanuit een Server Component: de proxy ververst de sessie al.
        }
      },
    },
  });
}
