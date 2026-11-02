"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  RecordType,
  ApplicationStatus,
  RequirementStatus,
  TaskStatus,
} from "@/types/database";

export interface ActionResponse {
  error?: string;
  success?: boolean;
}

// ── 1. Create Application ──
export async function createApplicationAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = (formData.get("title") as string)?.trim();
  const recordType = (formData.get("recordType") as RecordType) || "program";
  const institution = (formData.get("institution") as string)?.trim() || null;
  const country = (formData.get("country") as string)?.trim() || null;
  const degreeLevel = (formData.get("degreeLevel") as string)?.trim() || null;
  const fieldOfStudy = (formData.get("fieldOfStudy") as string)?.trim() || null;
  const studyPeriod = (formData.get("studyPeriod") as string)?.trim() || null;
  const deadline = (formData.get("deadline") as string)?.trim() || null;
  const officialUrl = (formData.get("officialUrl") as string)?.trim() || null;
  const userNotes = (formData.get("userNotes") as string)?.trim() || null;
  const initialStatus: ApplicationStatus =
    (formData.get("status") as ApplicationStatus) || "preparing";

  if (!title) {
    return { error: "Please enter an application title." };
  }

  // Insert application
  const { data: newApp, error: insertError } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      title,
      record_type: recordType,
      institution_or_provider: institution,
      country,
      degree_level: degreeLevel,
      field_of_study: fieldOfStudy,
      study_period: studyPeriod,
      deadline,
      official_url: officialUrl,
      user_notes: userNotes,
      status: initialStatus,
      verification_state: "unreviewed",
    })
    .select("id")
    .single();

  if (insertError || !newApp) {
    return { error: insertError?.message || "Failed to create application." };
  }

  // Record initial status history
  await supabase.from("status_history").insert({
    user_id: user.id,
    application_id: newApp.id,
    from_status: null,
    to_status: initialStatus,
    note: "Application record created",
  });

  revalidatePath("/app");
  redirect(`/app/applications/${newApp.id}`);
}

// ── 2. Update Application ──
export async function updateApplicationAction(
  applicationId: string,
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch current application to check for status change
  const { data: currentApp } = await supabase
    .from("applications")
    .select("status")
    .eq("id", applicationId)
    .single();

  const title = (formData.get("title") as string)?.trim();
  const recordType = (formData.get("recordType") as RecordType) || "program";
  const institution = (formData.get("institution") as string)?.trim() || null;
  const country = (formData.get("country") as string)?.trim() || null;
  const degreeLevel = (formData.get("degreeLevel") as string)?.trim() || null;
  const fieldOfStudy = (formData.get("fieldOfStudy") as string)?.trim() || null;
  const studyPeriod = (formData.get("studyPeriod") as string)?.trim() || null;
  const deadline = (formData.get("deadline") as string)?.trim() || null;
  const officialUrl = (formData.get("officialUrl") as string)?.trim() || null;
  const userNotes = (formData.get("userNotes") as string)?.trim() || null;
  const newStatus = (formData.get("status") as ApplicationStatus) || "preparing";

  if (!title) {
    return { error: "Please enter an application title." };
  }

  const { error: updateError } = await supabase
    .from("applications")
    .update({
      title,
      record_type: recordType,
      institution_or_provider: institution,
      country,
      degree_level: degreeLevel,
      field_of_study: fieldOfStudy,
      study_period: studyPeriod,
      deadline,
      official_url: officialUrl,
      user_notes: userNotes,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updateError) {
    return { error: updateError.message };
  }

  // If status changed, log to status_history
  if (currentApp && currentApp.status !== newStatus) {
    await supabase.from("status_history").insert({
      user_id: user.id,
      application_id: applicationId,
      from_status: currentApp.status,
      to_status: newStatus,
      note: "Status updated in application settings",
    });
  }

  revalidatePath("/app");
  revalidatePath(`/app/applications/${applicationId}`);
  redirect(`/app/applications/${applicationId}`);
}

// ── 3. Delete Application ──
export async function deleteApplicationAction(
  applicationId: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await supabase
    .from("applications")
    .delete()
    .eq("id", applicationId);

  revalidatePath("/app");
  redirect("/app");
}

// ── 4. Quick Status Update ──
export async function updateStatusQuickAction(
  applicationId: string,
  newStatus: ApplicationStatus,
  note?: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const { data: currentApp } = await supabase
    .from("applications")
    .select("status")
    .eq("id", applicationId)
    .single();

  const { error } = await supabase
    .from("applications")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) {
    return { error: error.message };
  }

  if (currentApp && currentApp.status !== newStatus) {
    await supabase.from("status_history").insert({
      user_id: user.id,
      application_id: applicationId,
      from_status: currentApp.status,
      to_status: newStatus,
      note: note || `Status changed to ${newStatus.replace("_", " ")}`,
    });
  }

  revalidatePath("/app");
  revalidatePath(`/app/applications/${applicationId}`);
  return { success: true };
}

