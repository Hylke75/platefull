# PLATEFUL — COMPLEET FUNCTIONEEL ONTWERP

**Versie:** functioneel 1.0 — 26 oktober 2026  
**Visuele referentie:** Plateful Design System v2.0  
**Doel:** bouwspecificatie voor Claude Code, een productiegerichte mobiele webapp/PWA met een uitbreidbare technische basis.  
**Primaire markt en taal:** Nederlandse gezinnen, Nederlands, EUR, metrische maten, tijdzone Europe/Amsterdam.

> Status: dit is een concreet productvoorstel op basis van onze eerdere keuzes en onderzoek. De expliciete keuzes onder 'Nog te beslissen' zijn defaults voor de eerste bouwfase, geen vastgestelde commerciële of juridische beleidsbesluiten. De app is geen medisch hulpmiddel of gecertificeerd allergiecontrolesysteem.

## 1. Productvisie en onderscheid

### 1.1 Het probleem

Gezinnen worstelen niet alleen met recepten, maar vooral met terugkerende beslissingen: wat eten we, wie eet mee, wat vindt ieder gezinslid lekker, hoeveel tijd hebben we, wat ligt er nog in de koelkast en wie moet er boodschappen doen? Als één variabele verandert, begint het afstemmen opnieuw.

### 1.2 Wat Plateful wél is

Een **gezinsbeslissingsassistent voor het avondeten**. De app doet iedere dag een concreet, haalbaar voorstel voor **één gedeelde maaltijd**, waarbij individuele componenten kunnen verschillen. Ieder gezinslid kan smaken vastleggen. Ouders beslissen uiteindelijk over het menu, maar een kinderafkeer wordt niet gewist, genegeerd of bestraft. Een veranderd plan leidt tot een slimme, zo klein mogelijke aanpassing.

### 1.3 Unieke productpijlers

1. **Eén tafel, eigen smaken.** De basismaaltijd is gemeenschappelijk. Variaties zijn bijvoorbeeld losse toppings, saus apart, vervangbaar garnituur of een veilige alternatieve component.
2. **Voorkeur is niet hetzelfde als gevaar.** Er is een formeel onderscheid tussen afkeer, wens, leefstijl/dieet en allergie of medische uitsluiting. Alleen zachte voorkeuren zijn voor een ouderkeuze te passeren.
3. **Plan B zonder opnieuw te beginnen.** De huidige maaltijd en boodschappen blijven zo veel mogelijk behouden.
4. **Huishoudcontext in plaats van een oneindige receptenfeed.** Aanwezigheid, tijd, budget, voorraad, restjes en het recente weekmenu sturen het voorstel.
5. **Tafelbalans.** De app houdt op gezinsniveau rekening met de afwisseling van favorieten, zonder wedstrijdjes of schuldgevoel bij kinderen.
6. **Uitgelegd voorstel.** Ieder advies toont waarom het past en welke aannames nog gecontroleerd moeten worden.

### 1.4 Wat Plateful bewust niet is

- Geen calorie-, gewicht- of afvalapp voor kinderen.
- Geen verplicht dagelijks stemrondje.
- Geen voedings- of medische diagnose.
- Geen bewering dat AI allergieën of kruisbesmetting kan uitsluiten.
- Geen verplicht volledig voorraadbeheer voordat een gezin een voorstel krijgt.
- Geen restaurant-/maaltijdbezorgapp in versie 1.

## 2. Doelgroepen, rollen en autorisatie

| Rol | Definitie | Mag doen | Mag niet doen |
| --- | --- | --- | --- |
| Eigenaar | Eerste geregistreerde volwassene | Gezin beheren, tweede volwassene uitnodigen, plannen, regels, export/verwijdering | Harde veiligheidsregels in een concrete maaltijd omzeilen |
| Mede-ouder | Uitgenodigde volwassene | Profielen, voorkeuren, maaltijdkeuze, boodschappen, planning beheren | Eigenaar zonder bevestiging verwijderen, account-/factuurinstellingen eigenaar wijzigen |
| Kind t/m 15 | Beheerd gezinsprofiel, in v1 zonder zelfstandig account | Op gedeeld toestel smaak aangeven, favorieten markeren, suggestie geven | Maaltijd verplicht vastzetten, hard constraint verwijderen, account beheren |
| Gezinslid 16+ | Profiel, eventueel eigen account in fase 2 | Eigen voorkeuren, aanwezigheid en feedback aanpassen | Harde beperkingen van anderen veranderen |
| Gast | Tijdelijke extra eter, zonder account | Door ouder toegevoegd aan specifieke maaltijd | Andere gezinsdata bekijken |
| Beheerder Plateful | Operationeel applicatiebeheer | Receptcatalogus/technische status beheren met auditering | Zomaar individuele gezinsvoorkeuren bekijken |

**Autorisatiemodel versie 1:** alleen volwassen accounts loggen in. Een kind kan op een toestel onder toezicht van een ouder zijn voorkeuren invullen. Voor zelfstandige accounts van minderjarigen is een aparte privacy-, toestemming- en roluitwerking nodig. Gebruik profielnamen en leeftijdscategorieën; geen geboortedatum of school nodig.

### 2.1 Toestemmingen

- De volwassene accepteert voorwaarden/privacyinformatie bij eerste registratie.
- Gegevens over allergieën of medische dieetbeperkingen worden alleen vastgelegd na afzonderlijke, aantoonbare expliciete toestemming van de bevoegde volwassene; toon doel en bewaartermijn.
- De volwassene kan toestemming waar toepasselijk intrekken en het betreffende gegeven verwijderen; de app blokkeert dan automatische 'veilig voor jou'-claims.
- Voor eventuele zelfstandige kindaccounts of direct op kinderen gerichte profilering moet aantoonbare ouderlijke toestemming en aanvullend rechtenbeheer worden ontworpen vóór uitrol.
- Personen vanaf 12 kunnen volgens de actuele Nederlandse regels onder meer zelf privacyverzoeken doen; maak daarvoor een begrijpelijke contactroute beschikbaar.

