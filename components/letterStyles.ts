import type { AdviceTone } from "@/lib/recommendations";
import type { LetterStatus } from "@/types/database";

/** Shared by the application card (client) and the Recommenders page (server). */
export const LETTER_STATUS_STYLES: Record<LetterStatus, string> = {
  to_ask: "bg-slate-50 text-ink-main border-slate-200",
  asked: "bg-blue-50 text-blue-800 border-blue-200",
  agreed: "bg-violet-50 text-violet-800 border-violet-200",
  submitted: "bg-teal-50 text-teal-800 border-teal-200",
  declined: "bg-red-50 text-red-700 border-red-200",
};

export const ADVICE_STYLES: Record<AdviceTone, string> = {
  bad: "text-red-700",
  warn: "text-amber-800",
  info: "text-ink-muted",
};
