"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isReminderAllowed } from "@/lib/reminders";
import { errorMessage } from "@/lib/errors";

export interface SettingsActionResult {
  error?: string;
  success?: boolean;
}

/**
 * Deletes all user data across all tables and storage, then signs out.
 */
export async function deleteUserDataAndAccountAction(): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userId = user.id;

  try {
    // 0. Delete stored PDF files first (database cascades do not reach Storage)
    const { data: storedSources } = await supabase
      .from("sources")
      .select("storage_path")
      .eq("user_id", userId)
      .not("storage_path", "is", null);

    const storagePaths = (storedSources || [])
      .map((s) => s.storage_path)
      .filter((p): p is string => Boolean(p));

    if (storagePaths.length > 0) {
      await supabase.storage.from("application-sources").remove(storagePaths);
    }

    // 1. Delete application records (cascades to requirements, tasks, links, status_history)
    await supabase.from("applications").delete().eq("user_id", userId);

    // 2. Delete sources (cascades to snapshots, chunks, facts)
    await supabase.from("sources").delete().eq("user_id", userId);

    // 3. Delete user documents
    await supabase.from("user_documents").delete().eq("user_id", userId);

    // 4. Delete conversations and messages
    await supabase.from("conversations").delete().eq("user_id", userId);

    // 5. Delete opening reminders
    await supabase.from("opening_reminders").delete().eq("user_id", userId);

    // 5b. Revoke the private calendar feed URL
    await supabase.from("calendar_feeds").delete().eq("user_id", userId);

    // 5c. Stop email reminders and clear their send log
    await supabase.from("reminder_settings").delete().eq("user_id", userId);
    await supabase.from("reminder_log").delete().eq("user_id", userId);

    // 5d. Academic profile, feedback notes and usage counters
    await supabase.from("academic_profiles").delete().eq("user_id", userId);
    await supabase.from("feedback").delete().eq("user_id", userId);
    await supabase.from("usage_counters").delete().eq("user_id", userId);

    // 5e. Recommendation letters and referees
    await supabase.from("recommendation_requests").delete().eq("user_id", userId);
    await supabase.from("recommenders").delete().eq("user_id", userId);

    // 6. Delete user profile
    await supabase.from("profiles").delete().eq("id", userId);

    // 7. Sign out session
    await supabase.auth.signOut();
  } catch (err) {
    return { error: errorMessage(err) || "Failed to complete account deletion." };
  }

  redirect("/?deleted=true");
}

/**
 * Compiles a comprehensive JSON export of all applicant workspace data.
 */
export async function exportUserDataAction(): Promise<{ error?: string; data?: Record<string, unknown> }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required." };
  }

  const userId = user.id;

  const [
    { data: profile },
    { data: applications },
    { data: requirements },
    { data: tasks },
    { data: sources },
    { data: facts },
    { data: reminders },
    { data: history },
    { data: academicProfile },
    { data: feedbackNotes },
    { data: referees },
    { data: letters },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("applications").select("*").eq("user_id", userId),
    supabase.from("document_requirements").select("*").eq("user_id", userId),
    supabase.from("tasks").select("*").eq("user_id", userId),
    supabase.from("sources").select("id, source_type, display_name, source_url, file_size_bytes, ingestion_status, created_at").eq("user_id", userId),
    supabase.from("extracted_facts").select("*").eq("user_id", userId),
    supabase.from("opening_reminders").select("*").eq("user_id", userId),
    supabase.from("status_history").select("*").eq("user_id", userId),
    supabase.from("academic_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("feedback").select("page, message, created_at").eq("user_id", userId),
    supabase.from("recommenders").select("*").eq("user_id", userId),
    supabase.from("recommendation_requests").select("*").eq("user_id", userId),
  ]);

  const exportPayload = {
    exportDate: new Date().toISOString(),
    user: {
      id: userId,
      email: user.email,
      displayName: profile?.display_name,
    },
    applications: applications || [],
    documentRequirements: requirements || [],
    tasks: tasks || [],
    sources: sources || [],
    extractedFacts: facts || [],
    openingReminders: reminders || [],
    statusHistory: history || [],
    academicProfile: academicProfile ?? null,
    feedback: feedbackNotes || [],
    recommenders: referees || [],
    recommendationLetters: letters || [],
  };

  return { data: exportPayload };
}

// ── Private calendar feed ──

export interface CalendarFeedResult {
  error?: string;
  token?: string | null;
}

const FEED_MIGRATION_HINT =
  "The calendar feed needs the 20261115000000_calendar_feeds.sql migration. Run it in the Supabase SQL Editor, then try again.";

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message || "";
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (/calendar_feeds/.test(msg) && /not find|does not exist/i.test(msg))
  );
}

/**
 * Creates the user's feed token, or replaces it (which breaks the old URL).
 */
export async function regenerateCalendarFeedAction(): Promise<CalendarFeedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { randomBytes } = await import("crypto");
  const token = randomBytes(32).toString("base64url"); // 43 URL-safe characters

  const { error } = await supabase
    .from("calendar_feeds")
    .upsert({ user_id: user.id, token, created_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) {
    return { error: isMissingTable(error) ? FEED_MIGRATION_HINT : error.message };
  }
  return { token };
}

/**
 * Deletes the feed token; subscribed calendars stop updating.
 */
export async function disableCalendarFeedAction(): Promise<CalendarFeedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { error } = await supabase.from("calendar_feeds").delete().eq("user_id", user.id);
  if (error) {
    return { error: isMissingTable(error) ? FEED_MIGRATION_HINT : error.message };
  }
  return { token: null };
}

// ── Email reminders ──

/** Turns the daily reminder email on or off for the signed-in user. */
export async function setEmailRemindersAction(enabled: boolean): Promise<{ error?: string; enabled?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  if (enabled && !isReminderAllowed(user.email)) {
    return { error: "Email reminders aren't available for your account in this version. Use Calendar Sync instead." };
  }

  const { error } = await supabase
    .from("reminder_settings")
    .upsert({ user_id: user.id, email_enabled: enabled }, { onConflict: "user_id" });

  if (error) {
    const missing = error.code === "PGRST205" || error.code === "42P01";
    return {
      error: missing
        ? "Email reminders need the 20261116000000_email_reminders.sql migration. Run it in the Supabase SQL Editor, then try again."
        : error.message,
    };
  }
  return { enabled };
}
