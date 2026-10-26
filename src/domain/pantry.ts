// Voorraad (R-06) en restjes (R-07).
// 'Onbekend' telt nooit als beschikbaar; oude verificatie vraagt bevestiging.
import { toBase, type BaseUnit } from './units';
import type { Leftover, PantryItem } from './types';

/** Na deze periode vraagt een voorraadregel opnieuw bevestiging. Producthypothese. */
export const PANTRY_VERIFY_MAX_DAYS = 7;
/** R-07: maximaal twee dagen afgedekt in de koelkast (Voedingscentrum). */
export const LEFTOVER_FRIDGE_DAYS = 2;
/** Conservatieve termijn voor ingevroren restjes; daarna 'controle nodig'. Producthypothese. */
export const LEFTOVER_FREEZER_DAYS = 90;

const DAY = 24 * 60 * 60 * 1000;

export type PantryAvailability = 'in_stock' | 'insufficient' | 'check' | 'unknown';

export function pantryAvailability(
  item: PantryItem | undefined,
  needed: { quantity: number; unit: BaseUnit } | null,
  now: Date,
): { status: PantryAvailability; knownQuantity: number | null } {
  if (!item || item.status !== 'confirmed' || !item.verifiedAt) return { status: 'unknown', knownQuantity: null };
  if (item.expiresAt && new Date(item.expiresAt).getTime() < now.getTime()) return { status: 'check', knownQuantity: null };
  if (now.getTime() - new Date(item.verifiedAt).getTime() > PANTRY_VERIFY_MAX_DAYS * DAY) return { status: 'check', knownQuantity: null };
  if (item.quantity == null || !item.unit) return { status: 'check', knownQuantity: null };
  const have = toBase(item.quantity, item.unit);
  if (!needed) return { status: 'in_stock', knownQuantity: have.quantity };
  if (have.unit !== needed.unit) return { status: 'check', knownQuantity: null };
  return { status: have.quantity + 1e-9 >= needed.quantity ? 'in_stock' : 'insufficient', knownQuantity: have.quantity };
}

export function leftoverUseBy(storedAt: Date, storage: Leftover['storage']): Date {
  const days = storage === 'fridge' ? LEFTOVER_FRIDGE_DAYS : LEFTOVER_FREEZER_DAYS;
  return new Date(storedAt.getTime() + days * DAY);
}

export type LeftoverState = 'usable' | 'check_needed' | 'used' | 'discarded';

/** Na de termijn nooit automatisch 'veilig'; door gebruiker als onveilig gemarkeerd = niet bruikbaar. */
export function leftoverState(l: Leftover, now: Date): LeftoverState {
  if (l.status === 'used') return 'used';
  if (l.status === 'discarded') return 'discarded';
  if (l.status === 'unsafe') return 'check_needed';
  return new Date(l.useBy).getTime() >= now.getTime() ? 'usable' : 'check_needed';
}
