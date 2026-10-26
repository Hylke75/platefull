// Gecontroleerde ingrediëntencatalogus (F-013, §9 ingredients / ingredient_allergens).
//
// Regel: alleen onbewerkte basisproducten krijgen allergenStatus 'verified'. Samengestelde
// producten (wraps, pesto, bouillon, saus, kaas, worst …) verschillen per merk en blijven
// 'incomplete' — bij een harde allergie worden ze dus NIET als veilig beschouwd.
// Dieetvlaggen null = onbekend (bijv. kaas met mogelijk dierlijk stremsel).
// Prijzen zijn bewust leeg: zonder aantoonbare bron + datum is een prijs 'onbekend' (R-05).
//
// LET OP: deze catalogus is een redactioneel concept. Laat allergenen en dieetvlaggen vóór de
// pilot door een mens controleren (zie docs/STATUS.md).
import type { AllergenCode, DietFlags, Ingredient, ShoppingCategory, UnitKind } from '../types';

const PLANT: DietFlags = { meat: false, pork: false, fish: false, animal: false };
const DAIRY_EGG: DietFlags = { meat: false, pork: false, fish: false, animal: true };
const MEAT: DietFlags = { meat: true, pork: false, fish: false, animal: true };
const PORK: DietFlags = { meat: true, pork: true, fish: false, animal: true };
const FISH: DietFlags = { meat: false, pork: false, fish: true, animal: true };
/** Plantaardige basis, maar dierlijke ingrediënten (ei, zuivel) niet uit te sluiten. */
const NO_MEAT_FISH: DietFlags = { meat: false, pork: false, fish: false, animal: null };
/** Kaas: mogelijk dierlijk stremsel — voor een strikt vegetariër onbekend. */
const CHEESE: DietFlags = { meat: null, pork: false, fish: false, animal: true };

const SOURCE = 'generiek basisproduct · EU-allergenenlijst 1169/2011';

function ing(
  id: string, canonicalName: string, category: ShoppingCategory, unitKind: UnitKind,
  allergens: AllergenCode[], allergenStatus: Ingredient['allergenStatus'], diet: DietFlags | null, synonyms: string[] = [],
): Ingredient {
  return { id, canonicalName, category, unitKind, allergens, allergenStatus, diet, synonyms, priceEstimate: null };
}

