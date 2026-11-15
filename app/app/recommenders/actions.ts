"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayString } from "@/lib/calendar";
import { isLetterStatus, parseDateInput, parseRecommenderInput } from "@/lib/recommendations";
import type { LetterStatus } from "@/types/database";

export interface LetterActionResult {
  error?: string;
  success?: boolean;
  id?: string;
}

const MIGRATION_MESSAGE =
  "The recommendation-letter tables aren't set up yet. Run the 20261119000000_recommendation_letters.sql migration in Supabase.";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function dbError(error: { code?: string; message: string }): string {
  if (error.code === "PGRST205" || error.code === "42P01") return MIGRATION_MESSAGE;
  return error.message;
}

function done(id?: string): LetterActionResult {
  // Letters show on the dashboard, application pages, Documents and Recommenders
  revalidatePath("/app", "layout");
  return { success: true, ...(id ? { id } : {}) };
}

// ── Referees ──

export interface RecommenderFields {
  name: string;
  role?: string;
  email?: string;
  notes?: string;
}

/** Creates a referee (recommenderId null) or updates one. */
export async function saveRecommenderAction(
  recommenderId: string | null,
  fields: RecommenderFields
): Promise<LetterActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Authentication required." };
  const parsed = parseRecommenderInput(fields);
  if (!parsed.value) return { error: parsed.error };

  if (recommenderId) {
    const { data, error } = await supabase
      .from("recommenders")
      .update(parsed.value)
      .eq("id", recommenderId)
      .eq("user_id", user.id)
      .select("id");
    if (error) return { error: dbError(error) };
    if (!data || data.length === 0) return { error: "Referee not found." };
    return done(recommenderId);
  }

  const { data, error } = await supabase
    .from("recommenders")
    .insert({ user_id: user.id, ...parsed.value })
    .select("id")
    .single();
  if (error) return { error: dbError(error) };
  return done(data.id);
}

/** Deletes a referee and every letter they were writing. */
export async function deleteRecommenderAction(recommenderId: string): Promise<LetterActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Authentication required." };
  const { data, error } = await supabase
    .from("recommenders")
    .delete()
    .eq("id", recommenderId)
    .eq("user_id", user.id)
    .select("id");
  if (error) return { error: dbError(error) };
  if (!data || data.length === 0) return { error: "Referee not found." };
  return done();
}

// ── Letters ──

/**
 * Adds a letter to an application, from an existing referee or a new one
 * created on the spot.
 */
export async function addLetterAction(
  applicationId: string,
  input: { recommenderId?: string; newRecommender?: RecommenderFields; dueOn?: string }
): Promise<LetterActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Authentication required." };

  const dueOn = parseDateInput(input.dueOn);
  if (dueOn === "invalid") return { error: "Please enter a valid due date." };

  let recommenderId = input.recommenderId;
  let createdId: string | null = null;
  if (!recommenderId) {
    const parsed = parseRecommenderInput(input.newRecommender ?? {});
    if (!parsed.value) return { error: parsed.error };
    const { data, error } = await supabase
      .from("recommenders")
      .insert({ user_id: user.id, ...parsed.value })
      .select("id")
      .single();
    if (error) return { error: dbError(error) };
    recommenderId = createdId = data.id;
  }

  const { data, error } = await supabase
    .from("recommendation_requests")
    .insert({ user_id: user.id, application_id: applicationId, recommender_id: recommenderId, due_on: dueOn })
    .select("id")
    .single();
  if (error) {
    // Don't leave a half-created referee behind
    if (createdId) await supabase.from("recommenders").delete().eq("id", createdId).eq("user_id", user.id);
    if (error.code === "23505") return { error: "That referee is already writing a letter for this application." };
    return { error: dbError(error) };
  }
  return done(data.id);
}

export interface LetterPatch {
  status?: string;
  dueOn?: string;
  askedOn?: string;
  notes?: string;
}

/**
 * Updates a letter. Marking it "asked" records today as the ask date (unless
 * one is given), so follow-up reminders know how long the referee has had it.
 */
export async function updateLetterAction(letterId: string, patch: LetterPatch): Promise<LetterActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Authentication required." };

  const { data: current, error: loadError } = await supabase
    .from("recommendation_requests")
    .select("id, status, asked_on")
    .eq("id", letterId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (loadError) return { error: dbError(loadError) };
  if (!current) return { error: "Letter not found." };

  const update: { status?: LetterStatus; due_on?: string | null; asked_on?: string | null; notes?: string | null } = {};

  if (patch.status !== undefined) {
    if (!isLetterStatus(patch.status)) return { error: "Unknown status." };
    update.status = patch.status;
    if (patch.status === "to_ask") update.asked_on = null;
    else if (!current.asked_on && patch.askedOn === undefined) update.asked_on = todayString();
  }
  if (patch.dueOn !== undefined) {
    const due = parseDateInput(patch.dueOn);
    if (due === "invalid") return { error: "Please enter a valid due date." };
    update.due_on = due;
  }
  if (patch.askedOn !== undefined) {
    const asked = parseDateInput(patch.askedOn);
    if (asked === "invalid") return { error: "Please enter a valid date." };
    if (asked && asked > todayString()) return { error: "The ask date can't be in the future." };
    update.asked_on = asked;
  }
  if (patch.notes !== undefined) {
    const notes = patch.notes.trim();
    if (notes.length > 1000) return { error: "The notes are too long (1,000 characters at most)." };
    update.notes = notes || null;
  }
  if (Object.keys(update).length === 0) return { success: true };

  const { error } = await supabase.from("recommendation_requests").update(update).eq("id", letterId).eq("user_id", user.id);
  if (error) return { error: dbError(error) };
  return done(letterId);
}

/** Removes a letter from an application (the referee stays in your list). */
export async function removeLetterAction(letterId: string): Promise<LetterActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Authentication required." };
  const { data, error } = await supabase
    .from("recommendation_requests")
    .delete()
    .eq("id", letterId)
    .eq("user_id", user.id)
    .select("id");
  if (error) return { error: dbError(error) };
  if (!data || data.length === 0) return { error: "Letter not found." };
  return done();
}
