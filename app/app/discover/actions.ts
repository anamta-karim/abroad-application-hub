"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCatalogEntry, nextOpeningDate } from "@/lib/catalog/scholarships";
import type { RecordType } from "@/types/database";

export interface DiscoverAddResult {
  success?: boolean;
  error?: string;
  /** Set when an application was created (or already existed). */
  applicationId?: string;
  alreadyAdded?: boolean;
}

const VERIFY_NOTE = "Dates, eligibility and funding change every cycle: confirm them on the official page.";

async function getUserClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function findExistingApplication(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  institution: string
): Promise<string | null> {
  const { data } = await supabase
    .from("applications")
    .select("id, institution_or_provider")
    .eq("user_id", userId)
    .ilike("title", title.replace(/[%_\\]/g, "\\$&"))
    .limit(10);

  const match = (data || []).find(
    (a) => (a.institution_or_provider || "").toLowerCase() === institution.toLowerCase()
  );
  return match?.id ?? null;
}

async function insertApplication(
  supabase: SupabaseClient,
  userId: string,
  fields: {
    title: string;
    recordType: RecordType;
    institution: string;
    country: string;
    degreeLevel: string | null;
    officialUrl: string | null;
    notes: string;
  }
): Promise<DiscoverAddResult> {
  const existingId = await findExistingApplication(supabase, userId, fields.title, fields.institution);
  if (existingId) {
    return { success: true, alreadyAdded: true, applicationId: existingId };
  }

  const { data: newApp, error } = await supabase
    .from("applications")
    .insert({
      user_id: userId,
      title: fields.title,
      record_type: fields.recordType,
      institution_or_provider: fields.institution,
      country: fields.country,
      degree_level: fields.degreeLevel,
      official_url: fields.officialUrl,
      user_notes: fields.notes,
      status: "researching",
      verification_state: "unreviewed",
    })
    .select("id")
    .single();

  if (error || !newApp) {
    return { error: error?.message || "Could not add this to your applications." };
  }

  await supabase.from("status_history").insert({
    user_id: userId,
    application_id: newApp.id,
    from_status: null,
    to_status: "researching",
    note: "Added from Discover",
  });

  revalidatePath("/app");
  revalidatePath("/app/discover");
  return { success: true, applicationId: newApp.id };
}

/**
 * Adds a curated catalog scholarship to the user's applications, or to their
 * opening watchlist (reminder set for the month the call usually opens).
 * Catalog data is looked up server-side by id; nothing descriptive is trusted from the client.
 */
export async function addCatalogEntryAction(
  entryId: string,
  mode: "application" | "watchlist"
): Promise<DiscoverAddResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return { error: "Authentication required." };

  const entry = getCatalogEntry(entryId);
  if (!entry) return { error: "This catalog entry no longer exists." };

  const notes = [
    `Added from the Discover catalog.`,
    `Funding (typical): ${entry.funding}`,
    `Eligibility (typical): ${entry.eligibility}`,
    `Typical window (past cycles): ${entry.typicalWindow}`,
    VERIFY_NOTE,
  ].join("\n");

  if (mode === "application") {
    return insertApplication(supabase, user.id, {
      title: entry.title,
      recordType: entry.recordType,
      institution: entry.provider,
      country: entry.country,
      degreeLevel: entry.degreeLevels.join(" / "),
      officialUrl: entry.officialUrl,
      notes,
    });
  }

  if (!entry.typicalOpenMonth) {
    return { error: "This award has no usual opening month, so it can't be added to the watchlist. Add it as an application instead." };
  }

  const { data: existing } = await supabase
    .from("opening_reminders" as any)
    .select("id")
    .eq("user_id", user.id)
    .eq("title", entry.title)
    .eq("status", "watching")
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: true, alreadyAdded: true };
  }

  const { error } = await supabase.from("opening_reminders" as any).insert({
    user_id: user.id,
    title: entry.title,
    record_type: entry.recordType,
    institution_or_provider: entry.provider,
    expected_open_date: nextOpeningDate(entry.typicalOpenMonth),
    official_url: entry.officialUrl,
    notes: `${entry.typicalWindow} ${VERIFY_NOTE}`,
    status: "watching",
  });

  if (error) {
    return { error: error.message || "Could not add this to your watchlist." };
  }

  revalidatePath("/app");
  revalidatePath("/app/discover");
  return { success: true };
}

export interface UsProgramPayload {
  programTitle: string;
  degreeLevel: string;
  schoolName: string;
  city: string | null;
  state: string | null;
  website: string | null;
}

/**
 * Adds a US program found through College Scorecard as an application.
 */
export async function addUsProgramAction(payload: UsProgramPayload): Promise<DiscoverAddResult> {
  const { supabase, user } = await getUserClient();
  if (!user) return { error: "Authentication required." };

  const programTitle = (payload.programTitle || "").trim().slice(0, 200);
  const schoolName = (payload.schoolName || "").trim().slice(0, 200);
  const degreeLevel = (payload.degreeLevel || "").trim().slice(0, 60) || null;
  if (!programTitle || !schoolName) return { error: "Program and school are required." };

  let website: string | null = null;
  if (payload.website) {
    try {
      const u = new URL(payload.website);
      if (u.protocol === "http:" || u.protocol === "https:") website = u.toString();
    } catch {
      website = null;
    }
  }

  const location = [payload.city, payload.state].filter(Boolean).join(", ");
  const title = degreeLevel ? `${programTitle} (${degreeLevel})` : programTitle;

  return insertApplication(supabase, user.id, {
    title,
    recordType: "program",
    institution: schoolName,
    country: "United States",
    degreeLevel,
    officialUrl: website,
    notes: [
      `Added from Discover (U.S. Department of Education College Scorecard).${location ? ` Campus: ${location}.` : ""}`,
      "Find the department's admissions page for deadlines and requirements.",
      VERIFY_NOTE,
    ].join("\n"),
  });
}
