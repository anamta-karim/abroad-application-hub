/**
 * Minimal iCalendar (RFC 5545) writer for the private deadline feed.
 * All events are all-day; lines are CRLF-terminated and folded at 75 octets.
 */

export type FeedEventKind = "deadline" | "task" | "document" | "opening";

export interface FeedEvent {
  kind: FeedEventKind;
  itemId: string;
  date: string; // YYYY-MM-DD
  title: string;
  detail: string | null;
  url: string | null;
}

const KIND_PREFIX: Record<FeedEventKind, string> = {
  deadline: "Deadline",
  task: "Task due",
  document: "Document due",
  opening: "Expected to open",
};

/** Alarms (days before) per kind. Apple/Outlook honour these; Google ignores alarms in subscribed calendars. */
const KIND_ALARMS: Record<FeedEventKind, number[]> = {
  deadline: [7, 1],
  task: [1],
  document: [1],
  opening: [0],
};

export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds a content line to 75 octets per RFC 5545 §3.1 (continuation lines start with a space). */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const ch of line) {
    const chBytes = encoder.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines lose 1 octet to the leading space
    if (currentBytes + chBytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += ch;
    currentBytes += chBytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/**
 * All-day events start at 00:00, so "N days before, at 09:00" is
 * (N − 1) days and 15 hours before the start; same day is +9 hours.
 */
export function alarmTrigger(daysBefore: number): string {
  if (daysBefore <= 0) return "PT9H";
  return daysBefore === 1 ? "-PT15H" : `-P${daysBefore - 1}DT15H`;
}

function compactDate(date: string): string {
  return date.replace(/-/g, "");
}

function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildIcs(events: FeedEvent[], options: { calendarName: string; now?: Date; host?: string }): string {
  const now = options.now ?? new Date();
  const host = options.host ?? "abroadatlas";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AbroadAtlas//Deadline Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(options.calendarName)}`,
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];

  for (const e of events) {
    const summary = `${KIND_PREFIX[e.kind]}: ${e.title}`;
    const description = [e.detail, e.url].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.kind}-${e.itemId}@${host}`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART;VALUE=DATE:${compactDate(e.date)}`,
      `DTEND;VALUE=DATE:${compactDate(nextDay(e.date))}`,
      `SUMMARY:${escapeText(summary)}`,
      "TRANSP:TRANSPARENT"
    );
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    for (const daysBefore of KIND_ALARMS[e.kind]) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeText(summary)}`,
        `TRIGGER:${alarmTrigger(daysBefore)}`,
        "END:VALARM"
      );
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