export const INGREDIENTS: Ingredient[] = [
  // Groente & fruit — onbewerkt
  ing('paprika', 'Paprika', 'groente_fruit', 'count', [], 'verified', PLANT, ['paprika’s']),
  ing('avocado', 'Avocado', 'groente_fruit', 'count', [], 'verified', PLANT),
  ing('limoen', 'Limoen', 'groente_fruit', 'count', [], 'verified', PLANT),
  ing('citroen', 'Citroen', 'groente_fruit', 'count', [], 'verified', PLANT),
  ing('tomaat', 'Tomaat', 'groente_fruit', 'mass', [], 'verified', PLANT, ['cherrytomaatjes', 'tomaten']),
  ing('koriander', 'Koriander', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('basilicum', 'Basilicum', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('peterselie', 'Peterselie', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('ui', 'Ui', 'groente_fruit', 'count', [], 'verified', PLANT, ['uien']),
  ing('rode-ui', 'Rode ui', 'groente_fruit', 'count', [], 'verified', PLANT),
  ing('knoflook', 'Knoflook', 'groente_fruit', 'count', [], 'verified', PLANT),
  ing('courgette', 'Courgette', 'groente_fruit', 'count', [], 'verified', PLANT),
  ing('broccoli', 'Broccoli', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('zoete-aardappel', 'Zoete aardappel', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('aardappel', 'Aardappel', 'groente_fruit', 'mass', [], 'verified', PLANT, ['aardappelen']),
  ing('krieltjes', 'Krieltjes', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('wortel', 'Wortel', 'groente_fruit', 'mass', [], 'verified', PLANT, ['winterpeen']),
  ing('boerenkool', 'Boerenkool', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('spinazie', 'Spinazie', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('champignons', 'Champignons', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('prei', 'Prei', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('sperziebonen', 'Sperziebonen', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('komkommer', 'Komkommer', 'groente_fruit', 'count', [], 'verified', PLANT),
  ing('sla', 'Sla', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('aubergine', 'Aubergine', 'groente_fruit', 'count', [], 'verified', PLANT),
  ing('bleekselderij', 'Bleekselderij', 'groente_fruit', 'mass', ['celery'], 'verified', PLANT),
  ing('tauge', 'Taugé', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('paksoi', 'Paksoi', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('gember', 'Gember', 'groente_fruit', 'mass', [], 'verified', PLANT),
  ing('appel', 'Appel', 'groente_fruit', 'count', [], 'verified', PLANT),

  // Voorraad
  ing('wraps', 'Volkoren wraps', 'brood_granen', 'count', ['gluten'], 'incomplete', NO_MEAT_FISH, ['tortilla']),
  ing('zwarte-bonen', 'Zwarte bonen', 'voorraad', 'count', [], 'verified', PLANT),
  ing('kikkererwten', 'Kikkererwten', 'voorraad', 'count', [], 'verified', PLANT),
  ing('kidneybonen', 'Kidneybonen', 'voorraad', 'count', [], 'verified', PLANT),
  ing('linzen', 'Rode linzen', 'voorraad', 'mass', [], 'verified', PLANT),
  ing('spliterwten', 'Spliterwten', 'voorraad', 'mass', [], 'verified', PLANT),
  ing('mais', 'Mais', 'voorraad', 'count', [], 'verified', PLANT),
  ing('doperwten', 'Doperwten', 'voorraad', 'mass', [], 'verified', PLANT),
  ing('rijst', 'Rijst', 'voorraad', 'mass', [], 'verified', PLANT),
  ing('risottorijst', 'Risottorijst', 'voorraad', 'mass', [], 'verified', PLANT),
  ing('pasta', 'Pasta (durum)', 'voorraad', 'mass', ['gluten'], 'incomplete', NO_MEAT_FISH, ['spaghetti', 'penne']),
  ing('lasagnebladen', 'Lasagnebladen', 'voorraad', 'mass', ['gluten'], 'incomplete', NO_MEAT_FISH),
  ing('mie', 'Mie', 'voorraad', 'mass', ['gluten', 'eggs'], 'incomplete', DAIRY_EGG, ['bami']),
  ing('noedels', 'Rijstnoedels', 'voorraad', 'mass', [], 'incomplete', NO_MEAT_FISH),
  ing('couscous', 'Couscous', 'voorraad', 'mass', ['gluten'], 'verified', PLANT),
  ing('gnocchi', 'Gnocchi', 'koeling', 'mass', ['gluten'], 'incomplete', NO_MEAT_FISH),
  ing('passata', 'Passata', 'voorraad', 'volume', [], 'incomplete', PLANT, ['tomatensaus', 'gezeefde tomaten']),
  ing('tomatenblokjes', 'Tomatenblokjes', 'voorraad', 'count', [], 'incomplete', PLANT),
  ing('tomatenpuree', 'Tomatenpuree', 'voorraad', 'mass', [], 'incomplete', PLANT),
  ing('olijfolie', 'Olijfolie', 'voorraad', 'volume', [], 'verified', PLANT),
  ing('bloem', 'Tarwebloem', 'voorraad', 'mass', ['gluten'], 'verified', PLANT),
  ing('groentebouillon', 'Groentebouillon', 'voorraad', 'volume', ['celery'], 'incomplete', null),
  ing('kerriepasta', 'Kerriepasta', 'voorraad', 'mass', [], 'incomplete', null),
  ing('kokosmelk', 'Kokosmelk', 'voorraad', 'count', [], 'incomplete', PLANT),
  ing('ketjap', 'Ketjap manis', 'voorraad', 'volume', ['soy', 'gluten'], 'incomplete', PLANT),
  ing('sojasaus', 'Sojasaus', 'voorraad', 'volume', ['soy', 'gluten'], 'incomplete', PLANT),
  ing('pindasaus', 'Satésaus', 'voorraad', 'volume', ['peanuts'], 'incomplete', null, ['pindasaus']),
  ing('pesto', 'Groene pesto', 'koeling', 'mass', ['nuts', 'milk'], 'incomplete', CHEESE),
  ing('sesamzaad', 'Sesamzaad', 'voorraad', 'mass', ['sesame'], 'verified', PLANT),
  ing('paprikapoeder', 'Paprikapoeder', 'voorraad', 'mass', [], 'incomplete', PLANT),
  ing('komijn', 'Komijn', 'voorraad', 'mass', [], 'incomplete', PLANT),
  ing('pizzadeeg', 'Pizzadeeg', 'koeling', 'count', ['gluten'], 'incomplete', NO_MEAT_FISH),
  ing('brood', 'Brood', 'brood_granen', 'count', ['gluten'], 'incomplete', NO_MEAT_FISH),
  ing('hamburgerbroodjes', 'Hamburgerbroodjes', 'brood_granen', 'count', ['gluten'], 'incomplete', NO_MEAT_FISH),
  ing('tacoschelpen', 'Tacoschelpen', 'voorraad', 'count', [], 'incomplete', NO_MEAT_FISH),
  ing('quichedeeg', 'Bladerdeeg', 'koeling', 'count', ['gluten'], 'incomplete', NO_MEAT_FISH),

  // Koeling
  ing('yoghurtsaus', 'Yoghurtsaus', 'koeling', 'count', ['milk'], 'incomplete', NO_MEAT_FISH),
  ing('griekse-yoghurt', 'Griekse yoghurt', 'koeling', 'mass', ['milk'], 'verified', DAIRY_EGG),
  ing('kookroom', 'Kookroom', 'koeling', 'volume', ['milk'], 'verified', DAIRY_EGG),
  ing('melk', 'Melk', 'koeling', 'volume', ['milk'], 'verified', DAIRY_EGG),
  ing('boter', 'Roomboter', 'koeling', 'mass', ['milk'], 'verified', DAIRY_EGG),
  ing('eieren', 'Eieren', 'koeling', 'count', ['eggs'], 'verified', DAIRY_EGG),
  ing('geraspte-kaas', 'Geraspte kaas', 'koeling', 'mass', ['milk'], 'incomplete', CHEESE),
  ing('parmezaan', 'Parmezaanse kaas', 'koeling', 'mass', ['milk'], 'incomplete', CHEESE),
  ing('mozzarella', 'Mozzarella', 'koeling', 'mass', ['milk'], 'incomplete', CHEESE),
  ing('feta', 'Feta', 'koeling', 'mass', ['milk'], 'incomplete', CHEESE),
  ing('tofu', 'Tofu', 'koeling', 'mass', ['soy'], 'verified', PLANT),
  ing('kipfilet', 'Kipfilet', 'koeling', 'mass', [], 'verified', MEAT),
  ing('kipdijfilet', 'Kippendijfilet', 'koeling', 'mass', [], 'verified', MEAT),
  ing('rundergehakt', 'Rundergehakt', 'koeling', 'mass', [], 'verified', MEAT),
  ing('half-om-half', 'Gehakt half-om-half', 'koeling', 'mass', [], 'verified', PORK),
  ing('rookworst', 'Rookworst', 'koeling', 'count', [], 'incomplete', PORK),
  ing('vega-rookworst', 'Vegetarische rookworst', 'koeling', 'count', [], 'incomplete', NO_MEAT_FISH),
  ing('zalm', 'Zalmfilet', 'koeling', 'mass', ['fish'], 'verified', FISH),
  ing('vissticks', 'Vissticks', 'koeling', 'count', ['fish', 'gluten'], 'incomplete', FISH),
  ing('spekjes', 'Spekreepjes', 'koeling', 'mass', [], 'incomplete', PORK),
  ing('runderburgers', 'Runderburgers', 'koeling', 'count', [], 'incomplete', MEAT),
];

export const INGREDIENT_MAP: ReadonlyMap<string, Ingredient> = new Map(INGREDIENTS.map((i) => [i.id, i]));