## 3. Functionaliteit en prioriteiten

**P0 = eerste werkende pilot; P1 = sterke consumentenrelease; P2 = uitbreiding.** Geen verborgen afhankelijkheden: Claude moet per functie een aparte implementatie- en teststatus bijhouden.

| ID | Functie | Prioriteit | Kern |
| --- | --- | --- | --- |
| F-001 | Registreren/inloggen | P0 | Email magic link/OTP, sessies, uitloggen |
| F-002 | Gezin aanmaken | P0 | Huishoudnaam, tijdzone, leden |
| F-003 | Profielen beheren | P0 | Volwassenen, kinderen, rollen, archiveren |
| F-004 | Smaakprofielen | P0 | Ingrediënt, bereidingsvorm, gerecht, like/neutral/dislike |
| F-005 | Harde uitsluitingen | P0 | Allergie, medisch, gekozen strikt dieet; niet overrulebaar |
| F-006 | Ouderlijke menu-regie | P0 | Zachte kinderafkeer passeren mét zichtbare aanpassing |
| F-007 | Maaltijdvoorstel vandaag | P0 | Eén hoofdadvies, twee alternatieven, waarom dit past |
| F-008 | Maaltijd bevestigen/wisselen | P0 | Status, history, beschikbaarheid, undo |
| F-009 | Weekplan | P0 | Maaltijden en eters per dag, handmatig wijzigen |
| F-010 | Plan B | P0 | Minder tijd, eter afwezig, ingrediënt ontbreekt, voorkeurconflict |
| F-011 | Boodschappenlijst | P0 | Automatisch per geaccepteerd plan, afvinken, delen tussen volwassenen |
| F-012 | Kookmodus | P0 | Stappen, totale/actieve tijd, porties en aanpassingen |
| F-013 | Receptcatalogus | P0 | Curated recepten + gestructureerde ingrediënten en herkomst |
| F-014 | Handmatige voorraad | P1 | In huis / aantal / houdbaarheid / gecontroleerd op |
| F-015 | Restjes | P1 | Porties, bewaarmoment, datum, volgende maaltijd |
| F-016 | Budgetbewaking | P1 | Weekindicatie, prijs-onbekend-detectie, budgetfilters |
| F-017 | Gezinsfeedback | P1 | 'Voor herhaling', 'prima', 'liever anders'; subtiel leren |
| F-018 | Tafelbalans | P1 | Afwisseling van favoriete smaken over 14 dagen |
| F-019 | Aanwezigheidsrooster | P1 | 'Eet thuis?', terugkerende uitzonderingen, gasten |
| F-020 | Push/emailherinneringen | P1 | Alleen opt-in, voor volwassenen |
| F-021 | Eigen recepten | P1 | Zelf invoeren/bewerken, ingrediënten verplicht structureren |
| F-022 | Slim alternatief uit voorraad | P1 | Alleen controleerbare vervangingen |
| F-023 | Meal prep en meerdere dagen | P2 | Slim voorbereid koken, gecombineerde bereiding |
| F-024 | Supermarkt-/bestelkoppeling | P2 | Pas na partner/API-afspraken en prijsverificatie |
| F-025 | Agenda-integratie | P2 | Opt-in, minimale afgeleide aanwezigheid |
| F-026 | Spraak en foto-input | P2 | Pas na toestemming, betrouwbaarheidslabels |
| F-027 | Landen/talen | P2 | Internationale recepten, lokalisatie |

## 4. Onboarding — volledig scherm- en dataverloop

### O-01: Start

- Boodschap: 'Iedereen anders. Samen aan tafel.'
- CTA: 'Maak jullie tafel aan'; secundair 'Zo werkt Plateful'.
- Geen abonnementspagina of verplichte betaalgegevens.

### O-02: Account

- Email invoeren, magic link of eenmalige code versturen.
- Foutstates: verkeerd emailformaat, code verlopen, link al gebruikt, teveel pogingen, provider niet beschikbaar.
- Account pas als bevestigd beschouwen bij geldige auth-sessie.

### O-03: Huishouden

- Gezin/huishoudnaam optioneel (standaard 'Ons gezin'), locale nl-NL, tijdzone Europe/Amsterdam.
- 'Met hoeveel mensen eten jullie meestal?' minimum 1, maximum 12.
- Geen aanname dat elk gezin twee ouders heeft.

### O-04: Wie zitten er aan tafel?

- Profielen: roepnaam verplicht, leeftijdscategorie (volwassene, 16+, 0–15) zonder exacte geboortedatum, avatar/kleur.
- Dubbele voornamen toegestaan; geef aparte unieke profiel-id.
- Een profielfoto is niet nodig.

### O-05: Wat mag nooit op tafel?

- Per persoon optioneel: allergieën, medisch noodzakelijk dieet, strikt persoonlijk/ethisch dieet.
- Maak onderscheid tussen 'allergie/medisch' en 'ik wil het niet eten'; toelichting voordat men opslaat.
- Expliciete toestemming voor verwerking van mogelijke gezondheidsgegevens.
- 'Nog niet bekend' = onbekend, nooit 'geen allergie' veronderstellen.

### O-06: Dit vind ik lekker/niet lekker

- Snelle kaarten voor herkenbare ingrediënten, gerechten en bereidingsvormen.
- Keuzes: heerlijk, prima/neutraal, liever niet, echt niet lekker, nog nooit gehad.
- Voorbeeld: 'Rauwe tomaat: liever niet; tomatensaus: heerlijk.'
- Minimaal nul voorkeuren mogelijk; onboarding mag worden overgeslagen.

### O-07: Praktische context

- Gewenste maximaal beschikbare bereidingstijd doordeweeks (standaard 30 min), weekend optioneel.
- Eetmoment optioneel, kookvaardigheid (eenvoudig/gemiddeld), apparaten (oven, airfryer etc.).
- Weekbudget in euro optioneel; zonder betrouwbare prijzen geen exacte besparingsclaim.
- Voorkeur vegetarisch/vlees/vis alleen in combinatie met profielbeperkingen.

