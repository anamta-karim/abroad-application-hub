import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { signOutAction } from "@/app/auth/actions";
import { AppSidebar } from "@/components/AppSidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Verify the session and load the profile in parallel. Row-level security
  // limits profiles to the caller's own row, so no user id is needed up front.
  const [user, { data: profile }] = await Promise.all([
    getCurrentUser(),
    supabase.from("profiles").select("display_name").limit(1).maybeSingle(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const displayName =
    profile?.display_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Applicant";

  return (
    <div className="min-h-screen p-2 sm:p-4 lg:p-6 flex flex-col justify-center">
      {/* ═══ Master Floating Frosted Glass Tablet (CoachPro / Alyona Style) ═══ */}
      <div className="w-full max-w-[1540px] min-h-[calc(100vh-2rem)] sm:min-h-[calc(100vh-3rem)] mx-auto glass-stage rounded-[28px] sm:rounded-[36px] flex flex-col lg:flex-row overflow-hidden shadow-2xl">
        <AppSidebar displayName={displayName} signOutAction={signOutAction} />

        {/* ═══ Main Content Canvas ═══ */}
        <main className="flex-1 flex flex-col min-w-0 p-5 sm:p-8 lg:p-10 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
