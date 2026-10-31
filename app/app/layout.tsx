import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/auth/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile from database
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Applicant";

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-rule bg-surface sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link
              href="/app"
              className="font-bold text-forest text-base sm:text-lg focus:outline-none focus:underline"
            >
              Abroad Application Hub
            </Link>
            <nav className="hidden sm:flex items-center space-x-4 text-sm font-medium">
              <Link
                href="/app"
                className="text-ink hover:text-forest px-2 py-1 rounded focus:outline-none focus:underline"
              >
                Dashboard
              </Link>
              <Link
                href="/app/documents"
                className="text-ink-muted hover:text-forest px-2 py-1 rounded focus:outline-none focus:underline"
              >
                Documents
              </Link>
              <Link
                href="/app/deadlines"
                className="text-ink-muted hover:text-forest px-2 py-1 rounded focus:outline-none focus:underline"
              >
                Deadlines
              </Link>
              <Link
                href="/app/settings"
                className="text-ink-muted hover:text-forest px-2 py-1 rounded focus:outline-none focus:underline"
              >
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-3 text-sm">
            <span className="hidden md:inline-block text-ink text-xs sm:text-sm">
              {displayName}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium text-ink bg-paper border border-rule rounded hover:bg-surface focus:outline-none focus:ring-2 focus:ring-forest"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="sm:hidden border-t border-rule bg-surface px-4 py-2 flex justify-around text-xs font-medium">
          <Link href="/app" className="text-forest py-1">
            Dashboard
          </Link>
          <Link href="/app/documents" className="text-ink-muted py-1">
            Documents
          </Link>
          <Link href="/app/deadlines" className="text-ink-muted py-1">
            Deadlines
          </Link>
          <Link href="/app/settings" className="text-ink-muted py-1">
            Settings
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