### O-08: Eerste voorstel

- Toont binnen één scherm een maaltijd met foto, tijd, aantal personen, uitleg, 'Dit eten we', 'Ander idee' en 'Waarom deze?'.
- Doel voor gebruikerstest: eerste nuttige suggestie binnen drie minuten onboarding; dit is een **productdoel**, geen gemeten resultaat.
- Achteraf prompts om ontbrekende voorkeuren aan te vullen, niet vooraf afdwingen.

## 5. Schermcatalogus en interfacecontracten

De bestaande visuele mockup is altijd leidend voor kleur, lettertype, vorm, witruimte en contentstructuur. Nieuwe schermen gebruiken dezelfde componenten.

| ID / route | Scherm | Verplichte informatie en primaire acties | States |
| --- | --- | --- | --- |
| S-00 / | Intro/landing | Merkverhaal, demo, aanmaken/inloggen | Gast |
| S-01 /login | Login | Email/code, privacy, foutmeldingen | loading/sent/error |
| S-02 /onboarding | Onboarding wizard | O-03 t/m O-08, overslaan, voortgang | partial/saved |
| S-03 /app/vandaag | Vandaag | Context, datum, voorgesteld gerecht, matchuitleg | proposed/accepted/cooked |
| S-04 /app/gerecht/:id | Gerecht | Ingrediënten, porties, persoonlijke aanpassingen, bereiding | eligible/blocked |
| S-05 /app/plan-b | Plan B | Vier of meer scenario's, preview en toepassen | select/generate/preview/applied |
| S-06 /app/week | Week | 7 dagen, eters, maaltijden, schuiven/wisselen | draft/active |
| S-07 /app/gezin | Gezin | Profielen, rol, voorkeurstatussen | view/edit |
| S-08 /app/gezin/:id | Smaakprofiel | Alle voorkeuren en harde beperkingen, regie | saved/pending/blocked |
| S-09 /app/boodschappen | Boodschappen | Categorieën, totalen, checken, handmatig toevoegen | synced/offline/conflict |
| S-10 /app/voorraad | Voorraad | Wat is in huis, hoeveelheid, houdbaarheid | unknown/confirmed |
| S-11 /app/koken/:slotId | Kookstand | Stappen, porties, waarschuwingen, afronden | not-started/in-progress/done |
| S-12 /app/restjes | Restjes | Porties, datum, opmaken/wegdoen | available/expired/used |
| S-13 /app/instellingen | Instellingen | Gezin, privacy, toestemmingen, voorkeuren, verwijdering | view/confirm |
| S-14 /app/waarom/:slotId | Adviesuitleg | Matchredenen, aannames, individuele aandachtspunten | explain |

### S-03 Vandaag — exacte functionele inhoud

1. Datum met dagnaam; wie eet er vanavond mee?
2. Eén duidelijke voorgestelde maaltijd, afbeelding, actief/totaal minuten, aantal porties.
3. Label 'Past bij jullie gezin' alleen als harde checks zijn doorlopen.
4. Een korte verklaring met maximaal drie redenen: bijvoorbeeld '20 min', 'courgette op voorraad', 'tomaat apart voor Sam'.
5. 'Dit eten we': bevestigt met expliciete klik; maakt/actualiseert lijst en toont volgende actie 'Bekijk kookstappen'.
6. 'Ander idee': toont ander, al gevalideerd alternatief en slaat niet ongevraagd op als geaccepteerd.
7. 'Plan B': opent contextueel de huidige maaltijd.
8. Niet voldoende gegevens: toon 'Nog even controleren' en verberg veiligheidsclaims.

### S-05 Plan B — functioneel gedrag

- Start vanuit een bestaand slot en behoudt een referentie naar de huidige versie.
- Presets: minder tijd, iemand eet niet mee, ingrediënt ontbreekt, kind vindt iets niet lekker.
- P1: extra opties 'we hebben geen energie', 'budget lager', 'restjes eerst'.
- Vrije tekst maximaal 500 tekens; behandel als context, nooit als autorisatie om harde regels te passeren.
- Voorstel als **diff**, bijvoorbeeld 4 → 3 eters, 20 → 15 minuten, zwarte bonen → aanwezige kikkererwten.
- Eerst 'Voorstel bekijken'; alleen 'Pas het menu aan' voert mutatie uit.
- Recept, voorraadreserveringen, boodschappen, porties en planning worden in één transactie consistent bijgewerkt.
- Binnen 10 minuten één keer 'Maak ongedaan' beschikbaar, zolang er niet een latere planmutatie is doorgevoerd; bij conflict toon keuze.

### S-08 Smaakprofiel

- Categorielijst: ingrediënten, gerechten, bereidingsvorm, harde beperkingen.
- 'Rauwe tomaat' is ander profielitem dan 'tomatensaus'.
- Kind kan op gedeeld toestel 'echt niet lekker' selecteren; ouder ziet dat terug.
- Ouder kan voor een specifiek menu 'Toch kiezen' gebruiken bij zachte afkeer. De opgeslagen afkeer blijft behouden.
- Als het kind het gerecht zonder aanpassing niet kan/wil eten, toon een mogelijke veilige component aan de gezamenlijke maaltijd; dwing niet tot eten.
- Harde beperkingen hebben visueel en technisch een aparte behandeling. Een toggle voor ouderlijke regie **mag ze nooit aanpassen**.

### S-09 Boodschappen

- Items gegroepeerd naar groente & fruit, voorraad, koeling, brood/granen, overig.
- Per item naam, benodigd totaal, bekende voorraad, nog te kopen, eenheid en controle-status.
- Checkbox per item voor gekocht; status deelt realtime tussen volwassen accounts.
- Bij aanpassing plan nieuwe behoefte uitrekenen; handmatig toegevoegde items behouden.
- Items die door gewijzigd plan overbodig worden gaan naar 'niet meer nodig' met herstelmogelijkheid in plaats van stil te verdwijnen.
- V1 geen claims over actuele winkelprijzen of directe bestelling.

