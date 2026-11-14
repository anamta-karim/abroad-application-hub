import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Returns true when every given application id belongs to the user.
 *
 * Row Level Security already hides other users' applications from SELECT, so a
 * missing row means "not yours". Server actions call this before inserting
 * child rows (sources, tasks, requirements, links, conversations) so a forged
 * application id is rejected with a clear error instead of attaching data to
 * someone else's record. The database enforces the same rule in its INSERT and
 * UPDATE policies (see 20261113000000_parent_ownership_policies.sql).
 */
export async function userOwnsApplications(
  supabase: SupabaseClient<Database>,
  userId: string,
  applicationIds: string[]
): Promise<boolean> {
  const ids = Array.from(new Set(applicationIds.filter(Boolean)));
  if (ids.length === 0) return false;

  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", userId)
    .in("id", ids);

  if (error || !data) return false;
  return data.length === ids.length;
}

export const APPLICATION_NOT_FOUND = "Application not found.";
