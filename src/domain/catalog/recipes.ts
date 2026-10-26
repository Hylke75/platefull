// Gecureerde receptcatalogus (F-013): 30 volledig gestructureerde gezinsrecepten, 4 personen.
// Bron: eigen redactie Plateful (geen recepten van derden overgenomen, §12.2.5).
// Alleen de drie gerechten uit het designsystem hebben een foto; de rest gebruikt de beeldloze kaart.
import type { Equipment, Preparation, Recipe, RecipeComponent, RecipeIngredient, RecipeStepDef, RecipeVariant, Unit, VariantChange } from '../types';

const SOURCE = 'Plateful-redactie (eigen recept, concept oktober 2026)';

type Flag = 'opt' | 'sep' | RecipeComponent | Preparation;
function i(ingredientId: string, quantity: number, unit: Unit, ...flags: Flag[]): RecipeIngredient {
  const component = (flags.find((f) => ['base', 'sauce', 'topping', 'side'].includes(f)) ?? 'base') as RecipeComponent;
  const preparation = (flags.find((f) => ['raw', 'cooked', 'sauce', 'baked', 'fried', 'any'].includes(f)) ?? 'cooked') as Preparation;
  return { ingredientId, quantity, unit, optional: flags.includes('opt'), servedSeparately: flags.includes('sep'), component, preparation };
}
function s(title: string, body: string, minutes: number | null = null): RecipeStepDef {
  return { title, body, minutes };
}
function v(recipeId: string, id: string, name: string, changes: VariantChange[], reviewed = true): RecipeVariant {
  return { id: `${recipeId}--${id}`, recipeId, name, changes, safetyReviewStatus: reviewed ? 'reviewed' : 'unreviewed' };
}

interface Def {
  id: string; name: string; image?: string; active: number; total: number; equipment?: Equipment[]; difficulty?: 'easy' | 'medium';
  cuisine: string; protein: string; tags: string[]; ingredients: RecipeIngredient[]; steps: RecipeStepDef[];
  variants?: (id: string) => RecipeVariant[];
}
function r(d: Def): Recipe {
  return {
    id: d.id, ownerHouseholdId: null, name: d.name, image: d.image ?? '', activeMinutes: d.active, totalMinutes: d.total,
    servings: 4, equipment: d.equipment ?? ['stove'], difficulty: d.difficulty ?? 'easy', cuisine: d.cuisine, mainProtein: d.protein,
    tags: d.tags, ingredients: d.ingredients, steps: d.steps, variants: d.variants ? d.variants(d.id) : [], source: SOURCE, reviewStatus: 'reviewed',
  };
}