### S-11 Kookstand

- Ingrediëntenlijst schaalbaar voor 1–12 eters.
- Precieze stappen met werkwoord, duur, eventuele timer, losse toppings/variaties.
- Actieve kookstappen niet herordenen door een achtergrond-AI-verzoek.
- 'Gekookt' markeert slot als afgerond en vraagt optioneel naar restjes en feedback.

## 6. Domeinregels — definitief gedrag

### R-01: Hard vs soft

| Soort | Voorbeeld | Maaltijdplanner | Ouder override |
| --- | --- | --- | --- |
| HARD_ALLERGY | Pinda-allergie | Recept met allergen / onbekende allergenstatus uitgesloten | **Nooit** |
| HARD_MEDICAL | Medisch noodzakelijke uitsluiting | Altijd uitsluiten | **Nooit** |
| HARD_DIET | Strikt vegetarisch/vegan, expliciet vastgelegd | Uitgesloten ingredienten vermijden | Niet bij iemands geaccepteerde harde regel |
| STRONG_DISLIKE | Echt geen champignons | Laag scoren, aparte component of alternatief voorstellen | Alleen menu-keuze, niet profiel wissen |
| SOFT_DISLIKE | Liever geen rauwe tomaat | Lager scoren, serveer apart | Ja, met uitleg |
| NEUTRAL/UNKNOWN | Geen oordeel | Geen veto, onbekend niet als 'lekker' behandelen | n.v.t. |
| LIKE | Pasta heerlijk | Positieve voorkeur | n.v.t. |

**Conservatieve veiligheidsregel:** onbekende of onvolledige allergeneninformatie is **niet bewezen veilig**. Bij een betrokken harde allergie wordt het recept niet als geschikt voorgesteld, totdat betrouwbare ingrediëntinformatie is vastgelegd en door de gebruiker gecontroleerd. Gebruik nooit modeltekst als enige bron van een veiligheidsoordeel.

### R-02: Gezamenlijke basis

Streef één basisgerecht na. Als een aanpassing nodig is, rangschik: saus apart → topping apart → equivalent onderdeel → ander gezamenlijk basisgerecht. Maak niet standaard vier aparte diners.

### R-03: Eters en porties

Aanwezigheid heeft de waarden 'ja', 'nee', 'onbekend'. Onbekend vraagt bevestiging voor boodschappen/porties. Een gast telt mee zonder profiel; gasten met allergieën mogen niet als 'geen allergie' worden beschouwd.

### R-04: Weekvariatie

Stel geen identiek hoofdgerecht binnen zeven dagen voor, tenzij het gezin dat kiest. Houd groente-/eiwit-/keukenvariatie zichtbaar zonder kinderen calorie- of macrodoelen toe te wijzen.

### R-05: Budget

Een prijs is 'onbekend' of 'geschat' tenzij er aantoonbare bron + datum is. Budgetfilters mogen alleen hard zijn als prijsgegevens voldoende compleet zijn; anders wordt het een waarschuwing 'budget niet betrouwbaar te controleren'.

### R-06: Voorraad

Voorraad met status 'onbekend' telt niet als beschikbaar. Voorraad met oude verificatie vraagt bevestiging. Een ingrediënt is alleen 'in huis' als exact ingredient/hoeveelheid voldoende bekend is.

### R-07: Restjes

Toon opslaglocatie en bewaardatum. Voorbereide maaltijdrestjes volgen een conservatieve bewaartermijn en kunnen door de gebruiker eerder als onveilig worden gemarkeerd. Geen automatisch 'veilig' label na die termijn. Basisregel in Nederlandse markt: maximaal twee dagen afgedekt in koelkast; bij langer bewaren invriezen volgens officiële adviezen.

### R-08: Feedback en leren

Waarderingen verbeteren de toekomstige ranking, maar creëren geen permanente uitsluitingen. Een negatieve mening kan worden gewijzigd. Laat geen sociale ranglijst van 'moeilijke eters' zien.

### R-09: Geen autonome externe acties

AI mag voorstellen genereren. Alleen een expliciete gebruikeractie mag menu's vastzetten, boodschappen bestellen, betalingen starten of gegevens delen. In V1 zijn er helemaal geen betaal- of bestellingacties.

### R-10: Gezinsprivacy

Ieder gezin is een strikt gescheiden tenant. Een gebruiker van gezin A kan geen profiel, recepten op maat, boodschappen, AI-geschiedenis of bestanden van gezin B lezen, ook niet door een ID in een URL te veranderen.

## 7. Aanbevelingsengine — deterministisch + AI

### 7.1 Inputcontract

Voor een planning/suggestie zijn relevant:

- household_id en plan-slot met datum/tijdzone;
- aanwezige profiel-ids en gasten;
- per profiel harde beperkingen en zachte voorkeuren;
- gewenste kooktijd, apparatuur, vaardigheden;
- voorraad (met verificatie), optioneel budget;
- eetgeschiedenis 14 dagen, favorieten en feedback;
- relevante restjes, beschikbare recepten en gecontroleerde varianten.

### 7.2 Stappenplan (vaste volgorde)

1. **Server autoriseert** gebruiker en gezin.
2. **Normaliseer inputs**: ingrediëntnamen en eenheden via gecontroleerde catalogus.
3. **Hard filter**: alle betrokken harde verboden en onvolledige veiligheidsmetadata uit de voorstelset halen; bij nul veilige kandidaten duidelijk uitleggen en handmatige keuze/controle aanbieden.
4. **Haalbaarheid**: tijd, apparatuur, aantal eters, verplichte ingrediënten.
5. **Bereken varianten**: alleen gestructureerde, gevalideerde optionele toevoegingen en vervangingen.
6. **Rank kandidaten** met uitlegbare gewichten.
7. **Gebruik AI alleen voor** korte uitleg, vriendelijke tekst, structurering van Plan B-context en selectie tussen veilige kandidaat-ids; nooit voor het omzeilen van harde checks.
8. **Postvalidatie** op server: iedere gekozen recipe_id bestaat, is geschikt voor de huidige context/revisie, en heeft veilige ingredientstatus.
9. **Retourneer** 1 hoofdvoorstel en maximaal 2 alternatieven plus waarom, aannames en trade-offs.
10. **Bewaar** pas als voorstelversie; accepteer pas na menselijke klik.

