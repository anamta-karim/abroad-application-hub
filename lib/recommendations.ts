/**
 * Recommendation-letter tracker: statuses, input validation, how many letters
 * an application asks for (read from its sources), what to do next for each
 * letter, and email drafts the user sends from their own mail app.
 * Pure functions, unit tested.
 */
import { daysBetween, formatDateLabel } from "@/lib/calendar";
import { sentencesOf, type EligibilityChunk } from "@/lib/eligibility";
import type { LetterStatus } from "@/types/database";

export const LETTER_STATUSES: LetterStatus[] = ["to_ask", "asked", "agreed", "submitted", "declined"];

export const LETTER_STATUS_LABELS: Record<LetterStatus, string> = {
  to_ask: "Not asked yet",
  asked: "Asked, awaiting reply",
  agreed: "Agreed to write",
  submitted: "Submitted",
  declined: "Declined",
};

/** Letters still in progress (the user has something to do). */
export const OPEN_LETTER_STATUSES: ReadonlySet<LetterStatus> = new Set(["to_ask", "asked", "agreed"]);

/** Referees usually want three to four weeks' notice. */
export const ASK_NOTICE_DAYS = 28;
/** Follow up when an ask has had no reply for this long. */
export const FOLLOW_UP_AFTER_DAYS = 7;
/** Send a gentle reminder this close to the due date. */
export const REMIND_BEFORE_DAYS = 7;

export function isLetterStatus(value: unknown): value is LetterStatus {
  return typeof value === "string" && (LETTER_STATUSES as string[]).includes(value);
}

// ── Input validation ──

export interface RecommenderInput {
  name: string;
  role: string | null;
  email: string | null;
  notes: string | null;
}

const EMAIL_RE = /^[^\s@?&#<>"',;]+@[^\s@?&#<>"',;]+\.[^\s@?&#<>"',;]+$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function parseRecommenderInput(raw: {
  name?: unknown;
  role?: unknown;
  email?: unknown;
  notes?: unknown;
}): { value?: RecommenderInput; error?: string } {
  const name = text(raw.name);
  if (!name) return { error: "Please enter the referee's name." };
  if (name.length > 120) return { error: "The name is too long (120 characters at most)." };

  const role = text(raw.role);
  if (role.length > 160) return { error: "The role is too long (160 characters at most)." };

  const email = text(raw.email);
  if (email && (email.length > 254 || !EMAIL_RE.test(email))) {
    return { error: "That email address doesn't look right." };
  }

  const notes = typeof raw.notes === "string" ? raw.notes.trim() : "";
  if (notes.length > 2000) return { error: "The notes are too long (2,000 characters at most)." };

  return { value: { name, role: role || null, email: email || null, notes: notes || null } };
}

/** "" → null, a valid YYYY-MM-DD → itself, anything else → "invalid". */
export function parseDateInput(value: unknown): string | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "invalid";
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? value : "invalid";
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// ── How many letters the application asks for ──

export interface LettersNeeded {
  count: number;
  quote: string;
  pageNumber: number | null;
  sourceTitle: string;
}

/** Keywords used to pre-filter source chunks in the database. */
export const LETTER_KEYWORDS = ["recommendation", "referee", "reference"];

const COUNT_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };

const LETTER_COUNT_RE =
  /\b(an?|one|two|three|four|five|[1-5])\s+(?:\(\d\)\s+)?(?:(?:academic|professional|confidential|signed|formal|written|separate|independent|employer|work|personal)\s+(?:or\s+\w+\s+)?){0,2}(letters?\s+of\s+(?:recommendation|reference)|recommendation\s+letters?|reference\s+letters?|letters?\s+from\s+referees|referee\s+(?:reports?|letters?)|references|referees|recommenders|recommendations)\b/gi;

/** The letter counts stated in one sentence, e.g. "two letters of recommendation" → [2]. */
export function letterCountsIn(sentence: string): number[] {
  const counts: number[] = [];
  for (const m of sentence.matchAll(LETTER_COUNT_RE)) {
    const word = m[1].toLowerCase();
    const count = COUNT_WORDS[word] ?? Number(word);
    const noun = m[2].toLowerCase();
    const plural = noun.startsWith("letter") ? noun.startsWith("letters") : noun.endsWith("s");
    // "two references" / "a letter of recommendation", but not "a references section"
    if (count >= 2 === plural) counts.push(count);
  }
  return counts;
}

