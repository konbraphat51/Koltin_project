/** Local-date helpers; diary dates are `YYYY-MM-DD` strings in the device's time zone. */

/** Formats a Date as a local `YYYY-MM-DD`. */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parses `YYYY-MM-DD` as a local date at noon (avoids DST edge cases). */
export function parseDate(text: string): Date {
  const [y, m, d] = text.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12);
}

/** Adds days to a `YYYY-MM-DD` string. */
export function addDays(text: string, days: number): string {
  const date = parseDate(text);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/** Lists `count` consecutive dates ending at `end` (inclusive), oldest first. */
export function listDatesEndingAt(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(end, i - (count - 1)));
}
