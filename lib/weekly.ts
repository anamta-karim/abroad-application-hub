/**
 * Builds the dashboard's "This week" list: everything across all
 * applications that needs attention soon, ranked by urgency.
 */
import { daysBetween } from "@/lib/calendar";
import { LETTER_STATUS_LABELS, letterNudge } from "@/lib/recommendations";
import type { LetterStatus } from "@/types/database";

export interface WeeklyApp {
  id: string;
  title: string;
  deadline: string | null;
  status: string;
  archived_at: string | null;
}
export interface WeeklyRequirement {
  id: string;
  application_id: string;
  document_type: string;
  due_date: string | null;
  status: string;
}
export interface WeeklyTask {
  id: string;
  application_id: string;
  title: string;
  due_date: string | null;
  status: string;
}
export interface WeeklyReminder {
  id: string;
  title: string;
  expected_open_date: string;
  status: string;
}

export interface WeeklyLetter {
  id: string;
  application_id: string;
  status: LetterStatus;
  asked_on: string | null;
  due_on: string | null;
  recommender_name: string;
}

export type ActionKind = "deadline" | "document" | "task" | "letter" | "opening";
export type Urgency = "overdue" | "urgent" | "soon";

export interface ActionItem {
  key: string;
  kind: ActionKind;
  urgency: Urgency;
  /** Days from today (negative = overdue). */
  days: number;
  date: string;
  title: string;
  detail: string;
  href: string;
}

/** Statuses where the user still has work to do before the deadline. */
const PRE_SUBMISSION = new Set(["researching", "preparing"]);
const DOC_DONE = new Set(["ready", "submitted", "not_applicable"]);
const TASK_OPEN = new Set(["open", "in_progress"]);
const KIND_ORDER: Record<ActionKind, number> = { deadline: 0, document: 1, task: 2, letter: 3, opening: 4 };
/** Applications whose letters no longer matter. */
const CLOSED_APP = new Set(["rejected", "withdrawn"]);

export const DEADLINE_HORIZON_DAYS = 14;
export const ITEM_HORIZON_DAYS = 7;

