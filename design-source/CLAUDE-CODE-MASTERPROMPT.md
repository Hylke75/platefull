# CLAUDE CODE — MASTERPROMPT PLATEFUL

## Opdracht

Bouw het visuele Plateful-ontwerp één op één na als verzorgde, responsive appdemo. De meegeleverde bronbestanden zijn de **visuele bron van waarheid**. Dit is een reproductieopdracht, géén redesign. Behoud elke kleur, ruimte, tekst, afgeronde hoek, foto, lettertype, volgorde en interactie. Vraag alleen door als de technische doelomgeving niet duidelijk is.

## Wat je ontvangt

- dist/index.html — complete landingspagina, structuur, teksten en interactief smartphoneframe.
- dist/styles.css — oorspronkelijke volledige visuele styling, opbouw, typografie en responsive regels.
- dist/brand-v2.css — exacte verbeterde logo-integratie, brandboard en responsiviteit van v2.
- dist/app.js — alle zeven schermen, voorbeelddata, schermwissels en interacties.
- dist/assets/plateful-icon.svg — definitieve hoofdicoon.
- dist/assets/plateful-symbol.svg — transparante variant.
- dist/assets/plateful-icon-mono.svg — monochrome variant.
- dist/assets/plateful-app-icon-1024.png — PNG-appicoon 1024 px.
- dist/assets/wraps.png, roasted-bowl.png, pasta.png — exacte foodfoto's.
- dist/plateful-visueel-ontwerp-v2.html — compleet in één bestand; visuele referentie.
- dist/uitgebreid-designsystem.html — componentengalerij.
- PLATEFUL-DESIGN-HANDOFF.md — volledige visuele, functionele en technische specificatie.
- plateful-design-tokens.json — machineleesbare designwaarden.

## Verplichte werkvolgorde

1. Bekijk de meegeleverde standalone preview volledig op desktop én mobiel.
2. Lees eerst de complete HTML, beide CSS-bestanden en app.js.
3. Kopieer de structuur en stijlen letterlijk. Als je React/Next.js gebruikt, vertaal de bestaande elementen naar componenten maar wijzig geen vormgeving.
4. Plaats alle originele afbeeldingen en SVG's zonder hertekenen, filters of kleurverschuivingen.
5. Gebruik Fraunces en DM Sans in exact de meegeleverde variabelen en gewichten.
6. Maak de mobiele appnavigatie en alle state-overgangen functioneel conform app.js.
7. Controleer afstanden, letterafbreking, crop van foto's, hoeken, schaduwen en actieve staten visueel naast de standalone referentie.
8. Lever de volledige codebase op inclusief instructie om lokaal te starten en een lijstje van bewust niet-geïmplementeerde backendfunctionaliteit.

## Absolute niet-doen-lijst

- Niet herontwerpen, moderniseren, vereenvoudigen of eigen interpretaties van het logo maken.
- Niet het oude kronkelige beeldmerk terugbrengen; gebruik uitsluitend beeldmerk v2.
- Geen standaard Tailwind-componenten, emoji-avatars, stockfoto's of generieke icon packs ter vervanging van de bestaande elementen.
- Niet de kleuren afronden of nieuwe kleurwaarden verzinnen.
- Niet Fraunces vervangen door Playfair, Lora of een andere serif.
- Niet DM Sans vervangen door Inter of system-ui zolang het font geladen kan worden.
- Niet de rondingen, marges, beeldverhoudingen of letterspatiëring aanpassen 'voor de smaak'.
- Niet kunstmatig AI-functionaliteit, allergieveiligheid, een boodschappenintegratie of backend claimen. Het meegeleverde materiaal is een demo.

## Gewenste componentstructuur bij omzetting naar React

- Layout: SiteHeader, HeroSection, FeatureRow, InteractivePhone, ProductPrinciples, BrandSystem, Footer.
- PhoneShell: StatusBar, ScreenViewport, BottomNavigation, QuickViewSwitch.
- PhoneScreens: TodayScreen, PlanBScreen, FamilyScreen, TasteProfileScreen, WeekScreen, GroceryScreen, CookingScreen.
- Hergebruik: AppHeader, SubHeader, MealHeroCard, MatchPanel, FamilyAvatar, TasteChip, PrimaryButton, SecondaryButton, PlanBStrip, DatePill, FamilyPersonRow, Switch, ShoppingItem, Toast.
- Data: meals, people, scenarioOptions, scenarioSolutions, groceryGroups.
- State: behoud de overgangen uit dist/app.js. Een React-context of reducer mag, zolang gedrag en uiterlijk gelijk blijven.

## Verificatie en acceptatie

- De logo's in siteheader, appheader, footer en designsystem tonen dezelfde icoonvorm.
- Het letterlogo heeft de tekst 'plateful' in Fraunces en een mandarijnkleurige punt.
- Startscherm toont het wraps-gerecht, de gezinsscore, de dagpillen en alle knoppen.
- 'Ander idee' wisselt cyclisch wraps → pasta → rijstbowl → wraps.
- 'Dit eten we' toont de bevestigingskaart en knop naar de kookstand.
- Plan B kent vier scenario's en werkt na 'Vind mijn plan B' naar een concrete oplossing; toepassen keert terug naar het hoofdscherm.
- Gezinsprofielen tonen vier personen. Voor kinderen is ouderlijke regie in/uit te schakelen; medische uitsluitingen blijven onaantastbaar.
- Boodschappen zijn per categorie afvinkbaar en de voortgang loopt mee.
- De bottom navigation en snelle voorbeeldknoppen wisselen de juiste schermen.
- Bij browserbreedtes rond 1440, 1024, 768 en 390 px verschijnen geen ongewenste horizontale scroll, overlappende teksten of afgekapt icoon.
- Vergelijk de echte output met de v2-preview. Corrigeer zelf zichtbaar verschil vóór oplevering.

## Wat je oplevert

Een werkende responsive frontend en bronbestanden met maximale visuele overeenkomst. Vermeld expliciet welke functies demo-data gebruiken. Pas geen productinhoud, stijl of merkidentiteit aan zonder mijn toestemming.
