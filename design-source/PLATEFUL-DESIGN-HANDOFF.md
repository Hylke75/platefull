# Plateful — Complete designhandoff v2.0

Datum: 25 oktober 2026. Taal van interface: Nederlands. Context: een warme, slimme en sociale gezinsmaaltijdassistent.

## 1. Creatieve richting

**Merkbelofte:** Iedereen anders. Samen aan tafel.

De interface combineert een premium foodmagazine met een toegankelijke gezinsassistent. Niet zakelijk, technisch of klinisch. Ze voelt warm, rustig, vrolijk, behulpzaam en betrouwbaar. Een maaltijdvoorstel moet centraal staan; de interface neemt denkwerk weg.

**Visuele uitgangspunten:** royale witruimte, grote vriendelijke ronde hoeken, scherpe donkergroene typografie, beperkte kleuraccenten, hoogwaardige echte foodfotografie, heel weinig visuele ruis, menselijke teksten, subtiele feedback.

**Exacte basis:** de combinatie van dist/index.html, dist/styles.css, dist/brand-v2.css en dist/app.js. Deze bestanden zijn leidend boven elke beschrijvende interpretatie in dit document.

## 2. Logo en merkgebruik

**Definitief merk v2: 'de gedeelde tafel'.** Het ronde bord staat voor één gezamenlijke maaltijd. Vier zitplaatsen verwijzen naar verschillende gezinsleden/smaken; één oranje plaats is de eigen nuance. Het grafische teken gebruikt een donkergroen vlak, crèmekleurige vormen en één oranje accent. Het oude kronkelsymbool is vervallen.

Bestanden:

| Gebruik | Asset | Formaat |
| --- | --- | --- |
| Standaard appicoon, siteheader, telefoonheader en footer | dist/assets/plateful-icon.svg | Vector, 48 × 48 viewBox |
| Los teken op lichte ondergrond | dist/assets/plateful-symbol.svg | Transparante vector |
| Monochrome toepassing | dist/assets/plateful-icon-mono.svg | Vector |
| Grote appicoon-export | dist/assets/plateful-app-icon-1024.png | 1024 × 1024 px |

**Woordmerk:** 'plateful' in Fraunces 700, forest-kleur, gevolgd door een punt in Mandarin. De combinatie heeft op de site 11 px tussenruimte en een icoon van 40 × 40 px. Mobiel wordt dit 34 × 34 px. In de appheader is het icoon 22 × 22 px.

**Appicoonkleuren:** Forest #124E43, Ivory #FFF7E8, Mandarin #F26B3A. Contrast van de relevante vormkleuren ten opzichte van Forest: Ivory circa 8,98:1 en Mandarin circa 3,16:1.

**Logo niet aanpassen:** geen illustratieve bordjes, lepels, smileys of andere vormen toevoegen; niet strekken, draaien of schaduwen toevoegen buiten de expliciete styles.

## 3. Kleursysteem

| Token | HEX | Toepassing |
| --- | --- | --- |
| forest | #124E43 | Hoofdkleur logo, primaire knoppen, actieve navigatie |
| forest-dark | #0A332D | Grote koppen en sterke contrasten |
| orange / Mandarin | #F26B3A | CTA-accenten, cursieve koppen, logo-punt |
| oat / Oat Milk | #FBF8F1 | Achtergrond van de landingspagina |
| sage | #DDE9DE | Zachte groene panelen |
| peach | #F9DFD1 | Warme secundaire kaarten |
| lemon | #F8EDBB | Gele secundaire kaarten |
| ink | #223E35 | Standaard bodytekst |
| subtle | #77857B | Secundaire tekst |
| line | #EBEBE2 | Subtiele scheidingslijnen |

Additionele exacte componentkleuren staan in de bron-CSS, waaronder #FFFCF6 voor het telefoonscherm, #EDF3E8 voor het matchpanel en #E9F0E6 voor de nieuwe identity-showcase.

**Kleurverdeling:** op gewone schermen overheersen crème/wit en groen. Oranje is spaarzaam en doelgericht; geel en perzik alleen om verwante onderdelen herkenbaar te groeperen.

## 4. Typografie

- **Display:** Fraunces (serif) met geselecteerde zachte optical/soft instellingen. CSS-var: --display.
- **Interface/body:** DM Sans 400/500/600/700/800. CSS-var: --body.
- **Import via Google Fonts:** de exacte URL staat in dist/index.html; neem deze letterlijk over.
- **Hero desktop:** clamp(54px, 5.8vw, 88px), line-height 1.05, letter-spacing -3.8px, gewicht 600.
- **Sectionkop:** clamp(40px, 4.3vw, 62px), line-height 1.12, letter-spacing -2.4px.
- **Appscherm kop:** 29px Fraunces, line-height 1.12.
- **Appwoordmerk:** 23px Fraunces, gewicht 700.
- **Body intro:** 18px DM Sans, line-height 1.75.
- **Knoppen:** 12–14px DM Sans, gewicht 800.
- **Labels en 'kickers':** 10–11px DM Sans, gewicht 800, letter-spacing 1.2–1.7px, uppercase.
- **Mobiele hero:** clamp(43px, 9.5vw, 65px).

