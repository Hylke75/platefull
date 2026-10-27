// Framework-vrije fouttypes, gedeeld door de webserver en de mobiele app.
export type ApiErrorCode =
  | 'invalid_input' | 'unauthenticated' | 'forbidden' | 'not_found' | 'revision_conflict'
  | 'unsafe_or_unavailable' | 'rate_limited' | 'provider_unavailable' | 'consent_required' | 'not_configured' | 'internal';

export class ApiError extends Error {
  constructor(readonly code: ApiErrorCode, message?: string, readonly details?: Record<string, unknown>) {
    super(message ?? code);
  }
}
