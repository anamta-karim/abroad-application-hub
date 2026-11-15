import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, LetterStatus, RecommenderRow } from "@/types/database";
import type { EligibilityChunk } from "@/lib/eligibility";
import { LETTER_KEYWORDS, lettersNeededFrom, type LettersNeeded } from "@/lib/recommendations";

type Client = SupabaseClient<Database>;

export interface LetterWithRecommender {
  id: string;
  application_id: string;
  recommender_id: string;
  status: LetterStatus;
  asked_on: string | null;
  due_on: string | null;
  notes: string | null;
  recommender: { id: string; name: string; role: string | null; email: string | null } | null;
}

export interface LettersLoad {
  letters: LetterWithRecommender[];
  /** The recommendation_letters migration hasn't been run yet. */
  migrationMissing: boolean;
}

function isMissingTable(code: string | undefined): boolean {
  return code === "PGRST205" || code === "42P01" || code === "PGRST200";
}

/** Letters (with their referee), optionally for one application only. */
export async function loadLetters(supabase: Client, applicationId?: string): Promise<LettersLoad> {
  let query = supabase
    .from("recommendation_requests")
    .select("id, application_id, recommender_id, status, asked_on, due_on, notes, recommender:recommender_id (id, name, role, email)")
    .order("created_at", { ascending: true });
  if (applicationId) query = query.eq("application_id", applicationId);

  const { data, error } = await query;
  if (error) {
    const missing = isMissingTable(error.code);
    if (!missing) console.warn(`[letters] could not load letters: ${error.message}`);
    return { letters: [], migrationMissing: missing };
  }
  return { letters: data ?? [], migrationMissing: false };
}

export async function loadRecommenders(supabase: Client): Promise<RecommenderRow[]> {
  const { data, error } = await supabase.from("recommenders").select("*").order("name", { ascending: true });
  if (error) {
    if (!isMissingTable(error.code)) console.warn(`[letters] could not load referees: ${error.message}`);
    return [];
  }
  return data ?? [];
}

/** How many letters each application's sources ask for (null when not stated). */
export async function loadLettersNeeded(
  supabase: Client,
  applicationIds: string[]
): Promise<Map<string, LettersNeeded | null>> {
  const result = new Map<string, LettersNeeded | null>();
  if (applicationIds.length === 0) return result;

  const { data, error } = await supabase
    .from("source_chunks")
    .select("application_id, chunk_index, page_number, content, sources:source_id (display_name)")
    .in("application_id", applicationIds)
    .or(LETTER_KEYWORDS.map((k) => `content.ilike.%${k}%`).join(","))
    .order("chunk_index", { ascending: true })
    .limit(1000);
  if (error) {
    console.warn(`[letters] could not load source text: ${error.message}`);
    return result;
  }

  const byApp = new Map<string, EligibilityChunk[]>();
  for (const row of data ?? []) {
    const list = byApp.get(row.application_id) ?? [];
    list.push({ content: row.content, page_number: row.page_number, sourceTitle: row.sources?.display_name || "Official source" });
    byApp.set(row.application_id, list);
  }
  for (const id of applicationIds) result.set(id, lettersNeededFrom(byApp.get(id) ?? []));
  return result;
}
