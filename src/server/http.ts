// API-contract §10: consistente foutcodes, geen ruwe AI-prompt of gevoelige gezinsdata in foutresponses.
import { NextResponse } from 'next/server';
import { z } from 'zod';

export type ApiErrorCode =
  | 'invalid_input' | 'unauthenticated' | 'forbidden' | 'not_found' | 'revision_conflict'
  | 'unsafe_or_unavailable' | 'rate_limited' | 'provider_unavailable' | 'consent_required' | 'not_configured' | 'internal';

const STATUS: Record<ApiErrorCode, number> = {
  invalid_input: 400, unauthenticated: 401, forbidden: 403, consent_required: 403, not_found: 404,
  revision_conflict: 409, unsafe_or_unavailable: 422, rate_limited: 429, provider_unavailable: 503, not_configured: 503, internal: 500,
};

export class ApiError extends Error {
  constructor(readonly code: ApiErrorCode, message?: string, readonly details?: Record<string, unknown>) {
    super(message ?? code);
  }
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, { ...init, headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) } });
}

export function fail(err: unknown): NextResponse {
  const e = toApiError(err);
  if (e.code === 'internal') console.error('[api] interne fout', err instanceof Error ? err.name : typeof err);
  return NextResponse.json(
    { error: { code: e.code, message: publicMessage(e), ...(e.details ? { details: e.details } : {}) } },
    { status: STATUS[e.code], headers: { 'Cache-Control': 'no-store' } },
  );
}

function publicMessage(e: ApiError): string {
  switch (e.code) {
    case 'invalid_input': return e.message !== 'invalid_input' ? e.message : 'De invoer klopt niet.';
    case 'unauthenticated': return 'Log opnieuw in.';
    case 'forbidden': return 'Hier heb je geen toegang toe.';
    case 'consent_required': return 'Hiervoor is eerst toestemming voor gezondheidsgegevens nodig.';
    case 'not_found': return 'Niet gevonden.';
    case 'revision_conflict': return 'Iemand anders heeft dit net aangepast. Bekijk de nieuwste versie.';
    case 'unsafe_or_unavailable': return e.message !== 'unsafe_or_unavailable' ? e.message : 'Dit gerecht past niet bij een harde beperking of is niet beschikbaar.';
    case 'rate_limited': return 'Even rustig aan — probeer het zo opnieuw.';
    case 'provider_unavailable': return 'Een externe dienst is tijdelijk niet bereikbaar.';
    case 'not_configured': return 'De database is nog niet gekoppeld.';
    default: return 'Er ging iets mis.';
  }
}

/** Vertaalt Postgres/PostgREST-fouten uit de domeinfuncties (PTxxx) naar API-fouten. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof z.ZodError) return new ApiError('invalid_input', 'De invoer klopt niet.', { issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
  const e = err as { code?: string; message?: string; details?: string } | null;
  const code = e?.code ?? '';
  const msg = e?.message ?? '';
  if (code === 'PT409' || msg.includes('revision_conflict') || msg.startsWith('undo_')) {
    return new ApiError('revision_conflict', msg.startsWith('undo_') ? (msg === 'undo_expired' ? 'Ongedaan maken kan alleen binnen 10 minuten.' : 'Ongedaan maken is niet meer mogelijk.') : undefined, e?.details ? { current_revision: Number(e.details) } : undefined);
  }
  if (code === 'PT422') return new ApiError('unsafe_or_unavailable');
  if (code === 'PT403' && msg === 'consent_required') return new ApiError('consent_required');
  if (code === 'PT403' || code === '42501') return new ApiError('forbidden');
  if (code === 'PT404' || code === 'PGRST116') return new ApiError('not_found');
  if (code === 'PT401') return new ApiError('unauthenticated');
  if (code === 'PT400' || code === '22P02' || code === '23514') return new ApiError('invalid_input');
  return new ApiError('internal');
}

export async function parseJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try { body = await req.json(); } catch { throw new ApiError('invalid_input', 'Ongeldige JSON.'); }
  return schema.parse(body);
}

/** Idempotency-Key is verplicht voor accept/apply/complete en winkelmutaties (§10). */
export function idempotencyKey(req: Request, required = true): string | null {
  const key = req.headers.get('Idempotency-Key');
  if (!key) {
    if (required) throw new ApiError('invalid_input', 'Idempotency-Key ontbreekt.');
    return null;
  }
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(key)) throw new ApiError('invalid_input', 'Ongeldige Idempotency-Key.');
  return key;
}

/** If-Match met de verwachte revisie voor planmutaties (§10, §8.4). */
export function expectedRevision(req: Request, bodyRevision?: number): number {
  const header = req.headers.get('If-Match');
  const value = header ? Number(header.replace(/"/g, '')) : bodyRevision;
  if (value === undefined || !Number.isInteger(value) || value < 1) throw new ApiError('invalid_input', 'If-Match (revisie) ontbreekt.');
  return value;
}

export const uuid = z.string().uuid();

export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try { return await fn(...args); } catch (err) { return fail(err); }
  };
}
