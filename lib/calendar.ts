/**
 * Date helpers for the deadlines calendar. Dates are plain "YYYY-MM-DD"
 * strings (as stored in Postgres DATE columns) to avoid timezone shifts.
 */

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

export interface MonthRef {
  year: number;
  month: number; // 1-12
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayString(now: Date = new Date()): string {
  return toDateString(now);
}

/** Parses "YYYY-MM"; falls back to the month containing `now`. */
export function parseMonthParam(raw: string | undefined, now: Date = new Date()): MonthRef {
  const m = /^(\d{4})-(\d{2})$/.exec(raw || "");
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) return { year, month };
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function monthParam({ year, month }: MonthRef): string {
  return `${year}-${pad2(month)}`;
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function monthLabel({ year, month }: MonthRef): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Full weeks (Monday-first) covering the month, including leading/trailing days. */
export function buildMonthGrid(ref: MonthRef, today: string = todayString()): CalendarDay[][] {
  const first = new Date(ref.year, ref.month - 1, 1);
  const leading = (first.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(ref.year, ref.month, 0).getDate();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(ref.year, ref.month - 1, 1 - leading + i);
    const date = toDateString(d);
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({
      date,
      day: d.getDate(),
      inMonth: d.getMonth() === ref.month - 1,
      isToday: date === today,
    });
  }
  return weeks;
}

/** First and last date shown in the grid (for querying events). */
export function gridRange(weeks: CalendarDay[][]): { from: string; to: string } {
  return { from: weeks[0][0].date, to: weeks[weeks.length - 1][6].date };
}

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export function countdownLabel(date: string, today: string = todayString()): string {
  const days = daysBetween(today, date);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${Math.abs(days)} days ago`;
}

export function formatDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
