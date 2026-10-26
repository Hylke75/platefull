// Voorbeelddata van het visuele ontwerp v2.0 (design-source/dist/app.js).
// Uitsluitend demo-data: fictief gezin, vooraf uitgewerkte scenario's.

export type MealKey = 'wraps' | 'bowl' | 'pasta';

export interface DemoMeal {
  name: string;
  image: string;
  time: number;
  description: string;
  note: string;
}

export const meals: Record<MealKey, DemoMeal> = {
  wraps: { name: 'Wraps voor iedereen', image: '/assets/wraps.png', time: 20, description: 'Samenstellen aan tafel', note: 'Tomaat en koriander apart geserveerd' },
  bowl: { name: 'Kleurrijke rijstbowl', image: '/assets/roasted-bowl.png', time: 30, description: 'Met geroosterde groenten', note: 'Iedereen kiest de favoriete groenten' },
  pasta: { name: 'Romige tomatenpasta', image: '/assets/pasta.png', time: 25, description: 'Met basilicum en kaas', note: 'Rauwe tomaat niet nodig' },
};

export type TasteType = 'like' | 'dislike' | 'care' | 'strict';

export interface DemoPerson {
  name: string;
  role: string;
  color: 'p1' | 'p2' | 'p3' | 'p4';
  initial: string;
  sub: string;
  tastes: [food: string, label: string, type: TasteType][];
}

export const people: DemoPerson[] = [
  { name: 'Emma', role: 'Ouder', color: 'p1', initial: 'E', sub: 'Geen koriander', tastes: [['Koriander', 'Echt niet lekker', 'dislike'], ['Pasta', 'Heerlijk', 'like'], ['Pittig eten', 'Liever niet', 'care']] },
  { name: 'Ruben', role: 'Ouder', color: 'p2', initial: 'R', sub: 'Eet vegetarisch', tastes: [['Vegetarisch', 'Dieetafspraak', 'strict'], ['Courgette', 'Heerlijk', 'like'], ['Champignons', 'Prima', 'like']] },
  { name: 'Sam', role: 'Tiener · 15 jaar', color: 'p3', initial: 'S', sub: 'Geen rauwe tomaat', tastes: [['Rauwe tomaat', 'Liever niet', 'care'], ['Tomatensaus', 'Heerlijk', 'like'], ['Wraps', 'Heerlijk', 'like']] },
  { name: 'Lina', role: 'Kind · 9 jaar', color: 'p4', initial: 'L', sub: 'Geen champignons · notenallergie', tastes: [['Champignons', 'Echt niet lekker', 'dislike'], ['Broccoli', 'Liever niet', 'care'], ['Pasta', 'Heerlijk', 'like'], ['Noten', 'Allergie — nooit overrulen', 'strict']] },
];

export type ScenarioKey = 'time' | 'away' | 'missing' | 'taste';

export const scenarioOptions: [ScenarioKey, string, string][] = [
  ['time', '◷', 'Minder tijd'],
  ['away', '↗', 'Iemand eet niet mee'],
  ['missing', '▤', 'Iets ontbreekt'],
  ['taste', '♡', 'Kind lust het niet'],
];

export const scenarioSolutions: Record<ScenarioKey, [title: string, body: string, bullets: string[]]> = {
  time: ['Snelle wraps in 15 minuten', 'Bak de paprika kort, gebruik de bonen direct en zet alle toppings apart op tafel. De oorspronkelijke boodschappen blijven bruikbaar.', ['5 minuten minder voorbereiding', 'Geen extra boodschappen']],
  away: ['Dezelfde maaltijd, minder porties', 'Maak drie wraps en bewaar de extra ingrediënten voor een lunch morgen. Je hoeft het menu niet om te gooien.', ['3 personen vanavond', 'Restjes slim gebruiken']],
  missing: ['Slimme wissel zonder winkelbezoek', 'Geen zwarte bonen? Gebruik de kikkererwten uit de voorraadkast en bak ze met paprikapoeder.', ['Geen extra winkelbezoek', 'Zelfde basisgerecht']],
  taste: ['Tomaat gewoon apart', 'Sam wil geen rauwe tomaat? Serveer die los. Zijn smaakvoorkeur blijft opgeslagen, ook als jij het gerecht kiest.', ['Eén maaltijd voor iedereen', 'Ouders houden de regie']],
};

export const planBNotes: Record<ScenarioKey, string> = {
  time: 'Snellere bereiding: alle ingrediënten blijven bruikbaar',
  away: 'Drie eters: een portie apart voor morgen',
  missing: 'Kikkererwten vervangen de zwarte bonen',
  taste: 'Rauwe tomaat apart voor Sam',
};

export const groceryGroups: [group: string, items: [item: string, amount: string][]][] = [
  ['Groente & fruit', [['Paprika’s', '2 stuks'], ['Avocado', '1 stuk'], ['Limoen', '1 stuk'], ['Cherrytomaatjes', '150 g']]],
  ['Voorraad', [['Volkoren wraps', '1 pak'], ['Zwarte bonen', '1 blik'], ['Mais', '1 blik']]],
  ['Koeling', [['Yoghurtsaus', '1 bakje']]],
];
