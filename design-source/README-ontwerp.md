# Plateful — visueel concept v2.0

Een klikbare visuele studie voor een gezinsmaaltijdassistent. Deze uitwerking demonstreert de vormgeving en voorbeeldinteracties; er is nog geen werkende AI, accountbeheer of database.

## Voor Claude Code: start hier

1. Lees eerst `CLAUDE-CODE-MASTERPROMPT.md` en gebruik de inhoud als directe opdracht aan Claude Code.
2. Lees daarnaast `PLATEFUL-DESIGN-HANDOFF.md` voor alle specificaties van het logo, de kleuren, typografie, componenten, zeven appschermen en interacties.
3. Gebruik `plateful-design-tokens.json` als machineleesbaar overzicht van maatvoering, assets en kleuren.
4. Open `dist/plateful-visueel-ontwerp-v2.html` om het exacte interactieve ontwerp te zien.
5. Open `dist/uitgebreid-designsystem.html` voor negen secties losse visuele componenten.
6. Behandel `dist/index.html`, `dist/styles.css`, `dist/brand-v2.css` en `dist/app.js` als de technische bron van waarheid; deze mogen niet naar eigen smaak worden herontworpen.

## Visuele identiteit

- Primair: Forest `#124E43`
- CTA: Mandarin `#F26B3A`
- Achtergrond: Oat Milk `#FBF8F1`
- Sage `#DDE9DE`
- Peach `#F9DFD1`
- Lemon `#F8EDBB`
- Displayfont: Fraunces, fallback Georgia
- Interfacefont: DM Sans, fallback system-ui
- Grote organische afgeronde kaarten, hoge contrasten, weinig invoervelden, warme editorial foodfotografie.

## Beeldmerk v2 — de gedeelde tafel

Het eerdere beeldmerk met twee golvende lijnen is vervangen. Het nieuwe teken toont één rond bord in het midden en vier abstracte plaatsen rondom. De oranje plaats geeft het verschil in smaken en voorkeuren weer, de gezamenlijke tafel verbindt. Het is bewust opgebouwd uit weinig, gevulde vormen en blijft daardoor herkenbaar op 24 px. De lettervorm van het woordmerk, het warme kleurenpalet en de appinterface zijn ongewijzigd.

- `dist/assets/plateful-icon.svg`: het hoofdbeeldmerk/app-icoon op forest-achtergrond.
- `dist/assets/plateful-symbol.svg`: variant zonder achtergrond op lichte ondergrond.
- `dist/assets/plateful-icon-mono.svg`: éénkleurige variant voor adaptieve iconen.
- `dist/assets/plateful-app-icon-1024.png`: gebruiksklare vierkante appicoon-export (1024 × 1024 pixels).
- Het woordmerk combineert het beeldmerk met **plateful.** in Fraunces, met de punt in Mandarin.
- Controleer op 24 px, 36 px en 56 px; gebruik de nieuwe icoonvorm consequent.

Dit is een originele conceptuele uitwerking, geen garantie van juridische exclusiviteit. Laat bij commerciële uitrol een beeldmerk-/merkenonderzoek uitvoeren.

## Schermen

1. **Vandaag** — één passend maaltijdvoorstel, gezinscompatibiliteit, accepteren of wisselen, Plan B.
2. **Plan B** — vier scenario's met concrete aanpassing zonder de hele week opnieuw te plannen.
3. **Gezin** — profielen, smaakvoorkeuren per ingrediënt/bereidingswijze, ouderlijke beslissingsbevoegdheid.
4. **Week** — compacte dagplanning, zicht op wie mee-eet.
5. **Boodschappen** — afvinkbare lijst per categorie.
6. **Kookstand** — eenvoudige stappen voor gezamenlijk gerecht.

## Productregels

- Medische beperkingen en allergieën zijn harde uitsluitingen en worden nooit door ouderlijke keuzes overruled.
- Voorkeuren van kinderen mogen wel invloed hebben op de maaltijd, zonder een absoluut veto te vormen.
- Ouderlijke keuze wijzigt niet de opgeslagen smaakregistratie en betekent niet dat eten wordt opgedrongen.
- Plan B past alleen de nodige onderdelen aan; geen nieuwe keuzelast creëren.
- Geen verplichte dagelijkse stemrondes of uitgebreide ratings.

## Technische notities

- Prototypebestanden in `dist/index.html`, `dist/styles.css`, `dist/app.js` en `dist/assets/`.
- `dist/plateful-visueel-ontwerp-v2.html` is de bijgewerkte zelfstandige versie met ingebedde CSS, JavaScript en beeldmateriaal. De v1-versie blijft beschikbaar ter vergelijking.
- De Google Fonts-link is optioneel; als hij offline niet kan laden, worden de fallbackfonts getoond.
- Alle interacties gebruiken fictieve gezinsleden en vooraf bepaalde demo-scenario's; er wordt geen data verstuurd.
