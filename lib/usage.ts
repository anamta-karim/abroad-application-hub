/**
 * Per-user daily limits, enforced atomically by the consume_usage() database
 * function (20261117000000_usage_limits_and_feedback.sql).
 *
 * Why: the Gemini key and outbound fetching are shared free-tier resources;
 * without limits one user could exhaust them for everyone.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, UsageKind } from "@/types/database";

export type { UsageKind };

const DEFAULT_LIMITS: Record<UsageKind, number> = { ai: 30, fetch: 20, feedback: 20 };
const ENV_NAMES: Record<UsageKind, string> = {
  ai: "DAILY_AI_LIMIT",
  fetch: "DAILY_FETCH_LIMIT",
  feedback: "DAILY_FEEDBACK_LIMIT",
};

export function dailyLimit(kind: UsageKind): number {
  const raw = Number(process.env[ENV_NAMES[kind]]);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_LIMITS[kind];
}

export interface UsageResult {
  allowed: boolean;
  limit: number;
}

/**
 * Counts one use for the signed-in user and says whether it's allowed.
 * If the limit system itself is unavailable (e.g. migration not run yet), it
 * fails open and logs, so a setup gap never breaks the app.
 */
export async function consumeUsage(supabase: SupabaseClient<Database>, kind: UsageKind): Promise<UsageResult> {
  const limit = dailyLimit(kind);
  const { data, error } = await supabase.rpc("consume_usage", { usage_kind: kind, daily_limit: limit });
  if (error) {
    console.warn(`[usage] limit check unavailable (${error.code || error.message}); allowing ${kind}`);
    return { allowed: true, limit };
  }
  return { allowed: data === true, limit };
}

export function limitReachedMessage(kind: UsageKind, limit: number): string {
  switch (kind) {
    case "ai":
      return `You've used today's ${limit} AI-written answers, so this was built directly from your sources instead. The limit resets tomorrow.`;
    case "fetch":
      return `You've reached today's limit of ${limit} web pages. Try again tomorrow, or upload the page as a PDF.`;
    case "feedback":
      return `Thanks! You've sent a lot of feedback today; please try again tomorrow.`;
  }
}
