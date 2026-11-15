/**
 * Daily email reminder selection and email rendering. Pure functions so the
 * rules can be unit tested; the cron route does the data access and sending.
 */
import { daysBetween, formatDateLabel } from "@/lib/calendar";
import { ASK_NOTICE_DAYS, FOLLOW_UP_AFTER_DAYS, OPEN_LETTER_STATUSES, letterDueDate } from "@/lib/recommendations";
import type { LetterStatus } from "@/types/database";

/** Days before an application deadline on which we email (0 = the day itself). */
export const DEADLINE_OFFSETS = [14, 7, 3, 1, 0];
/** Tasks and documents: the day before and the day itself. */
export const DUE_OFFSETS = [1, 0];

export interface ReminderApp {
  id: string;
  title: string;
  institution_or_provider: string | null;
  deadline: string | null;
  status: string;
  archived_at: string | null;
}
export interface ReminderTask {
  id: string;
  application_id: string;
  title: string;
  due_date: string | null;
  status: string;
}
export interface ReminderRequirement {
  id: string;
  application_id: string;
  document_type: string;
  due_date: string | null;
  status: string;
}
export interface ReminderOpening {
  id: string;
  title: string;
  expected_open_date: string;
  status: string;
}

export interface ReminderLetter {
  id: string;
  application_id: string;
  status: LetterStatus;
  asked_on: string | null;
  due_on: string | null;
  recommender_name: string;
}

export interface ReminderItem {
  /** Stable key stored in reminder_log, e.g. "deadline:<id>:7". */
  key: string;
  kind: "deadline" | "task" | "document" | "letter" | "opening";
  date: string;
  days: number;
  title: string;
  detail: string;
  path: string;
}

export interface ReminderInput {
  apps: ReminderApp[];
  tasks: ReminderTask[];
  requirements: ReminderRequirement[];
  openings: ReminderOpening[];
  letters?: ReminderLetter[];
  today: string;
  /** Keys already emailed (from reminder_log). */
  alreadySent: Set<string>;
}

const PRE_SUBMISSION = new Set(["researching", "preparing"]);
const TASK_OPEN = new Set(["open", "in_progress"]);
const DOC_OUTSTANDING = new Set(["not_started", "in_progress", "requested"]);

