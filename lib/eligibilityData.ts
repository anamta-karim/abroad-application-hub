import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  ELIGIBILITY_KEYWORDS,
  extractEligibilityRequirements,
  profileFromRow,
  type AcademicProfile,
  type EligibilityChunk,
  type EligibilityRequirement,
} from "@/lib/eligibility";

type Client = SupabaseClient<Database>;

export interface ProfileLoad {
  profile: AcademicProfile | null;
  /** The academic_profiles migration hasn't been run yet. */
  migrationMissing: boolean;
}

export async function loadAcademicProfile(supabase: Client): Promise<ProfileLoad> {
  const { data, error } = await supabase.from("academic_profiles").select("*").limit(1).maybeSingle();
  if (error) {
    const missing = error.code === "PGRST205" || error.code === "42P01";
    if (!missing) console.warn(`[eligibility] could not load profile: ${error.message}`);
    return { profile: null, migrationMissing: missing };
  }
  return { profile: profileFromRow(data), migrationMissing: false };
}

/**
 * Requirements per application, read from source chunks that mention a
 * requirement keyword (filtered in the database to keep this light).
 */
export async function loadEligibilityRequirements(
  supabase: Client,
  applicationIds: string[]
): Promise<Map<string, EligibilityRequirement[]>> {
  const result = new Map<string, EligibilityRequirement[]>();
  if (applicationIds.length === 0) return result;

  const { data, error } = await supabase
    .from("source_chunks")
    .select("application_id, chunk_index, page_number, content, sources:source_id (display_name)")
    .in("application_id", applicationIds)
    .or(ELIGIBILITY_KEYWORDS.map((k) => `content.ilike.%${k}%`).join(","))
    .order("chunk_index", { ascending: true })
    .limit(2000);
  if (error) {
    console.warn(`[eligibility] could not load source text: ${error.message}`);
    return result;
  }

  const byApp = new Map<string, EligibilityChunk[]>();
  for (const row of data ?? []) {
    const list = byApp.get(row.application_id) ?? [];
    list.push({ content: row.content, page_number: row.page_number, sourceTitle: row.sources?.display_name || "Official source" });
    byApp.set(row.application_id, list);
  }
  for (const id of applicationIds) result.set(id, extractEligibilityRequirements(byApp.get(id) ?? []));
  return result;
}
