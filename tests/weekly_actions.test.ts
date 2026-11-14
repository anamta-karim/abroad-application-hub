import { describe, it, expect } from "vitest";
import { buildWeeklyActions, whenLabel } from "@/lib/weekly";

const today = "2026-11-14";

const apps = [
  { id: "a1", title: "Chevening", deadline: "2026-11-20", status: "preparing", archived_at: null },
  { id: "a2", title: "DAAD", deadline: "2026-12-30", status: "preparing", archived_at: null }, // too far
  { id: "a3", title: "Submitted one", deadline: "2026-11-16", status: "submitted", archived_at: null }, // done
  { id: "a4", title: "Archived", deadline: "2026-11-15", status: "preparing", archived_at: "2026-11-01" },
  { id: "a5", title: "GKS", deadline: "2026-11-15", status: "researching", archived_at: null },
];

const requirements = [
  { id: "r1", application_id: "a1", document_type: "Transcript", due_date: "2026-11-12", status: "in_progress" },
  { id: "r2", application_id: "a1", document_type: "IELTS", due_date: null, status: "ready" },
  { id: "r3", application_id: "a1", document_type: "CV", due_date: "2026-11-18", status: "ready" }, // done
  { id: "r4", application_id: "a4", document_type: "Passport", due_date: "2026-11-15", status: "not_started" }, // archived app
];

const tasks = [
  { id: "t1", application_id: "a1", title: "Ask Prof. Rao for LOR", due_date: "2026-11-17", status: "open" },
  { id: "t2", application_id: "a1", title: "Done task", due_date: "2026-11-15", status: "done" },
  { id: "t3", application_id: "a2", title: "Book IELTS", due_date: "2026-11-30", status: "open" }, // > 7 days
];

const reminders = [
  { id: "w1", title: "MEXT", expected_open_date: "2026-11-14", status: "watching" },
  { id: "w2", title: "Fulbright", expected_open_date: "2026-11-19", status: "watching" },
  { id: "w3", title: "Converted", expected_open_date: "2026-11-14", status: "converted" },
];

describe("This week actions", () => {
  const items = buildWeeklyActions({ apps, requirements, tasks, reminders, today });
  const keys = items.map((i) => i.key);

  it("includes only actionable items inside the horizon", () => {
    expect(keys.sort()).toEqual(
      ["deadline-a1", "deadline-a5", "document-r1", "task-t1", "opening-w1", "opening-w2"].sort()
    );
  });

  it("ranks overdue first, then by how soon", () => {
    const ordered = buildWeeklyActions({ apps, requirements, tasks, reminders, today }).map((i) => i.key);
    expect(ordered[0]).toBe("document-r1"); // 2 days overdue
    expect(ordered.indexOf("deadline-a5")).toBeLessThan(ordered.indexOf("deadline-a1"));
    expect(ordered[ordered.length - 1]).toBe("deadline-a1"); // 6 days away, "soon"
  });

  it("summarises document and task progress on deadlines", () => {
    const chevening = items.find((i) => i.key === "deadline-a1")!;
    expect(chevening.title).toBe("Chevening closes in 6 days");
    expect(chevening.detail).toBe("2 of 3 documents ready · 1 open task");
    expect(items.find((i) => i.key === "deadline-a5")!.detail).toBe("No documents listed yet");
  });

  it("words overdue and due items clearly", () => {
    expect(items.find((i) => i.key === "document-r1")!.title).toBe("Transcript: 2 days overdue");
    expect(items.find((i) => i.key === "task-t1")!.title).toBe("Ask Prof. Rao for LOR: due in 3 days");
    expect(items.find((i) => i.key === "opening-w1")!.title).toBe("MEXT should be open now");
  });

  it("labels relative days", () => {
    expect(whenLabel(0)).toBe("today");
    expect(whenLabel(1)).toBe("tomorrow");
    expect(whenLabel(-1)).toBe("1 day overdue");
    expect(whenLabel(5)).toBe("in 5 days");
  });
});