*Belangrijk:* titels met cursieve delen zijn Fraunces italic en Mandarin. Gebruik geen gewone sans italic en herschrijf de tekst niet om de regelval te beïnvloeden.

## 5. Webpresentatie: exacte layout

**Canvas:** maximal breedte 1640 px, achtergond Oat Milk. Dekoratieve omgevingsvormen als zeer zachte blur.

**Header:** horizontaal merk links, conceptpill en 'Designsystem' rechts, met horizontale ruimte clamp(24px, 5.4vw, 90px). Op telefoon verdwijnt de versiepil.

**Hero:** twee kolommen: tekst links en een mintgroen vlak met interactieve telefoon rechts. De hero heeft een minimumhoogte van 830 px en 36 px kolomruimte. Links een kleine groene eyebrow, grote dubbele kop, intro, drie rijen met icoon, CTA en gezinsavatars. Rechts een telefoon met decoratieve cirkels en een tabstrip onder het toestel.

**Telefoon:** breedte 358 px, hoogte 690 px, rand 7 px in donker forest, radius 46 px, off-white scherm #FFFCF6. Bovenin statusbar 32 px; onderin navigatie 66 px. De content scrollt binnen het toestel en de navigatie blijft op haar plek.

**Principes:** drie gelijke kaarten met ronding 30 px; zachte groene, perzik en gele achtergrond. Grote editorial koppen en compacte bodytekst.

**Merkblok:** nieuw v2-drieluik binnen grote sage-achtige card. Links de merkgedachte, rechts icoon, woordmerk en 24/36/56 px-proef. Daarna zes kleurvlakken en een typografiekaart.

**Footer:** logo links, datum in het midden, scrolllink rechts.

## 6. Responsive logica

| Viewport | Layoutgedrag |
| --- | --- |
| Boven 1250 px | Brede twee-koloms hero, royale presentatie |
| 1051–1250 px | Telefoonkolom circa 510 px, gereduceerde titel |
| Tot 1050 px | Hero in één kolom, mobiel toestel gecentreerd, stylecards in één kolom |
| Tot 700 px | Header compacter, versiepil verborgen, hero 43–65 px, principekaarten onder elkaar, kleuren in twee kolommen |
| Tot 390 px | Telefoon iets lager (650 px), compactere padding |

Gebruik exact de CSS-mediaqueries en volgorde. Vermijd horizontale overflow, vooral bij de telefooncontainer en het merkblok.

## 7. Alle schermen in de telefoon

| Scherm | Kerninhoud | Belangrijkste acties |
| --- | --- | --- |
| Vandaag | Begroeting, datumrij, fotogerecht, matchpanel, gezinsprofielen | Bevestigen, ander gerecht, Plan B |
| Plan B | Oranje intro, vier scenariokaarten, vrij tekstveld, concrete oplossing | Scenario kiezen, plan berekenen, plan toepassen |
| Gezin | Familiekaart en vier gezinsprofielen | Profiel openen |
| Persoonlijk smaakprofiel | Voorkeuren, 'heerlijk', 'liever niet', 'echt niet lekker', dieet/allergieën | Voor kinderen ouderlijke regie schakelen |
| Week | Dagpillen, vier maaltijdkaarten, foto's | Terug vandaag, Plan B |
| Boodschappen | Groepen groente, voorraad, koeling, voortgang | Afvinken |
| Kookstand | Fotogerecht, drie stappen, timers | Terug naar vandaag |

## 8. Herbruikbare componenten met visuele eigenschappen

