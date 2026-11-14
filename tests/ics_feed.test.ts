import { describe, it, expect } from "vitest";
import { buildIcs, escapeText, foldLine, alarmTrigger } from "@/lib/ics";

describe("iCalendar feed", () => {
  const ics = buildIcs(
    [
      {
        kind: "deadline",
        itemId: "a1",
        date: "2026-11-28",
        title: "Schwarzman Scholars",
        detail: "Tsinghua University, Beijing; China",
        url: "https://example.com/app/applications/a1",
      },
      { kind: "task", itemId: "t1", date: "2026-12-31", title: "Ask for LOR", detail: null, url: null },
    ],
    { calendarName: "My deadlines", now: new Date("2026-11-14T10:00:00Z"), host: "example.com" }
  );
  const lines = ics.split("\r\n");

  it("is a CRLF-terminated VCALENDAR with one VEVENT per item", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(2);
    expect(ics).not.toMatch(/[^\r]\n/); // no bare LF
  });

  it("writes all-day events with an exclusive end date across a year boundary", () => {
    expect(lines).toContain("DTSTART;VALUE=DATE:20261128");
    expect(lines).toContain("DTEND;VALUE=DATE:20261129");
    expect(lines).toContain("DTEND;VALUE=DATE:20270101");
  });

  it("uses stable UIDs so calendars update instead of duplicating", () => {
    expect(lines).toContain("UID:deadline-a1@example.com");
    expect(lines).toContain("DTSTAMP:20261114T100000Z");
  });

  it("escapes text and prefixes the kind", () => {
    expect(lines).toContain("SUMMARY:Deadline: Schwarzman Scholars");
    expect(ics).toContain("Tsinghua University\\, Beijing\\; China");
    expect(escapeText("a\nb")).toBe("a\\nb");
  });

  it("adds 7-day and 1-day alarms at 09:00 for deadlines", () => {
    expect(alarmTrigger(7)).toBe("-P6DT15H");
    expect(alarmTrigger(1)).toBe("-PT15H");
    expect(alarmTrigger(0)).toBe("PT9H");
    expect(ics).toContain("TRIGGER:-P6DT15H");
  });

  it("folds long lines to 75 octets, including multi-byte characters", () => {
    const long = "SUMMARY:" + "Türkiye Bursları ".repeat(10);
    const folded = foldLine(long);
    const encoder = new TextEncoder();
    for (const part of folded.split("\r\n")) {
      expect(encoder.encode(part).length).toBeLessThanOrEqual(75);
    }
    expect(folded.split("\r\n").slice(1).every((p) => p.startsWith(" "))).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toBe(long);
  });
});
