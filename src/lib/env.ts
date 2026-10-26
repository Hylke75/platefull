// Omgevingsvariabelen. Geen geheimen in de client: alleen NEXT_PUBLIC_* is publiek (§11.1).
export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || undefined;
}

export function supabasePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl() && supabasePublishableKey());
}

/** Alleen server-side: AI is optioneel; zonder sleutel draait de deterministische engine. */
export function openAiConfig(): { apiKey: string; model: string; timeoutMs: number } | null {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) return null;
  return { apiKey, model, timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS ?? 12000) };
}

export { CONSENT_VERSIONS } from '@/core/constants';
