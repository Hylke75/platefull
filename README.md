# Plateful

Mobiele gezins-PWA voor het avondeten: **Iedereen anders. Samen aan tafel.**
Gebouwd volgens `design-source/FUNCTIONEEL-ONTWERP-PLATEFUL-v1.md` en het visuele design system v2.0 (`design-source/`).

> Status: werkende pilotbasis (gates 0–5 grotendeels, zie [`docs/STATUS.md`](docs/STATUS.md)). **Geen afgeronde productieapp**: juridische/privacytoets, redactionele controle van de allergeneninformatie, security review en hosting ontbreken nog. Plateful is geen medisch hulpmiddel.

## Snel starten

```bash
npm install                 # .npmrc zet legacy-peer-deps aan
npm run dev                 # http://localhost:3000
```

- `/` — de landingspagina met de klikbare ontwerpdemo (1:1 het design, werkt zonder database).
- `/login`, `/onboarding`, `/app/*` — de echte app; vereist Supabase.

### Met een lokale Supabase (aanbevolen)

Vereist Docker en de [Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
supabase start -x studio,imgproxy,storage-api,edge-runtime,logflare,vector,supavisor,postgres-meta
cp .env.example .env.local   # vul NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in uit `supabase status`
npm run build && npm start
```

Inlogmails (link + 6-cijferige code) komen binnen in Mailpit: http://127.0.0.1:54324.
`supabase start` past de migraties in `supabase/migrations` toe en seedt de catalogus (`supabase/seed.sql`).

## Tests

| Commando | Wat |
| --- | --- |
| `npm run typecheck` | TypeScript strict |
| `npm run test:unit` | Domeinregels: harde/zachte regels, engine, Plan B, boodschappen, statemachines, restjes, AI-validator, datums |
| `scripts/pg-test.sh start` + `npm run test:db` | RLS/tenant-isolatie, harde regels via functie, versieconflicten, idempotentie, undo, verwijderen; **TS↔SQL-consistentie** van de veiligheidscontrole |
| `npm run test:visual` | Gate 0: pixelvergelijking met `design-source/dist` op 1440/1024/768/390 px en 12 telefoontoestanden (start eerst `python3 -m http.server 8081 -d design-source/dist`) |
| `npm run test:e2e` | Acceptatiecriteria van de klikbare demo |
| `npm run test:e2e-app` | Volledige appflow tegen lokale Supabase: OTP-login, onboarding, voorstel, accepteren, boodschappen, Plan B + undo, twee ouders (409), tenant-isolatie, allergie na acceptatie, kookstand, export, verwijderen |

Na `npm run seed:sql` wordt `supabase/seed.sql` opnieuw gegenereerd uit `src/domain/catalog/*`.

## Architectuur

```
src/domain/        Pure, deterministische domeinlogica (geen I/O) — de bron van waarheid
  safety.ts          Harde regels (R-01): onbekend = niet veilig, ook optionele/aparte componenten
  preferences.ts     Zachte voorkeuren, aanpassingen (R-02), ouderlijke regie (F-006)
  engine.ts          §7.2: hard filter → haalbaarheid → varianten → ranking (§7.3-gewichten) → redenen
  planb.ts           Plan B als diff (S-05)
  shopping.ts        Behoefte + idempotente lijstreconciliatie (§8.3)
  slot-state.ts      Statemachines (§8.1/8.2), undo-regels
  catalog/           30 gestructureerde recepten, ingrediënten met allergenen en dieetvlaggen
src/server/        Autorisatie, Supabase-repository, planningsservice, AI-laag + validator
src/app/api/v1/    REST-API volgens §10 (Idempotency-Key, If-Match, foutcodes)
src/app/app/       Schermen S-03…S-14
supabase/          Schema, RLS, transactionele functies (commit_slot_change, undo, add_hard_rule …)
design-source/     Aangeleverde ontwerpbestanden (alleen-lezen referentie)
```

Belangrijkste veiligheidsprincipes:

1. Harde regels worden **twee keer** gecontroleerd: in TypeScript (engine + postvalidatie) én in de database (`private.hard_violations` in `commit_slot_change`). Een directe API-aanroep kan ze dus niet passeren. Een test bewaakt dat beide implementaties exact gelijk oordelen.
2. Harde regels kunnen alleen via `add_hard_rule` met actieve toestemming worden vastgelegd; RLS weigert ze via de gewone tabel-API.
3. De AI (optioneel, `OPENAI_API_KEY` + `OPENAI_MODEL`) kiest alleen tussen al gevalideerde recept-ids, krijgt geen namen of gezondheidsgegevens, en wordt door een Zod-validator gecontroleerd. Zonder AI werkt alles deterministisch.
4. Samengestelde producten (wraps, pasta, kaas …) hebben onvolledige allergeneninformatie en zijn bij een allergie pas bruikbaar na een **etiketcontrole** door het gezin (Instellingen).

## Configuratie

Zie `.env.example`. De service-role key wordt alleen server-side gebruikt (verwijderen van het auth-account) en is optioneel.