// ── 5. Document Requirement Actions ──
export async function addRequirementAction(
  applicationId: string,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const documentType = (formData.get("documentType") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim() || null;
  const dueDate = (formData.get("dueDate") as string)?.trim() || null;
  const status: RequirementStatus =
    (formData.get("status") as RequirementStatus) || "not_started";

  if (!documentType) {
    return { error: "Please enter the document name or requirement." };
  }

  const { error } = await supabase.from("document_requirements").insert({
    user_id: user.id,
    application_id: applicationId,
    document_type: documentType,
    notes,
    due_date: dueDate,
    status,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app");
  revalidatePath(`/app/applications/${applicationId}`);
  return { success: true };
}

export async function updateRequirementStatusAction(
  requirementId: string,
  applicationId: string,
  newStatus: RequirementStatus
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const { error } = await supabase
    .from("document_requirements")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requirementId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app");
  revalidatePath(`/app/applications/${applicationId}`);
  return { success: true };
}

export async function deleteRequirementAction(
  requirementId: string,
  applicationId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const { error } = await supabase
    .from("document_requirements")
    .delete()
    .eq("id", requirementId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app");
  revalidatePath(`/app/applications/${applicationId}`);
  return { success: true };
}

// ── 6. Task Actions ──
export async function addTaskAction(
  applicationId: string,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const dueDate = (formData.get("dueDate") as string)?.trim() || null;

  if (!title) {
    return { error: "Please enter a task title." };
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    application_id: applicationId,
    title,
    description,
    due_date: dueDate,
    status: "open",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/app/applications/${applicationId}`);
  return { success: true };
}

export async function toggleTaskAction(
  taskId: string,
  applicationId: string,
  currentStatus: TaskStatus
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const newStatus: TaskStatus = currentStatus === "done" ? "open" : "done";
  const completedAt = newStatus === "done" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("tasks")
    .update({
      status: newStatus,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/app/applications/${applicationId}`);
  return { success: true };
}

export async function deleteTaskAction(
  taskId: string,
  applicationId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/app/applications/${applicationId}`);
  return { success: true };
}

// ── 7. Program-Scholarship Linking Actions ──
export async function linkApplicationsAction(
  programId: string,
  scholarshipId: string,
  relationshipNote?: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const { error } = await supabase.from("application_links").insert({
    user_id: user.id,
    program_application_id: programId,
    scholarship_application_id: scholarshipId,
    relationship_note: relationshipNote || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/app/applications/${programId}`);
  revalidatePath(`/app/applications/${scholarshipId}`);
  return { success: true };
}

export async function unlinkApplicationsAction(
  linkId: string,
  revalidateAppId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const { error } = await supabase
    .from("application_links")
    .delete()
    .eq("id", linkId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/app/applications/${revalidateAppId}`);
  return { success: true };
}

// ── 12. Archive / Unarchive Application ──
export async function archiveApplicationAction(
  applicationId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const { error } = await supabase
    .from("applications")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app");
  revalidatePath(`/app/applications/${applicationId}`);
  return { success: true };
}

export async function unarchiveApplicationAction(
  applicationId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  const { error } = await supabase
    .from("applications")
    .update({ archived_at: null })
    .eq("id", applicationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app");
  revalidatePath(`/app/applications/${applicationId}`);
  return { success: true };
}

// ── 13. Rollover Deadline to Next Cycle ──
export async function rolloverDeadlineAction(
  applicationId: string,
  newDeadline: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  if (!newDeadline) {
    return { error: "New deadline date is required" };
  }

  const { error } = await supabase
    .from("applications")
    .update({
      deadline: newDeadline,
      archived_at: null,
      status: "preparing",
    })
    .eq("id", applicationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/app");
  revalidatePath(`/app/applications/${applicationId}`);
  return { success: true };
}

// ── 14. Opening Reminders / Intake Watchlist Actions ──
export async function createOpeningReminderAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = (formData.get("title") as string)?.trim();
  const recordType = (formData.get("recordType") as RecordType) || "program";
  const institution = (formData.get("institution") as string)?.trim() || null;
  const expectedOpenDate = (formData.get("expectedOpenDate") as string)?.trim();
  const targetCycle = (formData.get("targetCycle") as string)?.trim() || null;
  const officialUrl = (formData.get("officialUrl") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!title) {
    return { error: "Please enter a name for the program or scholarship." };
  }

  if (!expectedOpenDate) {
    return { error: "Please enter the expected opening date." };
  }

  // Attempt insert into opening_reminders table
  const { error: insertError } = await supabase.from("opening_reminders" as any).insert({
    user_id: user.id,
    title,
    record_type: recordType,
    institution_or_provider: institution,
    expected_open_date: expectedOpenDate,
    target_cycle: targetCycle,
    official_url: officialUrl,
    notes,
    status: "watching",
  });

  if (insertError) {
    // Graceful fallback if table not yet migrated on remote Supabase
    const { error: fallbackError } = await supabase.from("applications").insert({
      user_id: user.id,
      title,
      record_type: recordType,
      institution_or_provider: institution,
      status: "researching",
      study_period: targetCycle,
      official_url: officialUrl,
      user_notes: `[OPENING_REMINDER:${expectedOpenDate}] ${notes || ""}`.trim(),
      verification_state: "unreviewed",
    });

    if (fallbackError) {
      return { error: fallbackError.message || "Failed to create reminder." };
    }
  }

  revalidatePath("/app");
  return { success: true };
}

export async function deleteOpeningReminderAction(
  reminderId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  // Attempt delete from opening_reminders
  const { error } = await supabase
    .from("opening_reminders" as any)
    .delete()
    .eq("id", reminderId);

  if (error) {
    // Also try delete from applications fallback if stored there
    await supabase.from("applications").delete().eq("id", reminderId);
  }

  revalidatePath("/app");
  return { success: true };
}

export async function convertReminderToApplicationAction(
  reminderId: string
): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required" };
  }

  // Fetch reminder details
  const { data: reminderData } = await supabase
    .from("opening_reminders" as any)
    .select("*")
    .eq("id", reminderId)
    .single();

  const reminder = reminderData as any;

  let title = "Prospective Application";
  let recordType: RecordType = "program";
  let institution = null;
  let officialUrl = null;
  let targetCycle = null;
  let notes = null;

  if (reminder) {
    title = reminder.title;
    recordType = reminder.record_type;
    institution = reminder.institution_or_provider;
    officialUrl = reminder.official_url;
    targetCycle = reminder.target_cycle;
    notes = reminder.notes;
  } else {
    // Check fallback in applications
    const { data: fallbackApp } = await supabase
      .from("applications")
      .select("*")
      .eq("id", reminderId)
      .single();

    if (fallbackApp) {
      // It's already in applications, just transition status to preparing!
      await supabase
        .from("applications")
        .update({
          status: "preparing",
          user_notes: fallbackApp.user_notes?.replace(/\[OPENING_REMINDER:[^\]]+\]\s*/, ""),
        })
        .eq("id", reminderId);

      revalidatePath("/app");
      redirect(`/app/applications/${reminderId}`);
    }
  }

  // Insert official application
  const { data: newApp, error: insertError } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      title,
      record_type: recordType,
      institution_or_provider: institution,
      status: "preparing",
      study_period: targetCycle,
      official_url: officialUrl,
      user_notes: notes ? `Converted from opening watchlist: ${notes}` : "Converted from opening watchlist",
      verification_state: "unreviewed",
    })
    .select("id")
    .single();

  if (insertError || !newApp) {
    return { error: insertError?.message || "Failed to convert reminder to application." };
  }

  // Mark reminder as converted
  if (reminder) {
    await supabase
      .from("opening_reminders" as any)
      .update({
        status: "converted",
        converted_application_id: newApp.id,
      })
      .eq("id", reminderId);
  }

  revalidatePath("/app");
  redirect(`/app/applications/${newApp.id}`);
}