### 7.3 Startgewichten voor ranking

Gewichten zijn producthypothesen, later met echte testgezinnen afstellen.

| Component | Startgewicht |
| --- | ---: |
| Voorkeursfit gezin | 30% |
| Past binnen beschikbare tijd | 20% |
| Aansluiting op bekende voorraad | 15% |
| Geschatte betaalbaarheid | 10% |
| Afwisseling afgelopen week | 10% |
| Tafelbalans laatste 14 dagen | 10% |
| Restjes slim benutten | 5% |

Harde uitsluitingen worden **vóór** ranking gefilterd en kunnen nooit door een hoge totaalscore worden gecompenseerd. Ontbrekende prijs-/voorraadgegevens scoren neutraal met expliciete 'onbekend'-indicator; maak geen vals nauwkeurigheidspercentage. 'Goed passend' is een label, geen medische garantie.

### 7.4 AI-outputcontract

Gebruik een gestructureerde respons met velden:

- status: 'ok', 'insufficient_data', 'no_safe_candidate', 'unavailable';
- suggested_recipe_id: bestaande veilige recipe-id of null;
- alternative_recipe_ids: maximaal twee bestaande veilige ids;
- optional_variant_ids: bestaande gevalideerde varianten;
- reasons: maximaal drie korte, feitelijk verifieerbare redenen;
- warnings: ontbrekende gegevens en beperkingen;
- plan_diff: alleen bij Plan B gestructureerde oude en nieuwe waarden;
- confidence_label: hoog/gemiddeld/laag voor beschikbaarheid van **data**, niet voor allergieveiligheid.

Alle veldwaarden worden Zod/server-side opnieuw gevalideerd. OpenAI Structured Outputs biedt schema-conforme output, maar inhoudelijke fouten blijven mogelijk; daarom zijn onafhankelijke businesschecks verplicht.

### 7.5 Foutafhandeling en fallback

- AI-provider niet beschikbaar: toon de beste deterministisch gerankte, al gevalideerde maaltijd; UI meldt dat slimme toelichting tijdelijk ontbreekt.
- Geen veilige kandidaat: blokkeer advies, vraag informatie aan te vullen of laat gebruiker handmatig binnen gecontroleerde catalogus selecteren.
- AI geeft niet-bestaand recept: weigeren, log technische fout zonder gezondheidsdata in telemetry, kies fallback.
- AI overschrijdt tijdlimiet: geen dubbele mutatie; dezelfde request-id mag idempotent worden herhaald.
- Advies gegenereerd op oud profiel: bij nieuwe allergiesetting/huidige revisie volledig opnieuw valideren.

## 8. State machines en mutaties

### 8.1 MealSlot

draft → proposed → accepted → cooking → completed.

Zijpaden: proposed → dismissed; accepted → changed (met nieuwe geaccepteerde revisie); accepted/cooking → cancelled; proposed/accepted → blocked wanneer nieuwe harde informatie wordt vastgelegd; blocked → proposed na herbeoordeling.

### 8.2 Plan B

idle → scenario_selected → calculating → preview → applying → applied.

Fouten: calculating → error/timeout; applying → conflict/retry. 'Apply' schrijft atomair en bewaart vorige revisie voor undo.

### 8.3 Boodschappen

Elke planrevisie leidt tot een deterministische herberekening van nog benodigd. Items hebben status open/checked/removed. Handmatige items houden een eigen origin en verdwijnen niet door automatische recalculatie. Dubbele requests produceren geen dubbele regels.

### 8.4 Concurrency

Iedere plan- en lijstwijziging heeft een revision/version. Twee volwassenen die tegelijk wijzigen krijgen:

- identieke simultane actie: idempotente afhandeling;
- conflict: laatste versie herladen en verschillen tonen, zonder stil de eerdere mutatie te overschrijven;
- bij wijziging harde beperkingen: eerdere voorstellen ongeldig verklaren.

## 9. Datamodel (logisch)

Alle tabellen gebruiken UUID-id, created_at, updated_at waar relevant. Elke gezinsgerelateerde entiteit bevat een household_id; databasebeveiliging gebruikt geverifieerd lidmaatschap in de database.

