// Metrische normalisatie (nl-NL: g/kg/ml/l). Telbare eenheden blijven per eenheid gescheiden.
import type { Unit } from './types';

export type BaseUnit = 'g' | 'ml' | 'stuk' | 'blik' | 'pak' | 'bakje' | 'teen' | 'snuf';

export function toBase(quantity: number, unit: Unit): { quantity: number; unit: BaseUnit } {
  switch (unit) {
    case 'kg': return { quantity: quantity * 1000, unit: 'g' };
    case 'l': return { quantity: quantity * 1000, unit: 'ml' };
    case 'el': return { quantity: quantity * 15, unit: 'ml' };
    case 'tl': return { quantity: quantity * 5, unit: 'ml' };
    default: return { quantity, unit };
  }
}

/** Schaal een receptportie naar een aantal eters (1–12, S-11). */
export function scaleQuantity(quantity: number, recipeServings: number, eaters: number): number {
  if (eaters < 1 || eaters > 12) throw new RangeError('Aantal eters moet tussen 1 en 12 liggen');
  return quantity * (eaters / recipeServings);
}

const countUnits: BaseUnit[] = ['stuk', 'blik', 'pak', 'bakje', 'teen'];

/** Afronden voor de boodschappenlijst: telbare eenheden naar boven, gewichten op 5 g / 5 ml. */
export function roundForShopping(quantity: number, unit: BaseUnit): number {
  if (countUnits.includes(unit)) return Math.ceil(quantity - 1e-9);
  if (unit === 'snuf') return 1;
  return Math.max(5, Math.ceil(quantity / 5 - 1e-9) * 5);
}

export function formatQuantity(quantity: number, unit: BaseUnit): string {
  if (unit === 'g' && quantity >= 1000) return `${(quantity / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 2 })} kg`;
  if (unit === 'ml' && quantity >= 1000) return `${(quantity / 1000).toLocaleString('nl-NL', { maximumFractionDigits: 2 })} l`;
  const n = quantity.toLocaleString('nl-NL', { maximumFractionDigits: 1 });
  switch (unit) {
    case 'stuk': return `${n} ${quantity === 1 ? 'stuk' : 'stuks'}`;
    case 'blik': return `${n} ${quantity === 1 ? 'blik' : 'blikken'}`;
    case 'pak': return `${n} ${quantity === 1 ? 'pak' : 'pakken'}`;
    case 'bakje': return `${n} ${quantity === 1 ? 'bakje' : 'bakjes'}`;
    case 'teen': return `${n} ${quantity === 1 ? 'teen' : 'tenen'}`;
    case 'snuf': return 'snufje';
    default: return `${n} ${unit}`;
  }
}
