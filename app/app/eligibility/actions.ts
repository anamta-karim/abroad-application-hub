"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseAcademicProfile } from "@/lib/eligibility";

/** Saves the signed-in user's academic profile (blank fields are cleared). */
export async function saveAcademicProfileAction(
  input: Record<string, string>
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again to save your profile." };

  const { profile, error: invalid } = parseAcademicProfile(input);
  if (!profile) return { error: invalid };

  const { error } = await supabase
    .from("academic_profiles")
    .upsert({ user_id: user.id, ...profile }, { onConflict: "user_id" });
  if (error) {
    const missing = error.code === "PGRST205" || error.code === "42P01";
    return {
      error: missing
        ? "Eligibility isn't set up yet (the 20261118000000_academic_profiles.sql migration needs to be run)."
        : error.message,
    };
  }

  // Eligibility shows on these pages
  revalidatePath("/app/eligibility");
  revalidatePath("/app/applications", "layout");
  revalidatePath("/app/compare");
  return { success: true };
}