function urgencyFor(days: number): Urgency {
  if (days < 0) return "overdue";
  if (days <= 3) return "urgent";
  return "soon";
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function whenLabel(days: number): string {
  if (days < -1) return `${Math.abs(days)} days overdue`;
  if (days === -1) return "1 day overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** "Book IELTS: due tomorrow" / "Book IELTS: 2 days overdue" */
function dueTitle(name: string, days: number): string {
  return days < 0 ? `${name}: ${whenLabel(days)}` : `${name}: due ${whenLabel(days)}`;
}

export function buildWeeklyActions(input: {
  apps: WeeklyApp[];
  requirements: WeeklyRequirement[];
  tasks: WeeklyTask[];
  reminders: WeeklyReminder[];
  letters?: WeeklyLetter[];
  today: string;
}): ActionItem[] {
  const { apps, requirements, tasks, reminders, today, letters = [] } = input;
  const activeApps = new Map(apps.filter((a) => !a.archived_at).map((a) => [a.id, a]));
  const items: ActionItem[] = [];

  // 1. Application deadlines in the next two weeks that still need work
  for (const app of activeApps.values()) {
    if (!app.deadline || !PRE_SUBMISSION.has(app.status)) continue;
    const days = daysBetween(today, app.deadline);
    if (days < 0 || days > DEADLINE_HORIZON_DAYS) continue;

    const docs = requirements.filter((r) => r.application_id === app.id && r.status !== "not_applicable");
    const ready = docs.filter((r) => DOC_DONE.has(r.status)).length;
    const openTasks = tasks.filter((t) => t.application_id === app.id && TASK_OPEN.has(t.status)).length;

    const parts: string[] = [];
    parts.push(docs.length === 0 ? "No documents listed yet" : `${ready} of ${docs.length} documents ready`);
    if (openTasks > 0) parts.push(plural(openTasks, "open task"));

    items.push({
      key: `deadline-${app.id}`,
      kind: "deadline",
      urgency: urgencyFor(days),
      days,
      date: app.deadline,
      title: `${app.title} closes ${whenLabel(days)}`,
      detail: parts.join(" · "),
      href: `/app/applications/${app.id}`,
    });
  }

  // 2. Documents due within a week (or overdue) that aren't ready
  for (const r of requirements) {
    const app = activeApps.get(r.application_id);
    if (!app || !r.due_date || DOC_DONE.has(r.status)) continue;
    const days = daysBetween(today, r.due_date);
    if (days > ITEM_HORIZON_DAYS) continue;
    items.push({
      key: `document-${r.id}`,
      kind: "document",
      urgency: urgencyFor(days),
      days,
      date: r.due_date,
      title: dueTitle(r.document_type, days),
      detail: app.title,
      href: `/app/applications/${app.id}`,
    });
  }

  // 3. Open tasks due within a week (or overdue)
  for (const t of tasks) {
    const app = activeApps.get(t.application_id);
    if (!app || !t.due_date || !TASK_OPEN.has(t.status)) continue;
    const days = daysBetween(today, t.due_date);
    if (days > ITEM_HORIZON_DAYS) continue;
    items.push({
      key: `task-${t.id}`,
      kind: "task",
      urgency: urgencyFor(days),
      days,
      date: t.due_date,
      title: dueTitle(t.title, days),
      detail: app.title,
      href: `/app/applications/${app.id}`,
    });
  }

  // 4. Recommendation letters: due soon, time to ask, or no reply for a while
  for (const l of letters) {
    const app = activeApps.get(l.application_id);
    if (!app || CLOSED_APP.has(app.status)) continue;
    const nudge = letterNudge(l, app.deadline, today, ITEM_HORIZON_DAYS);
    if (!nudge) continue;
    const base = { key: `letter-${l.id}`, kind: "letter" as const, href: `/app/applications/${app.id}#letters-heading` };
    if (nudge.kind === "due") {
      items.push({
        ...base,
        urgency: urgencyFor(nudge.days),
        days: nudge.days,
        date: nudge.date,
        title: dueTitle(`Letter from ${l.recommender_name}`, nudge.days),
        detail: `${app.title} · ${LETTER_STATUS_LABELS[l.status]}`,
      });
    } else if (nudge.kind === "ask") {
      items.push({
        ...base,
        urgency: nudge.days <= 14 ? "urgent" : "soon",
        days: nudge.days,
        date: nudge.date,
        title: `Ask ${l.recommender_name} for a letter`,
        detail: `${app.title} · due ${whenLabel(nudge.days)}`,
      });
    } else {
      items.push({
        ...base,
        urgency: "soon",
        days: 0,
        date: today,
        title: `Follow up with ${l.recommender_name}`,
        detail: `${app.title} · asked ${nudge.days} days ago, no reply yet`,
      });
    }
  }

  // 5. Watchlist calls expected to open within a week (or already due)
  for (const rem of reminders) {
    if (rem.status !== "watching") continue;
    const days = daysBetween(today, rem.expected_open_date);
    if (days > ITEM_HORIZON_DAYS) continue;
    items.push({
      key: `opening-${rem.id}`,
      kind: "opening",
      urgency: days <= 0 ? "urgent" : "soon",
      days,
      date: rem.expected_open_date,
      title: days <= 0 ? `${rem.title} should be open now` : `${rem.title} expected to open ${whenLabel(days)}`,
      detail: days <= 0 ? "Check the official page and start your application" : "On your watchlist",
      href: "/app",
    });
  }

  const urgencyRank: Record<Urgency, number> = { overdue: 0, urgent: 1, soon: 2 };
  return items.sort(
    (a, b) =>
      urgencyRank[a.urgency] - urgencyRank[b.urgency] ||
      a.days - b.days ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.title.localeCompare(b.title)
  );
}