/**
 * How many letters the sources ask for. A plural statement ("two referees")
 * wins over a singular one ("at least one referee should be an academic"),
 * which is usually a condition on one of the letters rather than the total.
 */
export function lettersNeededFrom(chunks: EligibilityChunk[]): LettersNeeded | null {
  let single: LettersNeeded | null = null;
  for (const chunk of chunks) {
    for (const sentence of sentencesOf(chunk.content || "")) {
      for (const count of letterCountsIn(sentence)) {
        const found = { count, quote: sentence, pageNumber: chunk.page_number, sourceTitle: chunk.sourceTitle };
        if (count >= 2) return found;
        single ??= found;
      }
    }
  }
  return single;
}

// ── Progress ──

export interface LetterProgress {
  submitted: number;
  open: number;
  declined: number;
  /** Letters the application needs: from its sources, else one per referee asked. */
  target: number;
  /** From the sources, if stated. */
  needed: number | null;
  /** Referees still to add to reach the number needed. */
  refereesMissing: number;
  done: boolean;
}

export function letterProgress(letters: { status: LetterStatus }[], needed: number | null): LetterProgress {
  const submitted = letters.filter((l) => l.status === "submitted").length;
  const open = letters.filter((l) => OPEN_LETTER_STATUSES.has(l.status)).length;
  const declined = letters.filter((l) => l.status === "declined").length;
  const target = needed ?? submitted + open;
  return {
    submitted,
    open,
    declined,
    target,
    needed,
    refereesMissing: needed ? Math.max(0, needed - submitted - open) : 0,
    done: target > 0 && submitted >= target,
  };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** "1 of 2 letters submitted · add 1 more referee" */
export function letterProgressText(p: LetterProgress): string {
  if (p.submitted + p.open === 0) {
    return p.needed ? `${plural(p.needed, "letter")} needed · no referees added yet` : "No referees added yet";
  }
  const base = `${p.submitted} of ${p.target} ${p.target === 1 ? "letter" : "letters"} submitted`;
  return p.refereesMissing > 0 ? `${base} · add ${p.refereesMissing} more ${p.refereesMissing === 1 ? "referee" : "referees"}` : base;
}

// ── What to do next for one letter ──

export type AdviceTone = "bad" | "warn" | "info";

export interface LetterAdvice {
  tone: AdviceTone;
  text: string;
}

export interface LetterTiming {
  status: LetterStatus;
  asked_on: string | null;
  due_on: string | null;
}

function when(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** The letter's own due date, else the application deadline. */
export function letterDueDate(letter: { due_on: string | null }, appDeadline: string | null): string | null {
  return letter.due_on ?? appDeadline;
}

export function letterAdvice(letter: LetterTiming, appDeadline: string | null, today: string): LetterAdvice | null {
  const due = letterDueDate(letter, appDeadline);
  const days = due ? daysBetween(today, due) : null;

  switch (letter.status) {
    case "submitted":
      return null;
    case "declined":
      return { tone: "info", text: "Declined. Ask someone else if you still need a letter." };
    case "to_ask":
      if (days === null) return { tone: "info", text: "Ask 3 to 4 weeks before it's due. Add a due date to get a reminder." };
      if (days < 0) return { tone: "bad", text: `The due date passed ${when(days)}. Ask now, or check whether late letters are accepted.` };
      if (days <= ASK_NOTICE_DAYS) return { tone: "warn", text: `Ask now: due ${when(days)}, and referees usually want 3 to 4 weeks' notice.` };
      return { tone: "info", text: `Ask by ${formatDateLabel(addDays(due!, -ASK_NOTICE_DAYS))} to give 4 weeks' notice.` };
    case "asked": {
      if (days !== null && days < 0) return { tone: "bad", text: `Overdue (due ${when(days)}) and no reply yet. Follow up today.` };
      const waited = letter.asked_on ? daysBetween(letter.asked_on, today) : null;
      if (waited !== null && waited >= FOLLOW_UP_AFTER_DAYS) {
        return { tone: "warn", text: `No reply after ${waited} days. Send a polite follow-up.` };
      }
      if (days !== null && days <= REMIND_BEFORE_DAYS) return { tone: "warn", text: `Due ${when(days)} and no reply yet. Follow up.` };
      return null;
    }
    case "agreed":
      if (days === null) return null;
      if (days < 0) return { tone: "bad", text: `Overdue (due ${when(days)}). Check with your referee and the portal.` };
      if (days <= REMIND_BEFORE_DAYS) return { tone: "warn", text: `Due ${when(days)}. Send a gentle reminder.` };
      return null;
  }
}

// ── Nudges for the dashboard's "This week" list ──

export interface LetterNudge {
  /** due: due within the horizon or overdue · ask: time to ask · follow_up: no reply for a while */
  kind: "due" | "ask" | "follow_up";
  /** Days until due (due/ask), or days since asking (follow_up). */
  days: number;
  date: string;
}

export function letterNudge(
  letter: LetterTiming,
  appDeadline: string | null,
  today: string,
  horizonDays = REMIND_BEFORE_DAYS
): LetterNudge | null {
  if (!OPEN_LETTER_STATUSES.has(letter.status)) return null;
  const due = letterDueDate(letter, appDeadline);
  const days = due ? daysBetween(today, due) : null;
  if (due && days !== null && days <= horizonDays) return { kind: "due", days, date: due };
  if (letter.status === "to_ask" && due && days !== null && days <= ASK_NOTICE_DAYS) return { kind: "ask", days, date: due };
  if (letter.status === "asked" && letter.asked_on) {
    const waited = daysBetween(letter.asked_on, today);
    if (waited >= FOLLOW_UP_AFTER_DAYS) return { kind: "follow_up", days: waited, date: letter.asked_on };
  }
  return null;
}

// ── Email drafts (opened in the user's own mail app) ──

export interface EmailDraft {
  subject: string;
  body: string;
}

export function letterEmailDraft(input: {
  status: LetterStatus;
  recommenderName: string;
  applicantName: string | null;
  appTitle: string;
  institution: string | null;
  dueDate: string | null;
}): EmailDraft | null {
  const { status, recommenderName, applicantName, appTitle, institution, dueDate } = input;
  const program = institution ? `${appTitle} at ${institution}` : appTitle;
  const due = dueDate ? formatDateLabel(dueDate).replace(/^\w+, /, "") : null;
  const signOff = `Best regards,\n${applicantName || ""}`.trimEnd();
  const greeting = `Dear ${recommenderName},`;

  switch (status) {
    case "to_ask":
      return {
        subject: `Request for a recommendation letter: ${appTitle}`,
        body: [
          greeting,
          `I'm applying to ${program} and would be very grateful if you would write a letter of recommendation for me.${due ? ` The letter is due by ${due}.` : ""}`,
          "I'm happy to send my CV, transcript, statement of purpose and anything else that would help, and to explain how the letter is submitted.",
          "Thank you for considering it.",
          signOff,
        ].join("\n\n"),
      };
    case "asked":
      return {
        subject: `Following up: recommendation letter for ${appTitle}`,
        body: [
          greeting,
          `I'm following up on my request for a letter of recommendation for ${program}.${due ? ` It's due by ${due}.` : ""} I understand you're busy, so please let me know either way.`,
          "Thank you very much.",
          signOff,
        ].join("\n\n"),
      };
    case "agreed":
      return {
        subject: `Reminder: recommendation letter for ${appTitle}`,
        body: [
          greeting,
          `Thank you again for agreeing to write a letter of recommendation for ${program}. This is a gentle reminder that it's due${due ? ` by ${due}` : " soon"}.`,
          "Please let me know if there's anything I can send to help.",
          signOff,
        ].join("\n\n"),
      };
    case "submitted":
      return {
        subject: `Thank you for your recommendation letter`,
        body: [
          greeting,
          `Thank you so much for writing and submitting my letter of recommendation for ${program}. I really appreciate your time and support, and I'll let you know how my application goes.`,
          signOff,
        ].join("\n\n"),
      };
    case "declined":
      return null;
  }
}

/** A mailto: link with the draft filled in. The address was validated on save. */
export function mailtoHref(email: string, draft: EmailDraft): string {
  return `mailto:${email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
}

export const EMAIL_ACTION_LABELS: Record<LetterStatus, string | null> = {
  to_ask: "Email to ask",
  asked: "Email a follow-up",
  agreed: "Email a reminder",
  submitted: "Email a thank-you",
  declined: null,
};
