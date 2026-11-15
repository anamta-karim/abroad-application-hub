"use server";

import { createClient } from "@/lib/supabase/server";
import { consumeUsage, limitReachedMessage } from "@/lib/usage";

/** Saves a feedback note from the signed-in user, with the page it was sent from. */
export async function submitFeedbackAction(message: string, page: string | null): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again to send feedback." };

  const text = (message || "").trim();
  if (text.length < 3) return { error: "Please write a little more so we know what you mean." };
  if (text.length > 2000) return { error: "Please keep feedback under 2,000 characters." };

  const usage = await consumeUsage(supabase, "feedback");
  if (!usage.allowed) return { error: limitReachedMessage("feedback", usage.limit) };

  const safePage = page && page.startsWith("/") ? page.slice(0, 300) : null;
  const { error } = await supabase.from("feedback").insert({ user_id: user.id, message: text, page: safePage });

  if (error) {
    const missing = error.code === "PGRST205" || error.code === "42P01";
    return {
      error: missing
        ? "Feedback isn't set up yet (the 20261117000000_usage_limits_and_feedback.sql migration needs to be run)."
        : error.message,
    };
  }
  return { success: true };
}
