"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    // 1. Delete application records (cascades to requirements, tasks, links, status_history)
    await supabase.from("applications").delete().eq("user_id", userId);

    // 2. Delete sources (cascades to snapshots, chunks, facts)
    await supabase.from("sources").delete().eq("user_id", userId);

    // 3. Delete user documents
    await supabase.from("user_documents").delete().eq("user_id", userId);

    // 4. Delete conversations and messages
    await supabase.from("conversations").delete().eq("user_id", userId);

    // 5. Delete opening reminders
    await supabase.from("opening_reminders" as any).delete().eq("user_id", userId);

    // 6. Delete user profile
    await supabase.from("profiles").delete().eq("id", userId);

    // 7. Sign out session
    await supabase.auth.signOut();
  } catch (err: any) {
    return { error: err.message || "Failed to complete account deletion." };
  }

  redirect("/?deleted=true");
}

/**
 * Compiles a comprehensive JSON export of all applicant workspace data.
 */
export async function exportUserDataAction(): Promise<{ error?: string; data?: any }> {
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
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("applications").select("*").eq("user_id", userId),
    supabase.from("document_requirements").select("*").eq("user_id", userId),
    supabase.from("tasks").select("*").eq("user_id", userId),
    supabase.from("sources").select("id, source_type, display_name, source_url, file_size_bytes, ingestion_status, created_at").eq("user_id", userId),
    supabase.from("extracted_facts").select("*").eq("user_id", userId),
    supabase.from("opening_reminders" as any).select("*").eq("user_id", userId),
    supabase.from("status_history").select("*").eq("user_id", userId),
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
  };

  return { data: exportPayload };
}
