# Voorgestelde afwijkingen en aannames — ter goedkeuring

Het functioneel ontwerp (§17) vraagt om afwijkingen expliciet te documenteren. Onderstaande keuzes zijn gemaakt om verder te kunnen; ze zijn eenvoudig terug te draaien.

## Visueel (design v2.0)

1. **Clip-laag voor de ambient-cirkels op de landingspagina.** In het origineel is `.ambient-one` 440 px breed; op een 390 px-telefoon verbreedt dat de layout-viewport tot 441 px (pagina iets uitgezoomd, horizontale overflow). De cirkels staan nu in een `overflow:hidden`-laag. Pixelvergelijking: identiek; geen overflow meer. De originele CSS is ongewijzigd.
2. **Landingspagina ongewijzigd, ook zonder login-knop.** S-00 noemt 'aanmaken/inloggen', maar de masterprompt verbiedt wijzigingen aan het ontwerp. De app is bereikbaar via `/login`. *Voorstel:* een kleine 'Inloggen'-link in de topbar naast 'Designsystem' — graag akkoord.
3. **Nieuwe elementen voor de echte app** (`src/styles/app-shell.css`): app-schil (telefoonframe zonder rand, 100dvh), formuliervelden, keuzechips, blok 'Harde beperkingen', diff-lijst, skeleton, beeldloze gerechtkaart (sage + ✳) voor recepten zonder foto. Alleen bestaande tokens en componentstijlen gebruikt.
4. **'Nog even controleren'-badge** gebruikt de bestaande gele `care`-kleuren.

## Functioneel

5. **Etiketcontrole per gezin** (`household_ingredient_checks`). Uitwerking van R-01 'totdat betrouwbare ingrediëntinformatie is vastgelegd en door de gebruiker gecontroleerd'. Geldig 180 dagen; kan nooit een bekend allergeen weghalen.
6. **Status 'allergieën nog onbekend' per profiel** (`restrictions_status`). 'Nog niet bekend' blokkeert het label 'Past bij jullie gezin' (O-05: nooit 'geen allergie' veronderstellen). Een volwassene kan expliciet 'geen bekende' kiezen (vereist ook toestemming).
7. **Intrekken van toestemming wist harde regels direct** en zet `safety_claims_blocked`. Opnieuw toestemming geven heft de blokkade op, maar de regels moeten opnieuw worden ingevoerd.
8. **Dieetvlaggen per kenmerk driewaardig** (bevat / bevat niet / onbekend). Kaas = vlees 'onbekend' (mogelijk dierlijk stremsel) → niet geschikt voor strikt vegetarisch zonder etiketcontrole.
9. **Termijnen** (producthypothesen): voorraadverificatie 7 dagen; restjes in de vriezer 90 dagen; etiketcontrole 180 dagen; koelkast 2 dagen (Voedingscentrum).
10. **Eén actief huishouden per account** (v1). Uitnodigen alleen door de eigenaar, link 7 dagen geldig en gebonden aan e-mail-hash.
11. **Aanwezigheid standaard 'ja'** voor actieve profielen bij aanmaken van een weekplan; onbekend blijft mogelijk per dag.
12. **API-uitbreidingen** naast §10: `GET /week-plans?week_start=`, `POST /meal-slots/:id/attendance`, `DELETE /hard-rules/:id`, `POST /ingredient-checks`, `POST /invitations`, `DELETE /shopping-items/:id` (alleen handmatig), `PATCH/DELETE /pantry/:id`.
13. **Accepteren van een niet-voorgesteld gerecht** zet het slot eerst op 'proposed' (aparte revisie) en daarna 'accepted', omdat §8.1 draft → accepted niet toestaat.
14. **AI-provider:** volgens §12 OpenAI (Responses API, Structured Outputs), model via `OPENAI_MODEL`. Profielnamen worden geredigeerd vóór verzending.

## Native app

15. **Bundle-id/package `nl.linkandlead.platefull`** — aanname op basis van owner `link-and-lead`; pas aan vóór de eerste store-build, daarna is hij vast.
16. **Fraunces als statische fonts.** De web gebruikt Fraunces als variabel font met `SOFT 30`/`WONK 1`; `@expo-google-fonts/fraunces` levert de standaardinstantie. Letters zijn daardoor iets strakker dan op het web. Oplossing: een eigen gegenereerde Fraunces-instantie met dezelfde assen meeleveren.
17. **Iconen in de app** (navigatie, ✳ ◷ ◉ ♡) zijn dezelfde typografische tekens als in het ontwerp, met tekstweergave geforceerd (geen emoji).
18. **Inloggen in de app alleen met de 6-cijferige code** (geen magic link-deeplink); uitnodigen via het deelmenu met een `platefull://`-link of te plakken code.
19. **Export in de app** via het deelmenu (JSON-tekst); bestand-export via de webapp.
20. **Account definitief verwijderen** (auth-gebruiker) kan niet vanuit de app zonder service-rol; zie STATUS.

## Nog door de opdrachtgever te beslissen

- Redactionele controle van `src/domain/catalog/ingredients.ts` (allergenen, dieetvlaggen) door een deskundige.
- Foto's voor de overige 27 recepten (bron en rechten).
- Privacyverklaring staat op https://hylke75.github.io/platefull/privacy/ (bron: `legal/`). Nog te controleren door de opdrachtgever/jurist: verwerkingsverantwoordelijke (Link & Lead, KvK/adres), het bestaan van privacy@ en support@linkandlead.nl, verwerkersovereenkomsten met Supabase, Resend en Vercel, en het handmatig wissen van auth-accounts binnen 30 dagen. Algemene voorwaarden ontbreken nog.
- Hosting van de webapp (Vercel). Het Supabase-project staat in `eu-west-2` (Londen, VK, buiten de EU maar met adequaatheidsbesluit); de opdrachtgever heeft daarmee ingestemd. Meenemen in de DPIA.
