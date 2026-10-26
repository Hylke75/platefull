'use client';
// Kleine fetch-wrapper voor /api/v1 met Idempotency-Key en If-Match (§10).

export class ClientApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details?: Record<string, unknown>) {
    super(message);
  }
}

export function newIdempotencyKey(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; revision?: number; idempotent?: boolean | string } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.revision !== undefined) headers['If-Match'] = String(opts.revision);
  if (opts.idempotent) headers['Idempotency-Key'] = typeof opts.idempotent === 'string' ? opts.idempotent : newIdempotencyKey();
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, { method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'), headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined, cache: 'no-store' });
  } catch {
    throw new ClientApiError(0, 'offline', 'Geen verbinding. Probeer het zo opnieuw.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (json as { error?: { code: string; message: string; details?: Record<string, unknown> } }).error;
    throw new ClientApiError(res.status, e?.code ?? 'internal', e?.message ?? 'Er ging iets mis.', e?.details);
  }
  return json as T;
}