function when(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** Reminders that are due today and haven't been emailed before. */
export function selectReminders(input: ReminderInput): ReminderItem[] {
  const { today, alreadySent } = input;
  const active = new Map(input.apps.filter((a) => !a.archived_at).map((a) => [a.id, a]));
  const items: ReminderItem[] = [];

  for (const app of active.values()) {
    if (!app.deadline || !PRE_SUBMISSION.has(app.status)) continue;
    const days = daysBetween(today, app.deadline);
    if (!DEADLINE_OFFSETS.includes(days)) continue;
    const docs = input.requirements.filter((r) => r.application_id === app.id && r.status !== "not_applicable");
    const ready = docs.filter((r) => r.status === "ready" || r.status === "submitted").length;
    items.push({
      key: `deadline:${app.id}:${days}`,
      kind: "deadline",
      date: app.deadline,
      days,
      title: `${app.title} closes ${when(days)}`,
      detail: [app.institution_or_provider, docs.length > 0 ? `${ready} of ${docs.length} documents ready` : null]
        .filter(Boolean)
        .join(" · "),
      path: `/app/applications/${app.id}`,
    });
  }

  for (const t of input.tasks) {
    const app = active.get(t.application_id);
    if (!app || !t.due_date || !TASK_OPEN.has(t.status)) continue;
    const days = daysBetween(today, t.due_date);
    if (!DUE_OFFSETS.includes(days)) continue;
    items.push({
      key: `task:${t.id}:${days}`,
      kind: "task",
      date: t.due_date,
      days,
      title: `${t.title}: due ${when(days)}`,
      detail: app.title,
      path: `/app/applications/${app.id}`,
    });
  }

  for (const r of input.requirements) {
    const app = active.get(r.application_id);
    if (!app || !r.due_date || !DOC_OUTSTANDING.has(r.status)) continue;
    const days = daysBetween(today, r.due_date);
    if (!DUE_OFFSETS.includes(days)) continue;
    items.push({
      key: `document:${r.id}:${days}`,
      kind: "document",
      date: r.due_date,
      days,
      title: `${r.document_type}: due ${when(days)}`,
      detail: app.title,
      path: `/app/applications/${app.id}`,
    });
  }

  for (const l of input.letters ?? []) {
    const app = active.get(l.application_id);
    if (!app || !OPEN_LETTER_STATUSES.has(l.status) || app.status === "rejected" || app.status === "withdrawn") continue;
    const due = letterDueDate(l, app.deadline);
    const days = due ? daysBetween(today, due) : null;
    const path = `/app/applications/${app.id}#letters-heading`;

    if (due && days !== null && DUE_OFFSETS.includes(days)) {
      items.push({
        key: `letter:${l.id}:${days}`,
        kind: "letter",
        date: due,
        days,
        title: `Letter from ${l.recommender_name}: due ${when(days)}`,
        detail: app.title,
        path,
      });
    } else if (l.status === "to_ask" && due && days !== null && days > 1 && days <= ASK_NOTICE_DAYS) {
      // Once per letter: referees need a few weeks' notice
      items.push({
        key: `letter-ask:${l.id}`,
        kind: "letter",
        date: due,
        days,
        title: `Ask ${l.recommender_name} for a recommendation letter`,
        detail: `${app.title} · due ${when(days)}`,
        path,
      });
    } else if (l.status === "asked" && l.asked_on && daysBetween(l.asked_on, today) >= FOLLOW_UP_AFTER_DAYS) {
      // Once per ask
      const waited = daysBetween(l.asked_on, today);
      items.push({
        key: `letter-follow:${l.id}:${l.asked_on}`,
        kind: "letter",
        date: today,
        days: 0,
        title: `Follow up with ${l.recommender_name} about your letter`,
        detail: `${app.title} · asked ${waited} days ago`,
        path,
      });
    }
  }

  for (const o of input.openings) {
    if (o.status !== "watching") continue;
    if (daysBetween(today, o.expected_open_date) !== 0) continue;
    items.push({
      key: `opening:${o.id}:0`,
      kind: "opening",
      date: o.expected_open_date,
      days: 0,
      title: `${o.title} is expected to open today`,
      detail: "Check the official page and start your application",
      path: "/app",
    });
  }

  return items
    .filter((i) => !alreadySent.has(i.key))
    .sort((a, b) => a.days - b.days || a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** One digest email for a user's reminders. */
export function renderReminderEmail(items: ReminderItem[], appUrl: string, name?: string | null): RenderedEmail {
  const base = appUrl.replace(/\/+$/, "");
  const subject =
    items.length === 1 ? `AbroadAtlas: ${items[0].title}` : `AbroadAtlas: ${items.length} reminders, starting with ${items[0].title}`;
  const greeting = name ? `Hi ${name},` : "Hi,";

  const textLines = [
    greeting,
    "",
    "Here's what's coming up in your study-abroad applications:",
    "",
    ...items.map((i) => `- ${i.title} (${formatDateLabel(i.date)})${i.detail ? `\n  ${i.detail}` : ""}\n  ${base}${i.path}`),
    "",
    `Turn these emails off in Settings: ${base}/app/settings`,
  ];

  const rows = items
    .map(
      (i) => `<tr><td style="padding:12px 0;border-bottom:1px solid #e2e8f0">
  <a href="${escapeHtml(base + i.path)}" style="color:#1e3a5f;font-weight:600;text-decoration:none">${escapeHtml(i.title)}</a>
  <div style="color:#64748b;font-size:13px;margin-top:2px">${escapeHtml(formatDateLabel(i.date))}${i.detail ? ` · ${escapeHtml(i.detail)}` : ""}</div>
</td></tr>`
    )
    .join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:24px">
<tr><td>
  <div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#3e72a6;text-transform:uppercase">AbroadAtlas</div>
  <p style="font-size:15px;margin:12px 0 4px">${escapeHtml(greeting)}</p>
  <p style="font-size:15px;margin:0 0 8px">Here's what's coming up in your study-abroad applications:</p>
  <table role="presentation" width="100%">${rows}</table>
  <p style="font-size:12px;color:#64748b;margin-top:20px">You get these because email reminders are on.
  <a href="${escapeHtml(base)}/app/settings" style="color:#3e72a6">Turn them off in Settings</a>.</p>
</td></tr>
</table>
</body></html>`;

  return { subject, html, text: textLines.join("\n") };
}

/**
 * Who may use email reminders. REMINDER_ALLOWED_EMAILS is a comma-separated
 * list; when it's empty or unset, everyone may. Used while emails go through
 * Resend's test sender, which only delivers to the Resend account owner.
 */
export function isReminderAllowed(
  email: string | null | undefined,
  allowList: string | undefined = process.env.REMINDER_ALLOWED_EMAILS
): boolean {
  const allowed = (allowList || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return true;
  return Boolean(email) && allowed.includes(email!.trim().toLowerCase());
}
