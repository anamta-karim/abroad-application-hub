import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in user, verified with Supabase Auth (getUser makes a network
 * call). Wrapped in React cache() so the /app layout and the page rendered
 * with it share one verification per request instead of each making its own.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
