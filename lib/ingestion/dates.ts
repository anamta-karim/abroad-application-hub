/**
 * Parses a deadline written in admissions documents into YYYY-MM-DD,
 * without timezone conversion (new Date(...).toISOString() can shift the
 * day). Returns null when the text isn't a single clear date.
 */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function build(year: number, month: number, day: number): string | null {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseFactDate(raw: string): string | null {
  const text = raw.trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, "$1").replace(/\s+/g, " ");

  // 2026-11-28
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (m) return build(+m[1], +m[2], +m[3]);

  // 28 november 2026 / 28 nov, 2026
  m = /^(\d{1,2}) ([a-z]+)\.?,? (\d{4})$/.exec(text);
  if (m && MONTHS[m[2]]) return build(+m[3], MONTHS[m[2]], +m[1]);

  // november 28, 2026 / nov 28 2026
  m = /^([a-z]+)\.? (\d{1,2}),? (\d{4})$/.exec(text);
  if (m && MONTHS[m[1]]) return build(+m[3], MONTHS[m[1]], +m[2]);

  // 28/11/2026 or 11/28/2026 (also with - or .): only when the order is unambiguous
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const year = +m[3];
    if (a > 12 && b <= 12) return build(year, b, a); // day first
    if (b > 12 && a <= 12) return build(year, a, b); // month first
    if (a === b) return build(year, a, b);
    return null; // e.g. 03/04/2026: 3 April or March 4 depends on the country
  }

  return null;
}
