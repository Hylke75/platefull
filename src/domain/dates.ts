// Datums in de tijdzone van het huishouden (standaard Europe/Amsterdam, zomer-/wintertijd correct).

export function localDate(now: Date, timeZone = 'Europe/Amsterdam'): string {
  // en-CA geeft YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Maandag van de week waarin de datum valt (ISO-week). */
export function weekStart(date: string): string {
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = zondag
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

const SHORT = ['ZO', 'MA', 'DI', 'WO', 'DO', 'VR', 'ZA'];
const LONG = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

export function dayShort(date: string): string {
  return SHORT[new Date(`${date}T12:00:00Z`).getUTCDay()]!;
}

export function dayLong(date: string): string {
  return LONG[new Date(`${date}T12:00:00Z`).getUTCDay()]!;
}

export function dayNumber(date: string): string {
  return String(Number(date.slice(8, 10)));
}

export function formatDateNl(date: string): string {
  return new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

/** Begroeting op basis van het lokale uur. */
export function greeting(now: Date, timeZone = 'Europe/Amsterdam'): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hour12: false }).format(now));
  if (hour < 6) return 'GOEDENACHT';
  if (hour < 12) return 'GOEDEMORGEN';
  if (hour < 18) return 'GOEDEMIDDAG';
  return 'GOEDENAVOND';
}