| Entiteit | Verplichte velden | Relaties / notities |
| --- | --- | --- |
| households | id, name, locale, timezone, created_by | 1:N profiles, plans |
| household_accounts | id, household_id, auth_user_id, role, status | Volwassenen aan huishoudens gekoppeld |
| profiles | id, household_id, display_name, age_band, avatar, active | Geen kind-email nodig |
| consents | id, household_id, profile_id?, actor_user_id, purpose, consent_version, granted_at, withdrawn_at | Aantoonbare toestemming |
| ingredients | id, canonical_name, unit_kind, synonyms, status | Gecontroleerde algemene catalogus |
| ingredient_allergens | ingredient_id, allergen_code | Meer-op-meer, bron/herkomst |
| profile_rules | id, household_id, profile_id, target_type, target_id, preparation, severity, source | Soft/hard voorkeuren |
| recipes | id, owner_household_id?, name, instructions, prep_minutes, cook_minutes, servings, source, review_status | Gecurateerd of eigen |
| recipe_ingredients | id, recipe_id, ingredient_id, quantity, unit, optional, component | Gestructureerd, genormaliseerd |
| recipe_variants | id, recipe_id, variant_name, changes_json, safety_review_status | Geen vrije substituties voor allergiegevallen |
| meal_plans | id, household_id, week_start, status, revision | Uniek huishouden + actieve week |
| meal_slots | id, household_id, plan_id, local_date, recipe_id?, variant_ids, state, revision | Eén hoofdgerecht per dag |
| meal_attendees | id, household_id, slot_id, profile_id?, guest_label?, attendance | Aanwezigheid per slot |
| proposal_snapshots | id, household_id, slot_id, revision, input_hash, safe_candidate_ids, reasons | Traceerbare voorstellen |
| pantry_items | id, household_id, ingredient_id, quantity?, unit?, location, expires_at?, verified_at | Onbekend is niet aanwezig |
| shopping_lists | id, household_id, plan_id, revision | Versiebeheer |
| shopping_items | id, household_id, list_id, ingredient_id?, description, qty, unit, origin, state | Handmatig of automatisch |
| leftovers | id, household_id, source_slot_id, portions, stored_at, storage, use_by, status | Voedselveiligheid |
| meal_feedback | id, household_id, slot_id, profile_id?, rating, comment? | Optioneel/gezinsvriendelijk |
| audit_events | id, household_id, actor_user_id, event_type, entity_id, metadata_redacted | Gevoelige waarden niet loggen |
| invitations | id, household_id, recipient_email_hash, invited_role, expires_at, status | Geen open household-joins |

**Indexes/constraints:** household_id op elke gezinsquery; unieke active week per huishouden; unieke profielen via UUID (geen unieke namenplicht); referential integrity op recipe/ingredient; geaccepteerde revisie slechts één per slot; foreign keys household-scoped gecontroleerd; hard rule niet door child-facing API te wijzigen.

**Soft delete:** profielen kunnen worden gearchiveerd; daadwerkelijke export/verwijdering is een aparte geautoriseerde actie met cascades/retentiebeleid.

## 10. API-contracten op hoofdlijnen

Alle routes versie 1: /api/v1. Geauthenticeerd, TLS, JSON, server-side inputvalidatie. Gebruik de aanvullende OpenAPI-specificatie in de bijlage voor concrete input/outputs.

| Methode | Endpoint | Doel |
| --- | --- | --- |
| GET/POST | /households | Eigen gezin ophalen/aanmaken |
| GET/PATCH | /households/:id | Instellingen |
| GET/POST | /households/:id/profiles | Gezinsprofielen |
| GET/PATCH/DELETE | /profiles/:id | Profiel lezen/wijzigen/archiveren |
| GET/PUT | /profiles/:id/preferences | Voorkeuren volledig opvragen/opslaan |
| POST | /profiles/:id/hard-rules | Harde beperking na volwassen autorisatie + toestemming |
| POST | /meal-suggestions | Veilige suggestie(s) berekenen |
| POST | /meal-slots/:id/accept | Voorstel vastzetten, version-check |
| POST | /meal-slots/:id/swap | Alternatief voorstellen |
| GET/PATCH | /week-plans/:id | Weekplanning ophalen/wijzigen |
| POST | /meal-slots/:id/plan-b/preview | Diff berekenen, zonder side-effects |
| POST | /meal-slots/:id/plan-b/apply | Atomair toepassen, version-check |
| POST | /meal-slots/:id/undo | Vorige toegestane revisie herstellen |
| GET/POST/PATCH | /shopping-lists/... | Lijst en items beheren |
| GET/POST/PATCH | /pantry/... | Voorraad |
| POST | /meal-slots/:id/complete | Afronden, evt. restjes |
| GET/POST/PATCH | /leftovers/... | Restjes |
| POST | /feedback | Maaltijdfeedback |
| GET/PUT | /privacy/consents | Toestemmingen |
| GET | /me/export | Persoonsgegevens exporteren |
| POST | /me/delete-request | Account/gezinsdata verwijderen (bevestiging vereist) |

**API-regels:** Idempotency-Key voor accept/apply/complete en winkelmutaties; If-Match/revision voor planmutaties; consistente foutcodes 400 invalid_input, 401 unauthenticated, 403 forbidden, 404 not_found, 409 revision_conflict, 422 unsafe_or_unavailable, 429 rate_limited, 503 provider_unavailable. Geen ruwe AI-prompt of gevoelige gezinsdata in foutresponses.

## 11. Privacy, veiligheid en kwaliteit

### 11.1 Privacy by design

- EU-regio voor database indien beschikbaar; controleer daadwerkelijke verwerkers, opslaglocaties en afspraken.
- Alleen het minimum aan kinddata: roepnaam, leeftijdscategorie, voorkeuren, optionele harde regels.
- Voer een DPIA-/juridische beoordeling uit vóór publieke lancering, met specifieke aandacht voor kinderen en gezondheidsdata.
- Geen advertenties of commerciële profilering op basis van kinder- of allergiegegevens.
- Consent-event en juiste informatieversie bewaren; intrekken/verwijderen eenvoudig.
- Gebruiker kan gezin exporteren, profiel verwijderen en account verwijderen.
- Geen wachtwoorden/API-sleutels in client; geen service-role key in frontend.

### 11.2 Autorisatie en RLS

Alle household-gebonden tabellen vereisen Row Level Security. Een policy kijkt naar actief lidmaatschap in household_accounts via auth.uid() — nooit naar wijzigbare user_metadata of een household_id in een request alleen. Serverrollen controleren eigenaar vs mede-ouder, ook als RLS een rij toegankelijk maakt. Het formulier voor allergieën vereist een expliciete volwassen servercontrole.

### 11.3 Veiligheid bij eten

- Hard allergies block before and after model suggestion.
- Metadata incompleet = niet veilig verklaren.
- Waarschuwing in elke ingredientdetailweergave: 'Controleer bij allergieën altijd de verpakking en bereidingsomgeving'.
- Allergie van aanwezige gast onbekend? Vraag verificatie; label niet 'geschikt voor iedereen'.
- Optionele persoonlijke topping bij allergie alleen als alle relevante risico's onafhankelijk gecontroleerd zijn; geen automatische claim over kruisbesmetting.
- Restjes na houdbaarheid niet als bruikbaar voorplanning voorstellen; merk 'controle nodig'.

