// Minimale context voor de gedeelde core: een Supabase-client met de sessie van de gebruiker (RLS geldt)
// en het huishouden waartoe die gebruiker behoort. De webserver en de mobiele app vullen dit elk zelf.
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CoreCtx {
  supabase: SupabaseClient;
  householdId: string;
}
