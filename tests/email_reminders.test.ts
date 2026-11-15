import { describe, it, expect, vi, afterEach } from "vitest";
import { selectReminders, renderReminderEmail, isReminderAllowed, type ReminderInput } from "@/lib/reminders";
import { sendEmail, isEmailConfigured } from "@/lib/email/resend";

const today = "2026-11-15";

const base: ReminderInput = {
  today,
  alreadySent: new Set(),
  apps: [
    { id: "a7", title: "Chevening", institution_or_provider: "FCDO", deadline: "2026-11-22", status: "preparing", archived_at: null }, // 7 days
    { id: "a5", title: "DAAD", institution_or_provider: null, deadline: "2026-11-20", status: "preparing", archived_at: null }, // 5 days: not an offset
    { id: "a0", title: "GKS", institution_or_provider: null, deadline: "2026-11-15", status: "researching", archived_at: null }, // today
    { id: "aS", title: "Submitted one", institution_or_provider: null, deadline: "2026-11-16", status: "submitted", archived_at: null },
    { id: "aA", title: "Archived", institution_or_provider: null, deadline: "2026-11-16", status: "preparing", archived_at: "2026-11-01" },
  ],
  tasks: [
    { id: "t1", application_id: "a7", title: "Ask Prof. Rao", due_date: "2026-11-16", status: "open" }, // tomorrow
    { id: "t2", application_id: "a7", title: "Done", due_date: "2026-11-15", status: "done" },
    { id: "t3", application_id: "a7", title: "Later", due_date: "2026-11-25", status: "open" },
  ],
  requirements: [
    { id: "r1", application_id: "a7", document_type: "Transcript", due_date: "2026-11-15", status: "in_progress" }, // today
    { id: "r2", application_id: "a7", document_type: "CV", due_date: "2026-11-15", status: "ready" },
    { id: "r3", application_id: "a7", document_type: "IELTS", due_date: null, status: "ready" },
  ],
  openings: [
    { id: "o1", title: "MEXT", expected_open_date: "2026-11-15", status: "watching" },
    { id: "o2", title: "Fulbright", expected_open_date: "2026-11-16", status: "watching" },
  ],
};

describe("Which reminders go out today", () => {
  it("picks deadlines at 14/7/3/1/0 days and due-today/tomorrow items only", () => {
    const keys = selectReminders(base).map((i) => i.key).sort();
    expect(keys).toEqual(["deadline:a0:0", "deadline:a7:7", "document:r1:0", "opening:o1:0", "task:t1:1"].sort());
  });

  it("never repeats a reminder already in the send log", () => {
    const items = selectReminders({ ...base, alreadySent: new Set(["deadline:a7:7", "opening:o1:0"]) });
    expect(items.map((i) => i.key)).not.toContain("deadline:a7:7");
    expect(items.map((i) => i.key)).not.toContain("opening:o1:0");
  });

  it("describes items clearly, soonest first", () => {
    const items = selectReminders(base);
    expect(items[0].days).toBe(0);
    const chevening = items.find((i) => i.key === "deadline:a7:7")!;
    expect(chevening.title).toBe("Chevening closes in 7 days");
    expect(chevening.detail).toBe("FCDO · 2 of 3 documents ready");
    expect(items.find((i) => i.key === "task:t1:1")!.title).toBe("Ask Prof. Rao: due tomorrow");
  });

  it("returns nothing when nothing is due", () => {
    expect(selectReminders({ ...base, apps: [], tasks: [], requirements: [], openings: [] })).toEqual([]);
  });
});

describe("Reminder email", () => {
  const items = selectReminders(base);
  const email = renderReminderEmail(items, "https://abroadatlas.example/", "Asha");

  it("has a helpful subject and links back to each application", () => {
    expect(email.subject).toMatch(/^AbroadAtlas: 5 reminders, starting with /);
    expect(email.html).toContain('href="https://abroadatlas.example/app/applications/a7"');
    expect(email.text).toContain("https://abroadatlas.example/app/applications/a7");
    expect(email.html).toContain("Hi Asha,");
  });

  it("includes an off switch", () => {
    expect(email.html).toContain("https://abroadatlas.example/app/settings");
    expect(email.text).toContain("Turn these emails off in Settings");
  });

  it("escapes user-entered text", () => {
    const evil = renderReminderEmail(
      [{ key: "k", kind: "task", date: today, days: 0, title: '<script>alert(1)</script>"', detail: "<b>x</b>", path: "/app" }],
      "https://x.example"
    );
    expect(evil.html).not.toContain("<script>");
    expect(evil.html).toContain("&lt;script&gt;");
    expect(evil.html).not.toContain("<b>x</b>");
  });

  it("uses the single item as the subject when there's only one", () => {
    expect(renderReminderEmail([items[0]], "https://x.example").subject).toBe(`AbroadAtlas: ${items[0].title}`);
  });
});

describe("Resend client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("refuses to send when not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("REMINDER_FROM_EMAIL", "");
    expect(isEmailConfigured()).toBe(false);
    expect((await sendEmail({ to: "a@b.c", subject: "s", html: "h", text: "t" })).ok).toBe(false);
  });

  it("posts to Resend with the API key and reports errors", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("REMINDER_FROM_EMAIL", "AbroadAtlas <onboarding@resend.dev>");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "email_1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const ok = await sendEmail({ to: "a@b.c", subject: "s", html: "h", text: "t" });
    expect(ok).toEqual({ ok: true, id: "email_1" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body as string).to).toEqual(["a@b.c"]);

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "domain not verified" }), { status: 403 })));
    const bad = await sendEmail({ to: "a@b.c", subject: "s", html: "h", text: "t" });
    expect(bad.ok).toBe(false);
    expect(bad.error).toContain("domain not verified");
  });
});

describe("Reminder allow-list", () => {
  it("allows everyone when the list is empty or unset", () => {
    expect(isReminderAllowed("anyone@example.com", "")).toBe(true);
    expect(isReminderAllowed("anyone@example.com", undefined)).toBe(true);
  });

  it("allows only listed addresses, ignoring case and spaces", () => {
    const list = " Owner@Gmail.com , second@example.com ";
    expect(isReminderAllowed("owner@gmail.com", list)).toBe(true);
    expect(isReminderAllowed("SECOND@example.com", list)).toBe(true);
    expect(isReminderAllowed("tester@example.com", list)).toBe(false);
    expect(isReminderAllowed(null, list)).toBe(false);
  });
});