export const RECIPES: Recipe[] = [
  r({
    id: 'wraps-voor-iedereen', name: 'Wraps voor iedereen', image: '/assets/wraps.png', active: 15, total: 20,
    cuisine: 'mexicaans', protein: 'bonen', tags: ['wraps', 'vegetarisch', 'samenstellen'],
    ingredients: [
      i('wraps', 8, 'stuk'), i('paprika', 2, 'stuk'), i('zwarte-bonen', 1, 'blik'), i('mais', 1, 'blik'),
      i('avocado', 1, 'stuk', 'topping', 'raw', 'sep'), i('limoen', 1, 'stuk', 'topping', 'raw', 'sep'),
      i('tomaat', 150, 'g', 'topping', 'raw', 'sep'), i('koriander', 10, 'g', 'topping', 'raw', 'sep', 'opt'),
      i('yoghurtsaus', 1, 'bakje', 'sauce', 'sep'),
    ],
    steps: [
      s('Alles klaarzetten', 'Leg de groente, bonen en wraps klaar. Zet ingrediënten die niet iedereen lust alvast in aparte bakjes.', 5),
      s('Opwarmen & bakken', 'Warm de wraps op en bak de paprika. Voeg alleen de smaakmakers toe die iedereen wil.', 10),
      s('Samenstellen maar', 'Zet alles op tafel. Iedereen maakt zijn eigen wrap, met de favoriete toppings.', 5),
    ],
    variants: (id) => [
      v(id, 'kikkererwten', 'Kikkererwten in plaats van zwarte bonen', [{ op: 'replace', from: 'zwarte-bonen', to: 'kikkererwten', quantity: 1, unit: 'blik' }]),
      v(id, 'snel', 'Snelle versie', [{ op: 'time', deltaMinutes: -5, note: 'Bak de paprika kort, gebruik de bonen direct en zet alle toppings apart op tafel. De oorspronkelijke boodschappen blijven bruikbaar.' }]),
      v(id, 'zonder-yoghurt', 'Zonder yoghurtsaus', [{ op: 'remove', ingredientId: 'yoghurtsaus' }]),
    ],
  }),
  r({
    id: 'kleurrijke-rijstbowl', name: 'Kleurrijke rijstbowl', image: '/assets/roasted-bowl.png', active: 15, total: 30, equipment: ['oven', 'stove'],
    cuisine: 'bowl', protein: 'peulvruchten', tags: ['bowl', 'vegetarisch', 'oven'],
    ingredients: [
      i('rijst', 300, 'g'), i('zoete-aardappel', 500, 'g', 'baked'), i('broccoli', 300, 'g', 'baked'), i('courgette', 1, 'stuk', 'baked'),
      i('kikkererwten', 1, 'blik', 'baked'), i('olijfolie', 3, 'el'), i('griekse-yoghurt', 150, 'g', 'sauce', 'sep'),
      i('sesamzaad', 10, 'g', 'topping', 'sep', 'opt'),
    ],
    steps: [
      s('Groente de oven in', 'Verwarm de oven op 210 °C. Snijd zoete aardappel, broccoli en courgette in stukken, meng met olie en kikkererwten en rooster 25 minuten.', 5),
      s('Rijst koken', 'Kook de rijst volgens de verpakking.', 15),
      s('Bowls vullen', 'Iedereen schept zelf rijst en de favoriete groenten. Yoghurt en sesam staan apart op tafel.', 5),
    ],
    variants: (id) => [
      v(id, 'zonder-sesam', 'Zonder sesam', [{ op: 'remove', ingredientId: 'sesamzaad' }]),
      v(id, 'broccoli-apart', 'Broccoli apart', [{ op: 'serve_separately', ingredientId: 'broccoli' }]),
    ],
  }),
  r({
    id: 'romige-tomatenpasta', name: 'Romige tomatenpasta', image: '/assets/pasta.png', active: 15, total: 25,
    cuisine: 'italiaans', protein: 'zuivel', tags: ['pasta', 'vegetarisch'],
    ingredients: [
      i('pasta', 400, 'g'), i('passata', 500, 'ml', 'sauce'), i('ui', 1, 'stuk'), i('knoflook', 2, 'teen'), i('kookroom', 125, 'ml', 'sauce'),
      i('olijfolie', 1, 'el'), i('basilicum', 10, 'g', 'topping', 'raw', 'opt'), i('geraspte-kaas', 75, 'g', 'topping', 'sep', 'opt'),
    ],
    steps: [
      s('Saus maken', 'Fruit ui en knoflook in olie, voeg passata toe en laat 10 minuten zachtjes koken.', 12),
      s('Pasta koken', 'Kook ondertussen de pasta beetgaar.', 10),
      s('Romig maken', 'Roer de room door de saus en meng met de pasta. Basilicum en kaas apart op tafel.', 3),
    ],
    variants: (id) => [
      v(id, 'zonder-room', 'Zonder room', [{ op: 'remove', ingredientId: 'kookroom' }]),
      v(id, 'zonder-kaas', 'Zonder kaas', [{ op: 'remove', ingredientId: 'geraspte-kaas' }]),
    ],
  }),
  r({
    id: 'boerenkool-stamppot', name: 'Boerenkoolstamppot met rookworst', active: 15, total: 35,
    cuisine: 'hollands', protein: 'varken', tags: ['stamppot', 'winter'],
    ingredients: [i('aardappel', 1200, 'g'), i('boerenkool', 500, 'g'), i('rookworst', 1, 'stuk', 'side'), i('melk', 150, 'ml'), i('boter', 25, 'g')],
    steps: [
      s('Koken', 'Kook de aardappelen 20 minuten, met de boerenkool er de laatste 10 minuten bovenop.', 20),
      s('Worst verwarmen', 'Verwarm de rookworst volgens de verpakking.', 10),
      s('Stampen', 'Giet af, stamp fijn met melk en boter. Rookworst apart in plakjes.', 5),
    ],
    variants: (id) => [v(id, 'vega', 'Met vegetarische rookworst', [{ op: 'replace', from: 'rookworst', to: 'vega-rookworst', quantity: 1, unit: 'stuk' }])],
  }),
  r({
    id: 'hutspot-gehaktballen', name: 'Hutspot met gehaktballetjes', active: 20, total: 40,
    cuisine: 'hollands', protein: 'rund', tags: ['stamppot'],
    ingredients: [i('aardappel', 1000, 'g'), i('wortel', 750, 'g'), i('ui', 2, 'stuk'), i('rundergehakt', 400, 'g', 'side'), i('boter', 25, 'g')],
    steps: [
      s('Balletjes draaien', 'Kruid het gehakt en draai er kleine balletjes van. Bak ze rondom bruin.', 15),
      s('Groente koken', 'Kook aardappel, wortel en ui samen in 20 minuten gaar.', 20),
      s('Stampen', 'Stamp grof met boter en serveer met de balletjes.', 5),
    ],
  }),
  r({
    id: 'kip-kerrie', name: 'Milde kipkerrie met rijst', active: 20, total: 30,
    cuisine: 'aziatisch', protein: 'kip', tags: ['curry', 'rijst'],
    ingredients: [i('kipfilet', 500, 'g'), i('rijst', 300, 'g'), i('kerriepasta', 40, 'g', 'sauce'), i('kokosmelk', 1, 'blik', 'sauce'), i('paprika', 1, 'stuk'), i('sperziebonen', 250, 'g'), i('koriander', 10, 'g', 'topping', 'raw', 'sep', 'opt')],
    steps: [
      s('Rijst opzetten', 'Kook de rijst volgens de verpakking.', 15),
      s('Kip bakken', 'Bak de kip in blokjes met de kerriepasta.', 8),
      s('Laten pruttelen', 'Voeg kokosmelk, paprika en boontjes toe en laat 10 minuten zachtjes koken.', 10),
    ],
    variants: (id) => [v(id, 'tofu', 'Met tofu in plaats van kip', [{ op: 'replace', from: 'kipfilet', to: 'tofu', quantity: 400, unit: 'g' }])],
  }),
  r({
    id: 'vissticks-doperwten', name: 'Vissticks met puree en doperwten', active: 15, total: 25,
    cuisine: 'hollands', protein: 'vis', tags: ['vis', 'kindvriendelijk'],
    ingredients: [i('vissticks', 12, 'stuk'), i('aardappel', 1000, 'g'), i('doperwten', 400, 'g'), i('melk', 150, 'ml'), i('boter', 25, 'g'), i('citroen', 1, 'stuk', 'topping', 'sep', 'opt')],
    steps: [
      s('Aardappels koken', 'Kook de aardappels in 20 minuten gaar.', 20),
      s('Vissticks bakken', 'Bak de vissticks goudbruin in de pan of airfryer.', 10),
      s('Afmaken', 'Maak puree met melk en boter, verwarm de doperwten en serveer.', 5),
    ],
  }),
  r({
    id: 'spinazie-lasagne', name: 'Lasagne met spinazie en ricotta-saus', active: 25, total: 60, equipment: ['oven', 'stove'], difficulty: 'medium',
    cuisine: 'italiaans', protein: 'zuivel', tags: ['oven', 'vegetarisch', 'pasta'],
    ingredients: [i('lasagnebladen', 250, 'g'), i('spinazie', 600, 'g'), i('passata', 700, 'ml', 'sauce'), i('ui', 1, 'stuk'), i('knoflook', 2, 'teen'), i('mozzarella', 250, 'g'), i('geraspte-kaas', 75, 'g')],
    steps: [
      s('Saus', 'Fruit ui en knoflook, voeg passata toe en laat 10 minuten koken. Slink de spinazie.', 15),
      s('Opbouwen', 'Bouw laagjes van saus, bladen, spinazie en mozzarella. Eindig met kaas.', 10),
      s('Bakken', 'Bak 35 minuten in een oven van 200 °C.', 35),
    ],
  }),
  r({
    id: 'nasi-goreng', name: 'Nasi goreng met gebakken ei', active: 20, total: 30,
    cuisine: 'indonesisch', protein: 'ei', tags: ['rijst', 'vegetarisch'],
    ingredients: [i('rijst', 300, 'g'), i('ui', 1, 'stuk'), i('knoflook', 2, 'teen'), i('wortel', 200, 'g'), i('prei', 200, 'g'), i('ketjap', 3, 'el', 'sauce'), i('eieren', 4, 'stuk', 'topping', 'fried', 'sep'), i('komkommer', 1, 'stuk', 'side', 'raw', 'sep')],
    steps: [
      s('Rijst koken', 'Kook de rijst (of gebruik rijst van gisteren) en laat afkoelen.', 15),
      s('Wokken', 'Bak ui, knoflook, wortel en prei. Voeg rijst en ketjap toe.', 10),
      s('Ei erbij', 'Bak de eieren en serveer apart met komkommer.', 5),
    ],
    variants: (id) => [v(id, 'zonder-ei', 'Zonder ei', [{ op: 'remove', ingredientId: 'eieren' }])],
  }),
  r({
    id: 'pizza-zelf-beleggen', name: 'Pizza zelf beleggen', active: 20, total: 35, equipment: ['oven'],
    cuisine: 'italiaans', protein: 'zuivel', tags: ['pizza', 'samenstellen', 'vegetarisch'],
    ingredients: [i('pizzadeeg', 2, 'stuk'), i('passata', 250, 'ml', 'sauce'), i('mozzarella', 250, 'g'), i('paprika', 1, 'stuk', 'topping', 'sep'), i('champignons', 150, 'g', 'topping', 'sep', 'opt'), i('mais', 1, 'blik', 'topping', 'sep', 'opt'), i('basilicum', 10, 'g', 'topping', 'raw', 'sep', 'opt')],
    steps: [
      s('Klaarzetten', 'Verwarm de oven op 220 °C. Zet alle toppings in bakjes.', 5),
      s('Beleggen', 'Iedereen belegt een eigen stuk pizza.', 10),
      s('Bakken', 'Bak 15 minuten tot de bodem knapperig is.', 15),
    ],
  }),
  r({
    id: 'groentesoep-brood', name: 'Groentesoep met brood', active: 15, total: 35,
    cuisine: 'hollands', protein: 'groente', tags: ['soep', 'vegetarisch'],
    ingredients: [i('groentebouillon', 1500, 'ml'), i('wortel', 300, 'g'), i('prei', 200, 'g'), i('bleekselderij', 150, 'g'), i('aardappel', 300, 'g'), i('brood', 1, 'stuk', 'side', 'sep')],
    steps: [
      s('Snijden', 'Snijd alle groente in kleine stukjes.', 10),
      s('Koken', 'Breng de bouillon aan de kook en laat de groente 20 minuten koken.', 20),
      s('Serveren', 'Serveer met brood.', 5),
    ],
  }),
  r({
    id: 'shakshuka', name: 'Shakshuka met brood', active: 15, total: 25,
    cuisine: 'midden-oosters', protein: 'ei', tags: ['ei', 'vegetarisch'],
    ingredients: [i('tomatenblokjes', 2, 'blik', 'sauce'), i('paprika', 2, 'stuk'), i('ui', 1, 'stuk'), i('knoflook', 2, 'teen'), i('komijn', 1, 'tl'), i('eieren', 6, 'stuk'), i('brood', 1, 'stuk', 'side', 'sep'), i('peterselie', 10, 'g', 'topping', 'raw', 'sep', 'opt')],
    steps: [
      s('Saus', 'Bak ui, knoflook en paprika, voeg tomaat en komijn toe en laat 10 minuten pruttelen.', 12),
      s('Eieren', 'Maak kuiltjes en breek de eieren erin. Deksel erop, 8 minuten garen.', 8),
      s('Serveren', 'Serveer met brood en peterselie apart.', 2),
    ],
  }),
  r({
    id: 'zalm-krieltjes', name: 'Zalm uit de oven met krieltjes', active: 15, total: 35, equipment: ['oven', 'stove'],
    cuisine: 'hollands', protein: 'vis', tags: ['vis', 'oven'],
    ingredients: [i('zalm', 500, 'g', 'baked'), i('krieltjes', 800, 'g', 'baked'), i('sperziebonen', 400, 'g'), i('olijfolie', 2, 'el'), i('citroen', 1, 'stuk', 'topping', 'sep')],
    steps: [
      s('Krieltjes', 'Rooster de krieltjes met olie 30 minuten op 200 °C.', 5),
      s('Zalm erbij', 'Leg de zalm de laatste 15 minuten bij de krieltjes.', 15),
      s('Boontjes', 'Kook de sperziebonen 8 minuten.', 8),
    ],
  }),
  r({
    id: 'chili-sin-carne', name: 'Chili sin carne met rijst', active: 20, total: 35,
    cuisine: 'mexicaans', protein: 'bonen', tags: ['vegetarisch', 'rijst'],
    ingredients: [i('kidneybonen', 2, 'blik'), i('zwarte-bonen', 1, 'blik'), i('tomatenblokjes', 2, 'blik', 'sauce'), i('ui', 1, 'stuk'), i('paprika', 2, 'stuk'), i('mais', 1, 'blik'), i('rijst', 300, 'g'), i('griekse-yoghurt', 150, 'g', 'topping', 'sep', 'opt')],
    steps: [
      s('Basis', 'Bak ui en paprika, voeg tomaat, bonen en mais toe.', 10),
      s('Pruttelen', 'Laat 20 minuten zachtjes koken. Kook ondertussen de rijst.', 20),
      s('Serveren', 'Serveer met yoghurt apart.', 3),
    ],
  }),
  r({
    id: 'pasta-pesto-kip', name: 'Pasta pesto met kip en courgette', active: 20, total: 25,
    cuisine: 'italiaans', protein: 'kip', tags: ['pasta'],
    ingredients: [i('pasta', 400, 'g'), i('pesto', 150, 'g', 'sauce'), i('kipfilet', 400, 'g'), i('courgette', 1, 'stuk'), i('tomaat', 200, 'g', 'topping', 'raw', 'sep')],
    steps: [
      s('Pasta', 'Kook de pasta beetgaar.', 10),
      s('Kip en groente', 'Bak de kip in reepjes en daarna de courgette.', 12),
      s('Mengen', 'Meng alles met de pesto. Tomaatjes apart.', 3),
    ],
  }),
  r({
    id: 'couscous-feta', name: 'Couscous met geroosterde groente en feta', active: 15, total: 30, equipment: ['oven'],
    cuisine: 'midden-oosters', protein: 'zuivel', tags: ['vegetarisch', 'oven'],
    ingredients: [i('couscous', 300, 'g'), i('aubergine', 1, 'stuk', 'baked'), i('courgette', 1, 'stuk', 'baked'), i('paprika', 2, 'stuk', 'baked'), i('rode-ui', 1, 'stuk', 'baked'), i('olijfolie', 3, 'el'), i('feta', 150, 'g', 'topping', 'sep')],
    steps: [
      s('Roosteren', 'Rooster de groente 25 minuten op 210 °C.', 5),
      s('Couscous', 'Wel de couscous in heet water.', 5),
      s('Serveren', 'Meng groente en couscous. Feta apart.', 3),
    ],
  }),
  r({
    id: 'gnocchi-tomaat', name: 'Gnocchi met tomatensaus en spinazie', active: 15, total: 20,
    cuisine: 'italiaans', protein: 'groente', tags: ['vegetarisch', 'snel'],
    ingredients: [i('gnocchi', 800, 'g'), i('passata', 500, 'ml', 'sauce'), i('spinazie', 300, 'g'), i('knoflook', 2, 'teen'), i('geraspte-kaas', 50, 'g', 'topping', 'sep', 'opt')],
    steps: [
      s('Saus', 'Fruit de knoflook, voeg passata toe en laat 8 minuten koken.', 8),
      s('Gnocchi', 'Kook of bak de gnocchi.', 5),
      s('Afmaken', 'Roer spinazie en gnocchi door de saus. Kaas apart.', 3),
    ],
  }),
  r({
    id: 'erwtensoep', name: 'Erwtensoep', active: 25, total: 120, difficulty: 'medium',
    cuisine: 'hollands', protein: 'varken', tags: ['soep', 'winter'],
    ingredients: [i('spliterwten', 500, 'g'), i('groentebouillon', 2000, 'ml'), i('wortel', 200, 'g'), i('prei', 200, 'g'), i('bleekselderij', 150, 'g'), i('aardappel', 300, 'g'), i('rookworst', 1, 'stuk', 'side'), i('brood', 1, 'stuk', 'side', 'sep')],
    steps: [
      s('Erwten koken', 'Kook de spliterwten 60 minuten in de bouillon.', 60),
      s('Groente', 'Voeg de gesneden groente toe en kook nog 40 minuten.', 40),
      s('Worst', 'Verwarm de rookworst en serveer in plakjes.', 10),
    ],
    variants: (id) => [v(id, 'vega', 'Met vegetarische rookworst', [{ op: 'replace', from: 'rookworst', to: 'vega-rookworst', quantity: 1, unit: 'stuk' }])],
  }),
  r({
    id: 'bami-kip', name: 'Bami met kip', active: 20, total: 30,
    cuisine: 'indonesisch', protein: 'kip', tags: ['noedels'],
    ingredients: [i('mie', 250, 'g'), i('kipdijfilet', 400, 'g'), i('wortel', 200, 'g'), i('prei', 200, 'g'), i('tauge', 200, 'g'), i('ketjap', 3, 'el', 'sauce'), i('pindasaus', 150, 'ml', 'sauce', 'sep', 'opt')],
    steps: [
      s('Mie koken', 'Kook de mie volgens de verpakking.', 5),
      s('Wokken', 'Bak de kip en daarna de groente.', 15),
      s('Mengen', 'Meng de mie erdoor met ketjap. Satésaus apart.', 5),
    ],
    variants: (id) => [v(id, 'zonder-satesaus', 'Zonder satésaus', [{ op: 'remove', ingredientId: 'pindasaus' }])],
  }),
  r({
    id: 'tacos-gehakt', name: 'Tacoavond met gehakt', active: 20, total: 25,
    cuisine: 'mexicaans', protein: 'rund', tags: ['samenstellen'],
    ingredients: [i('tacoschelpen', 12, 'stuk'), i('rundergehakt', 400, 'g'), i('paprikapoeder', 1, 'tl'), i('sla', 100, 'g', 'topping', 'raw', 'sep'), i('tomaat', 200, 'g', 'topping', 'raw', 'sep'), i('geraspte-kaas', 100, 'g', 'topping', 'sep'), i('mais', 1, 'blik', 'topping', 'sep')],
    steps: [
      s('Gehakt', 'Bak het gehakt rul met paprikapoeder.', 10),
      s('Toppings', 'Zet alle toppings in bakjes.', 8),
      s('Samenstellen', 'Verwarm de schelpen en iedereen vult zelf.', 5),
    ],
    variants: (id) => [v(id, 'bonen', 'Met zwarte bonen in plaats van gehakt', [{ op: 'replace', from: 'rundergehakt', to: 'zwarte-bonen', quantity: 2, unit: 'blik' }])],
  }),
  r({
    id: 'kipsate-rijst', name: 'Kipsaté met rijst en komkommer', active: 20, total: 30,
    cuisine: 'indonesisch', protein: 'kip', tags: ['rijst'],
    ingredients: [i('kipdijfilet', 500, 'g'), i('rijst', 300, 'g'), i('ketjap', 2, 'el'), i('pindasaus', 200, 'ml', 'sauce', 'sep'), i('komkommer', 1, 'stuk', 'side', 'raw', 'sep')],
    steps: [
      s('Marineren', 'Snijd de kip in blokjes en meng met ketjap.', 5),
      s('Rijst en kip', 'Kook de rijst en bak of grill de kip gaar.', 20),
      s('Serveren', 'Satésaus warm apart, komkommer erbij.', 5),
    ],
    variants: (id) => [v(id, 'zonder-satesaus', 'Zonder satésaus, met ketjap', [{ op: 'remove', ingredientId: 'pindasaus' }])],
  }),
  r({
    id: 'prei-ovenschotel', name: 'Ovenschotel met aardappel en prei', active: 20, total: 50, equipment: ['oven', 'stove'],
    cuisine: 'hollands', protein: 'varken', tags: ['oven'],
    ingredients: [i('aardappel', 1000, 'g'), i('prei', 500, 'g'), i('half-om-half', 400, 'g'), i('kookroom', 200, 'ml', 'sauce'), i('geraspte-kaas', 100, 'g')],
    steps: [
      s('Voorbereiden', 'Kook de aardappelschijfjes 8 minuten voor. Bak gehakt en prei.', 15),
      s('Schotel vullen', 'Laag aardappel, gehakt-prei en room. Kaas erover.', 5),
      s('Bakken', 'Bak 30 minuten op 200 °C.', 30),
    ],
  }),
  r({
    id: 'linzen-dahl', name: 'Milde linzendahl met rijst', active: 15, total: 35,
    cuisine: 'indiaas', protein: 'peulvruchten', tags: ['vegetarisch', 'curry'],
    ingredients: [i('linzen', 250, 'g'), i('kokosmelk', 1, 'blik', 'sauce'), i('tomatenblokjes', 1, 'blik', 'sauce'), i('ui', 1, 'stuk'), i('gember', 15, 'g'), i('rijst', 300, 'g'), i('koriander', 10, 'g', 'topping', 'raw', 'sep', 'opt')],
    steps: [
      s('Basis', 'Fruit ui en gember, voeg linzen, tomaat en kokosmelk toe.', 8),
      s('Garen', 'Laat 25 minuten zachtjes koken tot de linzen uit elkaar vallen. Kook de rijst.', 25),
      s('Serveren', 'Koriander apart op tafel.', 2),
    ],
  }),
  r({
    id: 'omelet-groente', name: 'Groenteomelet met brood', active: 15, total: 20,
    cuisine: 'hollands', protein: 'ei', tags: ['ei', 'snel', 'vegetarisch'],
    ingredients: [i('eieren', 8, 'stuk'), i('paprika', 1, 'stuk'), i('spinazie', 150, 'g'), i('champignons', 150, 'g', 'opt'), i('geraspte-kaas', 50, 'g', 'topping', 'sep', 'opt'), i('brood', 1, 'stuk', 'side', 'sep')],
    steps: [
      s('Groente bakken', 'Bak de groente kort in een grote pan.', 6),
      s('Eieren', 'Klop de eieren los en giet erover. Laat op laag vuur stollen.', 10),
      s('Serveren', 'Snijd in punten, met brood en kaas apart.', 2),
    ],
    variants: (id) => [v(id, 'zonder-champignons', 'Zonder champignons', [{ op: 'remove', ingredientId: 'champignons' }])],
  }),
  r({
    id: 'champignonrisotto', name: 'Romige champignonrisotto', active: 30, total: 35, difficulty: 'medium',
    cuisine: 'italiaans', protein: 'groente', tags: ['vegetarisch', 'rijst'],
    ingredients: [i('risottorijst', 300, 'g'), i('champignons', 400, 'g'), i('ui', 1, 'stuk'), i('groentebouillon', 1000, 'ml'), i('parmezaan', 50, 'g'), i('boter', 25, 'g')],
    steps: [
      s('Basis', 'Fruit de ui en bak de champignons.', 8),
      s('Roeren', 'Voeg rijst toe en giet scheut voor scheut bouillon erbij, 20 minuten roeren.', 20),
      s('Afmaken', 'Roer boter en kaas erdoor.', 3),
    ],
  }),
  r({
    id: 'tofu-noedels', name: 'Wokgroente met noedels en tofu', active: 20, total: 25,
    cuisine: 'aziatisch', protein: 'soja', tags: ['noedels', 'vegetarisch'],
    ingredients: [i('noedels', 250, 'g'), i('tofu', 400, 'g', 'fried'), i('paksoi', 300, 'g'), i('paprika', 1, 'stuk'), i('wortel', 150, 'g'), i('sojasaus', 3, 'el', 'sauce'), i('gember', 10, 'g'), i('sesamzaad', 10, 'g', 'topping', 'sep', 'opt')],
    steps: [
      s('Tofu bakken', 'Bak de tofu in blokjes krokant.', 10),
      s('Wokken', 'Wok de groente met gember.', 8),
      s('Mengen', 'Meng de noedels en sojasaus erdoor. Sesam apart.', 5),
    ],
  }),
  r({
    id: 'burgers-zoete-friet', name: 'Burgers met zoete-aardappelfrietjes', active: 20, total: 35, equipment: ['oven', 'stove'],
    cuisine: 'amerikaans', protein: 'rund', tags: ['samenstellen'],
    ingredients: [i('runderburgers', 4, 'stuk'), i('hamburgerbroodjes', 4, 'stuk'), i('zoete-aardappel', 800, 'g', 'baked'), i('sla', 80, 'g', 'topping', 'raw', 'sep'), i('tomaat', 150, 'g', 'topping', 'raw', 'sep'), i('komkommer', 1, 'stuk', 'topping', 'raw', 'sep')],
    steps: [
      s('Frietjes', 'Snijd zoete aardappel in frietjes en bak 25 minuten op 220 °C.', 5),
      s('Burgers', 'Bak de burgers 4 minuten per kant.', 10),
      s('Samenstellen', 'Iedereen belegt de eigen burger.', 5),
    ],
  }),
  r({
    id: 'broccoli-quiche', name: 'Quiche met broccoli en kaas', active: 20, total: 55, equipment: ['oven'], difficulty: 'medium',
    cuisine: 'frans', protein: 'ei', tags: ['oven', 'vegetarisch'],
    ingredients: [i('quichedeeg', 1, 'pak'), i('broccoli', 400, 'g'), i('eieren', 4, 'stuk'), i('kookroom', 200, 'ml'), i('geraspte-kaas', 100, 'g'), i('sla', 100, 'g', 'side', 'raw', 'sep')],
    steps: [
      s('Vullen', 'Bekleed de vorm met deeg. Verdeel de voorgekookte broccoli.', 15),
      s('Eimengsel', 'Klop eieren, room en kaas en giet erover.', 5),
      s('Bakken', 'Bak 35 minuten op 190 °C. Sla erbij.', 35),
    ],
  }),
  r({
    id: 'pasta-bolognese', name: 'Pasta bolognese', active: 20, total: 40,
    cuisine: 'italiaans', protein: 'rund', tags: ['pasta'],
    ingredients: [i('pasta', 400, 'g'), i('rundergehakt', 400, 'g'), i('tomatenblokjes', 2, 'blik', 'sauce'), i('tomatenpuree', 70, 'g', 'sauce'), i('ui', 1, 'stuk'), i('wortel', 150, 'g'), i('knoflook', 2, 'teen'), i('geraspte-kaas', 75, 'g', 'topping', 'sep', 'opt')],
    steps: [
      s('Saus', 'Bak gehakt rul met ui, wortel en knoflook. Voeg tomaat toe.', 12),
      s('Laten pruttelen', 'Laat 20 minuten zachtjes koken. Kook de pasta.', 20),
      s('Serveren', 'Kaas apart op tafel.', 2),
    ],
    variants: (id) => [v(id, 'linzen', 'Met linzen in plaats van gehakt', [{ op: 'replace', from: 'rundergehakt', to: 'linzen', quantity: 200, unit: 'g' }])],
  }),
  r({
    id: 'pannenkoeken', name: 'Pannenkoeken met appel', active: 30, total: 40,
    cuisine: 'hollands', protein: 'ei', tags: ['kindvriendelijk', 'vegetarisch'],
    ingredients: [i('bloem', 300, 'g'), i('melk', 600, 'ml'), i('eieren', 3, 'stuk'), i('boter', 40, 'g'), i('appel', 2, 'stuk', 'topping', 'sep', 'opt'), i('geraspte-kaas', 100, 'g', 'topping', 'sep', 'opt')],
    steps: [
      s('Beslag', 'Klop bloem, melk en eieren tot een glad beslag. Laat 10 minuten rusten.', 10),
      s('Bakken', 'Bak dunne pannenkoeken in boter.', 25),
      s('Beleggen', 'Appel en kaas apart: iedereen belegt zelf.', 2),
    ],
  }),
];

export const RECIPE_MAP: ReadonlyMap<string, Recipe> = new Map(RECIPES.map((rec) => [rec.id, rec]));
