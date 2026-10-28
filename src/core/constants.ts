/** Versies van de toestemmingsteksten (§2.1); gedeeld door web en app zodat consent-events gelijk zijn. */
export const CONSENT_VERSIONS = {
  terms: 'voorwaarden-privacy-2026-10',
  health: 'gezondheidsgegevens-2026-10',
} as const;

/** Openbare pagina's (GitHub Pages, bron in legal/); ook ingevuld in App Store Connect. */
export const LEGAL_URLS = {
  privacy: 'https://hylke75.github.io/platefull/privacy/',
  support: 'https://hylke75.github.io/platefull/support/',
} as const;