| Component | Bronselector | Ontwerpregel |
| --- | --- | --- |
| Merkheader | .brand / .brand-symbol | Icoon + Fraunces-woordmerk |
| Primaire webknop | .primary-cta | Forest, wit, capsule 999px, icooncirkel rechts |
| Functierij | .feature-lines / .feature-glyph | 43px rond icoonvlak en dubbele tekstregel |
| Telefoonframe | .phone / .screen-scroll | 358 × 690, radius 46, interne scroll |
| Navigatie | .phone-nav / .nav-button | 66px hoog, vier tabbladen, actieve accentkleur |
| Appheader | .app-header / .app-brand | 22px icoon, woordmerk en avatar |
| Titel | .app-title | Fraunces 29px en forest-dark |
| Datum | .day-pill | 30 × 34px, gekozen dag forest + wit |
| Fotogerecht | .dinner-hero / .dinner-overlay | 233px hoog, beeld cover, donkere gradient-overlay |
| Matchscore | .match-panel / .match-badge | Lichtgroen vlak en groene succesbadge |
| Actierij | .action-row / .btn | Duidelijke primaire en secundaire knop |
| Plan B | .planb-strip | Perzik achtergrond en aparte pijlcirkel |
| Scenario | .scenario / .selected | Vier cards; geselecteerd met oranje rand |
| Profielrij | .family-person | Witte kaart, avatar, naam, status en pijl |
| Smaaklabel | .taste-status | Groen, perzik, geel of rood passend bij status |
| Kinderswitch | .parent-toggle / .switch | Zachte perziktint, visuele aan/uit-stand |
| Weekrij | .week-item / .week-image | Witte card met foto 75 × 62 px |
| Boodschappenrij | .shopping-item | Checkbox, titel, hoeveelheid rechts, checked state |
| Kookstap | .recipe-step | Witte kaart, teller, kop, toelichting, tijd |
| Feedback | .toast | Forest overlay, verschijnt ongeveer 3 seconden |
| Merkgalerij | .identity-showcase / .identity-preview | Sage buitenvlak, icon/wordmark/kleine maten |

De volledige component-CSS staat letterlijk in dist/styles.css en dist/brand-v2.css. Gebruik dus deze selectors en code als fundament; de tabel is een index.

## 9. Data en demo-interacties

**Voorbeeldgezin:** Emma, Ruben, Sam (15) en Lina (9). De voorbeelddata staan in dist/app.js.

**Maaltijden:** wraps, kleurrijke rijstbowl, romige tomatenpasta. Bij de knop 'Ander idee' wordt de volgende maaltijd getoond in een vaste cyclus.

**Plan B-scenario's:** minder tijd, iemand eet niet mee, iets ontbreekt, kind lust het niet. Elke situatie toont een reeds uitgewerkte oplossing, plus een knop om het aangepaste plan in het startscherm door te voeren.

**Smaakstatussen:** like, dislike, care en strict. Allergieën en medisch noodzakelijke dieetbeperkingen hebben altijd de status 'strict'. Ouderlijke regie kan een smaakvoorkeur voor de maaltijdkeuze passeren, maar **nooit** een allergie, medische uitsluiting of dieetafspraak.

**Boodschappen:** afvinkbaar, gegroepeerd, met een voortgangsteller. Voorbeelditems zijn expliciet demo-data.

**Statusmelding:** toast binnen het telefoonframe bij een bevestiging, wijziging of keuze. De voorbeeldinteractie duurt circa 3 seconden.

**Niet geïmplementeerd:** echte AI, gebruikersaccounts, databeheer, agenda, echte voorraadherkenning, boodschappenretailer-koppelingen en allergieverificatie. Claim deze niet.

## 10. Fotografische assets

| Bestand | Originele resolutie | Primair gebruik |
| --- | --- | --- |
| wraps.png | 1374 × 1145 | Vandaag / maaltijdhero |
| roasted-bowl.png | 1254 × 1254 | Week / wisselgerechten |
| pasta.png | 1254 × 1254 | Week / wisselgerechten |

Gebruik object-fit: cover waar in de CSS gedefinieerd en behoud de originele crop. Geen filters toevoegen.

## 11. Technische en visuele acceptatie

1. Desktop-overzicht, mobiele webversie en alle zeven telefoonweergaven moeten herkenbaar overeenkomen met de zelfstandige v2-preview.
2. Alle originele teksten en afbeeldingen blijven aanwezig.
3. Geen fontsubstituties of gewijzigde kleurwaarden.
4. Het nieuwe logo staat overal correct; het oude symbool nergens.
5. Knoppen, tabs, switch, checkboxes en Plan B werken volgens de demoflow.
6. De UI blijft bruikbaar met toetsenbordfocus; knoppen hebben toegankelijke labels waar aanwezig.
7. Test alle genoemde breakpoints en laat geen inhoud buiten de viewport vallen.
8. Check console op JavaScript-fouten en afbeeldingen op 404.
9. Houd code overzichtelijk maar wijzig geen gerenderde geometrie voor refactoring.
10. Pas echte backendlogica pas in een vervolgfase toe, met aparte expliciete functionele specificatie.

## 12. Wat moet Claude Code inleveren?

- Een direct lokaal startbaar frontendproject.
- De exacte designsystemwaarden en originele icon-/beeldbestanden.
- Components met namen overeenkomstig de masterprompt.
- Werkende demoflow, inclusief de juiste tekst, active states en feedback.
- Een korte lijst van eventuele nog openstaande functionele keuzes, los van de visuele replica.

**Samenvatting:** niet de getoonde sfeer interpreteren, maar de broncode en de precieze vorm één op één reproduceren.
