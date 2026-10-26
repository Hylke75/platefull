# Implementatie- en teststatus

Stand: 26 oktober 2026. Per functie (§3) en per gate (§14). "Getest" betekent: geautomatiseerde test aanwezig en groen.
E2E = `scripts/e2e-app.mjs` tegen een lokale Supabase-stack (Postgres 17, GoTrue, PostgREST, Realtime, Mailpit).

## Functies

| ID | Functie | Prio | Status | Getest | Opmerking |
| --- | --- | --- | --- | --- | --- |
| F-001 | Registreren/inloggen | P0 | ✅ | E2E | Magic link + 6-cijferige code, sessie via `@supabase/ssr`, uitloggen. NL-mailtemplate in `supabase/templates/`. |
| F-002 | Gezin aanmaken | P0 | ✅ | DB, E2E | `create_household` (eigenaar + voorwaarden-consent atomair). |
| F-003 | Profielen beheren | P0 | ✅ | DB, E2E | Toevoegen, wijzigen, archiveren (soft delete). Kind-account bewust niet (§15). |
| F-004 | Smaakprofielen | P0 | ✅ | Unit, E2E | 21 smaakkaarten; rauwe tomaat ≠ tomatensaus; gedeeld-toestelmodus voor kinderen. |
| F-005 | Harde uitsluitingen | P0 | ✅ | Unit, DB, E2E | Alleen via functie met toestemming; nooit via ouderlijke regie te wijzigen; intrekken wist ze. |
| F-006 | Ouderlijke menu-regie | P0 | ✅ | Unit | Sterke afkeer zonder aanpassing → bewuste 'Toch kiezen'; profiel blijft ongewijzigd. Regie uit → veto in suggesties. |
| F-007 | Maaltijdvoorstel vandaag | P0 | ✅ | Unit, E2E | 1 hoofdvoorstel + max. 2 alternatieven, max. 3 redenen, 'Waarom deze?' (S-14). |
| F-008 | Bevestigen/wisselen | P0 | ✅ | DB, E2E | Revisies, history (`slot_revisions`), undo, idempotentie. |
| F-009 | Weekplan | P0 | ✅ | DB, E2E | 7 dagen, eters, handmatig plannen binnen de catalogus. Slepen/schuiven tussen dagen nog niet. |
| F-010 | Plan B | P0 | ✅ | Unit, DB, E2E | 4 presets, diff-preview zonder side-effects, atomair toepassen, undo ≤ 10 min. |
| F-011 | Boodschappenlijst | P0 | ✅ | Unit, DB, E2E | Automatisch per geaccepteerd plan, handmatige items, 'niet meer nodig' + herstel, versiecontrole bij afvinken, realtime-abonnement. Realtime-update tussen twee browsers niet apart E2E-getest. |
| F-012 | Kookmodus | P0 | ✅ | E2E | Stappen, timers, geschaalde ingrediënten (1–12), afronden met restjes/feedback. |
| F-013 | Receptcatalogus | P0 | ⚠️ | Unit | 30 recepten, 87 ingrediënten, allergenen + dieetvlaggen + varianten. **Redactionele menselijke controle van allergenen/dieet vereist vóór pilot.** Slechts 3 recepten hebben een foto. |
| F-014 | Handmatige voorraad | P1 | ✅ | Unit | Onbekend ≠ in huis; verificatie > 7 dagen → 'even controleren'. |
| F-015 | Restjes | P1 | ✅ | Unit, E2E | Koelkast max. 2 dagen, nooit automatisch 'veilig'. |
| F-016 | Budgetbewaking | P1 | ⚠️ | Unit | Engine ondersteunt prijzen met bron+datum; catalogus heeft bewust geen prijzen → altijd 'onbekend'. |
| F-017 | Gezinsfeedback | P1 | ✅ | — | Bij afronden; kleine rankingcorrectie, nooit uitsluiting. |
| F-018 | Tafelbalans | P1 | ✅ | Unit | 14-dagenvenster in de ranking; geen ranglijsten. |
| F-019 | Aanwezigheidsrooster | P1 | ⚠️ | DB, E2E | Per maaltijd ja/nee/onbekend; gasten via API. Terugkerende uitzonderingen en gast-UI nog niet. |
| F-020 | Push/e-mail | P1 | ❌ | — | Niet gebouwd. |
| F-021 | Eigen recepten | P1 | ⚠️ | — | Datamodel + RLS (altijd 'draft', nooit geschikt bij harde regels); nog geen UI/API. |
| F-022 | Slim alternatief uit voorraad | P1 | ✅ | Unit | Alleen gecontroleerde vervangingen met bevestigde voorraad. |
| F-023–F-027 | P2 | P2 | ❌ | — | Buiten scope fase 1. |

## Gates

| Gate | Status | Bewijs |
| --- | --- | --- |
| 0 — Reproductie | ✅ | `npm run test:visual`: ≤ 0,05 % pixelverschil (subpixel-antialiasing op foto's) op 1440/1024/768/390 px en 12 telefoontoestanden; `npm run test:e2e`: 11/11 demo-acceptatiecriteria, geen console-fouten of 404's. |
| 1 — Auth en database | ✅ | `tests/db/rls.test.ts`: tenant-isolatie lezen/schrijven/functies, uitnodiging alleen voor juiste e-mail, anon geen toegang. E2E: ander gezin krijgt 403/404 op bekende ids. |
| 2 — Domein en veiligheid | ✅ (op redactie na) | 59 unittests; `tests/db/consistency.test.ts`: TS- en SQL-veiligheidscontrole gelijk voor 30 recepten × varianten × 11 regelsets, met en zonder etiketcontrole. |
| 3 — Kernplanning | ✅ | E2E onboarding → voorstel → accepteren → week. |
| 4 — Plan B en consistentie | ✅ | DB + E2E: preview zonder mutatie, atomair toepassen, undo, 409 bij oude revisie, geen dubbele boodschappen. |
| 5 — AI-laag | ⚠️ | Gebouwd en unit-getest (validator, fallback). **Niet getest tegen de echte OpenAI-API** (geen sleutel in deze omgeving). |
| 6 — P1 | ⚠️ | Zie tabel: voorraad, restjes, feedback, tafelbalans klaar; budget, notificaties, eigen recepten niet/half. |
| 7 — Productierijp | ❌ | Nog te doen: DPIA/juridische toets, verwerkersafspraken, security review, toegankelijkheidsaudit (WCAG 2.2 AA), performancemeting, back-up/hersteltest, monitoring, hosting/deploy. |

## Bekende beperkingen

- Voor een gezin met een allergie zijn aanvankelijk weinig gerechten beschikbaar: samengestelde producten zijn pas bruikbaar na etiketcontrole. Dat volgt de conservatieve veiligheidsregel (R-01); de UI verwijst ernaar.
- Week-overzicht toont de dag-plannen; verschuiven van maaltijden tussen dagen ontbreekt.
- Offline gebruik: alleen een melding in de boodschappenlijst; geen service worker/offline-cache.
- Geen supermarktkoppeling, prijzen of bestellingen (bewust, §15).