### 11.4 Beschikbaarheid en prestaties (productdoelen)

| Categorie | Doel |
| --- | --- |
| UX | Kernscherm op mobiel duidelijk binnen 2 seconden bij normale verbinding |
| Advies | Loadingstate direct; binnen 12 seconden resultaat in gangbare situatie, na 25 seconden fallback/error |
| Stabiliteit | Idempotente mutaties, geen dubbele boodschappen door retry |
| Toegankelijkheid | Streven naar WCAG 2.2 AA, toetsenbord, contrast, screenreaderlabels |
| Platform | Mobiele PWA op iOS/Android, responsive desktop |
| Locale | nl-NL, EUR, gr/kg/ml/l, zomer-/wintertijd correct |
| Testbaarheid | Deterministische fixtures, eenheids-/integratie-/E2E-tests |
| Herstel | Dagelijkse databaseback-up en getest herstelplan |

De waarden zijn acceptatiedoelen, geen vooraf bewezen prestaties.

## 12. Technische architectuur — aanbevolen

- **Frontend:** Next.js App Router, TypeScript, React. Hergebruik originele CSS en SVG's; geen visuele reset door een generieke UI-kit.
- **Presentatie:** bestaande HTML/CSS in componenten opdelen met visuele regressietests.
- **Backend:** Next.js server-side routes/actions, autorisatie centraal en getest.
- **Database/Auth:** Supabase Postgres + Auth in passende EU-regio, met Row Level Security per huishouden.
- **Validatie:** Zod-schema's voor formulieren, API, AI-uitvoer.
- **AI:** server-side OpenAI API met Structured Outputs, gescheiden recommendation service; modelnaam via omgevingsvariabele, geen client-call.
- **Catalogus:** eigen curated recepten met gestructureerde ingredienten, handmatig te corrigeren en herkomstvelden.
- **Hosting:** Vercel als voorkeursoptie, maar alleen na expliciete deploy-opdracht en ingestelde geheimen.
- **Monitoring:** technische fouttelemetrie zonder identificeerbare kind-/gezondheidsvelden; opzet voor audit en incidentrespons.
- **Tests:** Vitest voor domeinregels, integratietests voor Postgres/RLS, Playwright voor browserflows, visuele snapshots op meerdere breedtes.

### 12.1 Logische componenten

UI → Auth/Household API → Household service → Catalog/Constraint engine → Ranking → optionele AI Explanation → Validator → Proposal. Accept/PlanB Apply → Transaction service → Meal slot + Shopping + Pantry reservations + Audit.

### 12.2 Belangrijke grenzen

1. De AI mag de database niet direct muteren.
2. De catalogus/validator bepaalt formele geschiktheid, nooit het model.
3. Een dure/ontbrekende AI-service mag basisplanning niet blokkeren.
4. Alle mutaties worden server-side geautoriseerd en geversioneerd.
5. Receptbronvermelding en rechten moeten aantoonbaar zijn; haal geen beschermde recepten automatisch van willekeurige websites.

## 13. Volledige gebruikersflows (acceptatie)

### U-01 Nieuw gezin

Gegeven nieuwe gebruiker; wanneer deze email bevestigt, huishouden en vier profielen maakt en voorkeuren invult; dan verschijnt binnen de app één geldig maaltijdvoorstel met juiste aantal eters en een bewerkbaar profiel. Herstarten behoudt gegevens.

### U-02 Kind wijst champignons af

Gegeven Lina heeft 'Champignons — echt niet lekker'; als het model een recept met champignons overweegt, dan krijgt dit een zachte afkeurpenalty en wordt eerst een variant zonder champignons gezocht. Ouder kan gerecht toch kiezen, maar ziet het conflict en een voorstel voor een aparte component. De opgeslagen afkeer verandert niet.

### U-03 Harde notenallergie

Gegeven Lina heeft een bevestigde notenallergie; een recept met noten, een onduidelijke notenstatus of een niet-gecontroleerde substitutie mag niet als veilig worden voorgesteld of geaccepteerd voor haar. Een ouderlijke toggle verandert dit nooit.

### U-04 Plots één persoon afwezig

Gegeven vier eters en een geaccepteerde maaltijd; wanneer ouder 'Iemand eet niet mee' kiest, preview drie eters toont en toepast; dan wijzigen aantal porties, hoeveelheden en automatische boodschappen samen, zonder doublures. Undo brengt oude toestand terug.

### U-05 Minder tijd

Gegeven avondeten duurt 40 min, maar ouder heeft 15 min; Plan B zoekt aantoonbaar passend gecontroleerd alternatief of legt uit dat dit niet betrouwbaar kan met huidige data. Geen verzonnen 'binnen 15 minuten' claim.

### U-06 Twee ouders tegelijk

Gegeven ouder A en B hebben weekplan-revisie 12 open; A past dinsdag aan en schrijft revisie 13; B probeert vervolgens revisie 12 te wijzigen. Dan krijgt B een expliciete conflictweergave, geen stille overschrijving.

### U-07 Allergie toegevoegd na acceptatie

Gegeven een plan is geaccepteerd; als een ouder een nieuwe harde allergie vastlegt, dan worden afhankelijke toekomstige voorstellen/slots opnieuw gecontroleerd. Onveilige slots krijgen 'controle nodig/geblokkeerd', en de app toont dat boodschappen en menu aangepast moeten worden.

### U-08 Voorraad onbekend

Gegeven de voorraadstatus van kikkererwten is onbekend; dan staat niet 'al in huis' maar 'even controleren'. Bij check 'in huis' wordt het item niet onnodig toegevoegd.

### U-09 Restjes

