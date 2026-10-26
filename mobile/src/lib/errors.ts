// Vertaalt fouten uit de gedeelde core en de databasefuncties (PTxxx) naar begrijpelijke Nederlandse meldingen.
import { ApiError } from '@shared/core/errors';

export interface UiError { code: string; message: string; details?: Record<string, unknown> }

export function toUiError(err: unknown): UiError {
  if (err instanceof ApiError) return { code: err.code, message: messageFor(err.code, err.message), details: err.details };
  const e = err as { code?: string; message?: string } | null;
  const code = e?.code ?? '';
  const msg = e?.message ?? '';
  if (code === 'PT409' || msg.startsWith('undo_') || msg.includes('revision_conflict')) {
    if (msg === 'undo_expired') return { code: 'revision_conflict', message: 'Ongedaan maken kan alleen binnen 10 minuten.' };
    if (msg.startsWith('undo_')) return { code: 'revision_conflict', message: 'Ongedaan maken is niet meer mogelijk.' };
    return { code: 'revision_conflict', message: messageFor('revision_conflict') };
  }
  if (code === 'PT422') return { code: 'unsafe_or_unavailable', message: messageFor('unsafe_or_unavailable') };
  if (code === 'PT403' && msg === 'consent_required') return { code: 'consent_required', message: messageFor('consent_required') };
  if (code === 'PT403' || code === '42501') return { code: 'forbidden', message: messageFor('forbidden') };
  if (code === 'PT404') return { code: 'not_found', message: messageFor('not_found') };
  if (code === 'PT400' || code === '23514') return { code: 'invalid_input', message: messageFor('invalid_input') };
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) return { code: 'offline', message: 'Geen verbinding. Probeer het zo opnieuw.' };
  return { code: 'internal', message: messageFor('internal') };
}

function messageFor(code: string, own?: string): string {
  if (own && own !== code) return own;
  switch (code) {
    case 'invalid_input': return 'De invoer klopt niet.';
    case 'forbidden': return 'Hier heb je geen toegang toe.';
    case 'consent_required': return 'Hiervoor is eerst toestemming voor gezondheidsgegevens nodig.';
    case 'not_found': return 'Niet gevonden.';
    case 'revision_conflict': return 'Iemand anders heeft dit net aangepast. We tonen de nieuwste versie.';
    case 'unsafe_or_unavailable': return 'Dit gerecht past niet bij een harde beperking of is niet beschikbaar.';
    default: return 'Er ging iets mis.';
  }
}

export function idemKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
