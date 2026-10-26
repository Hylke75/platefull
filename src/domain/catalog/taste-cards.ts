// Snelle smaakkaarten voor onboarding (O-06) en smaakprofiel (S-08).
// 'Rauwe tomaat' en 'tomatensaus' zijn bewust aparte items.
import type { Preparation, RuleTargetType } from '../types';

export interface TasteCard { key: string; label: string; targetType: Extract<RuleTargetType, 'ingredient' | 'tag'>; targetId: string; preparation: Preparation; group: 'ingredient' | 'gerecht' | 'bereiding' }

export const TASTE_CARDS: TasteCard[] = [
  { key: 'tomaat-raw', label: 'Rauwe tomaat', targetType: 'ingredient', targetId: 'tomaat', preparation: 'raw', group: 'ingredient' },
  { key: 'passata', label: 'Tomatensaus', targetType: 'ingredient', targetId: 'passata', preparation: 'any', group: 'ingredient' },
  { key: 'champignons', label: 'Champignons', targetType: 'ingredient', targetId: 'champignons', preparation: 'any', group: 'ingredient' },
  { key: 'broccoli', label: 'Broccoli', targetType: 'ingredient', targetId: 'broccoli', preparation: 'any', group: 'ingredient' },
  { key: 'courgette', label: 'Courgette', targetType: 'ingredient', targetId: 'courgette', preparation: 'any', group: 'ingredient' },
  { key: 'koriander', label: 'Koriander', targetType: 'ingredient', targetId: 'koriander', preparation: 'any', group: 'ingredient' },
  { key: 'paprika', label: 'Paprika', targetType: 'ingredient', targetId: 'paprika', preparation: 'any', group: 'ingredient' },
  { key: 'spinazie', label: 'Spinazie', targetType: 'ingredient', targetId: 'spinazie', preparation: 'any', group: 'ingredient' },
  { key: 'ui-raw', label: 'Rauwe ui', targetType: 'ingredient', targetId: 'rode-ui', preparation: 'raw', group: 'ingredient' },
  { key: 'kip', label: 'Kip', targetType: 'ingredient', targetId: 'kipfilet', preparation: 'any', group: 'ingredient' },
  { key: 'zalm', label: 'Zalm', targetType: 'ingredient', targetId: 'zalm', preparation: 'any', group: 'ingredient' },
  { key: 'kaas', label: 'Geraspte kaas', targetType: 'ingredient', targetId: 'geraspte-kaas', preparation: 'any', group: 'ingredient' },
  { key: 'pasta', label: 'Pasta', targetType: 'tag', targetId: 'pasta', preparation: 'any', group: 'gerecht' },
  { key: 'wraps', label: 'Wraps', targetType: 'tag', targetId: 'wraps', preparation: 'any', group: 'gerecht' },
  { key: 'stamppot', label: 'Stamppot', targetType: 'tag', targetId: 'stamppot', preparation: 'any', group: 'gerecht' },
  { key: 'soep', label: 'Soep', targetType: 'tag', targetId: 'soep', preparation: 'any', group: 'gerecht' },
  { key: 'curry', label: 'Curry', targetType: 'tag', targetId: 'curry', preparation: 'any', group: 'gerecht' },
  { key: 'rijst', label: 'Rijstgerechten', targetType: 'tag', targetId: 'rijst', preparation: 'any', group: 'gerecht' },
  { key: 'vis', label: 'Visgerechten', targetType: 'tag', targetId: 'vis', preparation: 'any', group: 'gerecht' },
  { key: 'samenstellen', label: 'Zelf samenstellen', targetType: 'tag', targetId: 'samenstellen', preparation: 'any', group: 'bereiding' },
  { key: 'oven', label: 'Uit de oven', targetType: 'tag', targetId: 'oven', preparation: 'any', group: 'bereiding' },
];

export const TASTE_CHOICES = [
  { severity: 'LIKE', label: 'Heerlijk', css: 'like' },
  { severity: 'NEUTRAL', label: 'Prima', css: 'like' },
  { severity: 'SOFT_DISLIKE', label: 'Liever niet', css: 'care' },
  { severity: 'STRONG_DISLIKE', label: 'Echt niet lekker', css: 'dislike' },
  { severity: 'UNKNOWN', label: 'Nog nooit gehad', css: 'care' },
] as const;