Gegeven 2 porties pasta sinds gisteren correct gekoeld; wanneer de gebruiker restjes als beschikbaar markeert, kunnen ze meewegen. Na het overschrijden van de conservatieve bewaartermijn verschijnen ze niet als direct bruikbaar en volgt een controlemelding.

### U-10 Zelfde gerecht niet telkens

Gegeven het gezin had al 2 keer wraps in de laatste 7 dagen; als een gelijkwaardig alternatief bestaat, heeft dat een hogere variatiescore. Gezinsleden mogen wraps alsnog bewust kiezen.

### U-11 AI niet bereikbaar

Gegeven de AI-provider geeft een 503; dan blijft het gezin de al gevalideerde recepten kunnen kiezen, met neutrale toelichting, en kan men handmatig plannen.

### U-12 Verwijderen

Gegeven een volwassene verzoekt om verwijderen; na expliciete bevestiging en geautoriseerde sessie wordt de aanvraag verwerkt, zijn rechten op betreffende gegevens direct ingetrokken en een passend verwijder-/retentiepad gevolgd; technische logs bevatten geen ruwe gezondheidsgegevens.

## 14. Bouwvolgorde — harde gates voor Claude Code

**Gate 0 — Reproductie:** bestaande Plateful UI pixels/getoonde schermen behouden; visuele vergelijking uitvoeren.

**Gate 1 — Auth en database:** echte sessies, huishoudens, profielen, RLS en rollen. Zonder aantoonbaar werkende tenant-isolatie niet verder.

**Gate 2 — Domein en veiligheid:** gestructureerde ingredienten, harde regels, ouderlijke voorkeuren, veilige catalogus. Testen vóór AI.

**Gate 3 — Kernplanning:** Vandaag, receptdetail, voorstellen, bevestigen, wisselen, week, deelnemers.

**Gate 4 — Plan B en consistentie:** preview, atomair toepassen, undo, versieconflicten, boodschappen.

**Gate 5 — AI-laag:** gestructureerde uitleg/keuze uit gecontroleerde kandidaten, validatie en fallback.

**Gate 6 — P1-verbeteringen:** voorraad, restjes, budget, Tafelbalans, feedback, notificaties.

**Gate 7 — Productierijp:** e2e, performance, toegankelijkheid, privacy-/juridische review, securityreview, incident- en back-upprocedures.

**Done-definitie per gate:** code, migraties, unit-/integration-/E2E-tests, privacy- en veiligheidschecks, korte wijzigingsdocumentatie, en visuele vergelijking met design v2.0. Niets 'af' verklaren op basis van alleen renderende schermen.

## 15. Nog te beslissen vóór publieke lancering

| Besluit | Voorstel voor eerste bouwfase |
| --- | --- |
| Verdienmodel | Geen paywall in pilot; freemium later testen |
| Receptbron | Kleine zelf-beheerde catalogus van minimaal 30 volledig gestructureerde recepten |
| Kindaccounts | Geen zelfstandig account onder 16 in v1 |
| Gastinformatie | Tijdelijk profiel zonder account en zonder blijvende gezondheidsgegevens |
| Boodschappenintegratie | Handmatige lijst in v1, externe retailers later |
| Budget | Optioneel, alleen schatting met onzekerheidslabel |
| Push | Opt-in voor volwassenen na pilot |
| Merk/IP | Apart onderzoek naar beeldmerk/naam voor commercieel gebruik |
| Privacy/juridisch | Formele toets, verwerkersafspraken en zo nodig DPIA vóór openbaar gebruik |
| Medische/voeding | Geen medisch advies, geen claim van allergieveiligheid |
| Interne beheerinterface | Alleen recepten/statussen, geen ongecontroleerde inzage in gezinsdata |

## 16. Traceerbaarheid en bronbasis

- Voedingscentrum: eetopvoeding en kieskeurig eten. Legt nadruk op geduld, samen aan tafel en het vermijden van dwang: https://www.voedingscentrum.nl/nl/zwanger-en-kind/eetopvoeding/tips-voor-een-gezonde-eetopvoeding.aspx
- Autoriteit Persoonsgegevens: toestemming kindgegevens, Nederlandse grens van 16 bij relevante online verwerkingen en nieuwe rechten vanaf 12: https://autoriteitpersoonsgegevens.nl/themas/basis-avg/avg-algemeen/grondslag-toestemming
- Europese Commissie: bijzondere categorieën persoonsgegevens waaronder gezondheidsgegevens: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data_en
- NVWA: veertien te vermelden allergenen, etiket en waarschuwingen: https://www.nvwa.nl/onderwerpen/voedselveiligheid/allergenen
- Voedingscentrum: restjes afgedekt maximaal twee dagen in de koelkast, langer invriezen: https://www.voedingscentrum.nl/nl/veilig-eten-voedselinfectie-voorkomen/veilig-bewaren.aspx
- Supabase: Row Level Security en household-autorisatie: https://supabase.com/docs/guides/database/postgres/row-level-security
- OpenAI: Structured Outputs garandeert schema, niet feitelijke juistheid; daarom eigen validatie: https://developers.openai.com/api/docs/guides/structured-outputs

**Deze bronnen onderbouwen ontwerp- en veiligheidskeuzes. Ze maken Plateful niet automatisch juridisch compliant of allergieveilig.**

## 17. Definitieve opdracht aan Claude Code

Implementeer Plateful als een mobiele, gezinsgerichte PWA volgens dit functionele ontwerp en behoud het bestaande Plateful Design System v2.0 één op één. Maak de app in verticale gates 0 t/m 7. Bouw eerst RLS, voorkeuren, veiligheidsregels en een deterministische maaltijdaanbevelingsengine; voeg daarna AI toe als beperkte, controleerbare assistent. Gebruik alleen de gespecificeerde states, schermen, endpoints en domeinregels of documenteer expliciet een voorgestelde afwijking ter goedkeuring. Zorg voor werkende registraties, profielbeheer, maaltijdplanning, Plan B, boodschappen, kookmodus, testen en beheer. Noem een visuele demo nooit een afgeronde productieapp.
