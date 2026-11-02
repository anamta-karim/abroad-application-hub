import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ApplicationDeck } from "@/components/ApplicationDeck";
import { OpeningNudgeBanner } from "@/components/OpeningNudgeBanner";
import type { OpeningReminder } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Query owned applications
  const { data: applicationsData } = await supabase
    .from("applications")
    .select(
      "id, title, record_type, institution_or_provider, status, deadline, verification_state, degree_level, country, archived_at, updated_at"
    )
    .order("created_at", { ascending: false });

  const applications = (applicationsData || []) as any[];

  // Query opening reminders
  const { data: remindersData } = await supabase
    .from("opening_reminders" as any)
    .select("*")
    .order("expected_open_date", { ascending: true });

  const reminders: OpeningReminder[] = (remindersData || []) as any[];

  const now = new Date();
  const todayDateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

  // Filter active (non-archived, non-expired) applications
  const activeApplications = applications.filter((app) => {
    if (app.archived_at) return false;
    if (app.deadline && app.deadline < todayDateStr) {
      return app.status !== "researching" && app.status !== "preparing";
    }
    return true;
  });

  const hasApplications = applications.length > 0 || reminders.length > 0;

  // Query document requirements across user applications
  const { data: docRequirementsData } = await supabase
    .from("document_requirements")
    .select("id, application_id, status");

  const docRequirements = docRequirementsData || [];

  const totalWorkspaceDocs = docRequirements.length;
  const readyWorkspaceDocs = docRequirements.filter(
    (d) => d.status === "ready" || d.status === "submitted"
  ).length;

  // Compute nearest active deadline
  const upcomingApps = activeApplications
    .filter((app) => app.deadline && app.deadline >= todayDateStr)
    .sort((a, b) => (a.deadline! > b.deadline! ? 1 : -1));

  const nearestApp = upcomingApps[0] || null;

  let nearestDeadlineLabel = "None scheduled";
  let nearestDaysLeftLabel = "No upcoming deadlines";
  if (nearestApp && nearestApp.deadline) {
    const deadlineDate = new Date(nearestApp.deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    nearestDeadlineLabel = deadlineDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    nearestDaysLeftLabel =
      diffDays === 0
        ? "Due today"
        : diffDays === 1
        ? "Due tomorrow"
        : `${diffDays} days left`;
  }

  const programsCount = activeApplications.filter((a) => a.record_type === "program").length;
  const scholarshipsCount = activeApplications.filter((a) => a.record_type === "scholarship").length;

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-brand font-heading">
            Personal Workspace
          </span>
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-ink-deep tracking-tight mt-0.5">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">
            Track program requirements, scholarship milestones, and official source documents.
          </p>
        </div>
        <div>
          <Link
            href="/app/applications/new"
            className="inline-flex items-center justify-center h-11 px-6 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-md shadow-brand/20 active:scale-95 transition-all"
          >
            + Add application
          </Link>
        </div>
      </div>

      {/* ── Nudge Alert Banner (When an opening reminder is due) ── */}
      <OpeningNudgeBanner reminders={reminders} />

      {!hasApplications ? (
        /* ═════════════════════════════════════════════════════════════════ */
        /* REAL EMPTY ACCOUNT EXPERIENCE (Frosted Glass Stage & Focal Point) */
        /* ═════════════════════════════════════════════════════════════════ */
        <div className="space-y-8 max-w-4xl mx-auto py-2">
          {/* Main Visual Focal Point: Frosted Glass Stage */}
          <section
            aria-labelledby="empty-workspace-heading"
            className="glass-stage rounded-[32px] p-8 sm:p-14 lg:p-16 text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl glass-badge-blue flex items-center justify-center font-heading font-extrabold text-2xl text-brand mx-auto shadow-sm">
              +
            </div>

            <div className="space-y-3 max-w-xl mx-auto">
              <span className="glass-badge-teal px-3.5 py-1.5 rounded-full text-xs font-bold inline-block">
                Ready to begin
              </span>
              <h2
                id="empty-workspace-heading"
                className="text-2xl sm:text-4xl font-heading font-extrabold text-ink-deep tracking-tight"
              >
                Add your first application
              </h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                Track your university degree programs and scholarships in one calm, luminous workspace. Save official deadlines, attach prospectus PDFs, and manage requirements with verified source citations.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/app/applications/new"
                className="inline-flex items-center justify-center h-12 px-8 text-sm font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-lg shadow-brand/25 active:scale-95 transition-all"
              >
                + Add your first application
              </Link>
            </div>

            {/* Quiet, relevant onboarding note */}
            <div className="pt-6 border-t border-glass-borderSubtle text-xs text-ink-muted max-w-lg mx-auto leading-relaxed">
              <p>
                <strong className="text-ink-deep font-semibold">Source grounding:</strong> Requirements, dates, and funding criteria cite your uploaded prospectus materials and program links. Extracted facts stay pending until you review them.
              </p>
            </div>
          </section>

          {/* Upcoming Deadlines (Simple, Useful Empty State) */}
          <section
            aria-labelledby="empty-deadlines-heading"
            className="glass-card rounded-2xl p-6 sm:p-7 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-glass-borderSubtle">
              <div>
                <h3
                  id="empty-deadlines-heading"
                  className="font-heading font-bold text-base text-ink-deep"
                >
                  Upcoming Deadlines
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Chronological schedule of target submission milestones.
                </p>
              </div>
              <span className="text-xs text-ink-subtle font-medium">
                0 upcoming
              </span>
            </div>

            <div className="py-6 text-center text-xs text-ink-muted">
              <p className="font-semibold text-ink-main">No deadlines on your calendar yet.</p>
              <p className="text-ink-subtle mt-1 max-w-md mx-auto">
                When you add programs or scholarships with target submission dates, your milestones and countdowns will display here automatically.
              </p>
            </div>
          </section>
        </div>
      ) : (
        /* ═════════════════════════════════════════════════════════════════ */
        /* POPULATED WORKSPACE (Stats, Deadlines & Application Deck)         */
        /* ═════════════════════════════════════════════════════════════════ */
        <div className="space-y-8">
          {/* Summary Metric Strip */}
          <section aria-label="Workspace summary" className="glass-card rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle block font-heading">
                Active Applications
              </span>
              <div className="text-3xl font-heading font-extrabold text-ink-deep">
                {activeApplications.length}
              </div>
              <span className="text-xs text-ink-muted block">
                {programsCount} programs &bull; {scholarshipsCount} scholarships
              </span>
            </div>

            <div className="space-y-1 sm:border-l sm:border-glass-borderSubtle sm:pl-6">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle block font-heading">
                Next Deadline
              </span>
              <div className="text-3xl font-heading font-extrabold text-brand-dark">
                {nearestDeadlineLabel}
              </div>
              <span className="text-xs text-ink-muted block">
                {nearestDaysLeftLabel}
              </span>
            </div>

            <div className="space-y-1 sm:border-l sm:border-glass-borderSubtle sm:pl-6">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle block font-heading">
                Checklist Documents
              </span>
              <div className="text-3xl font-heading font-extrabold text-teal-dark">
                {readyWorkspaceDocs} of {totalWorkspaceDocs}
              </div>
              <span className="text-xs text-ink-muted block">
                Confirmed ready
              </span>
            </div>
          </section>

          {/* Main Application Deck with Active, Archived & Watchlist Tabs */}
          <div className="space-y-4">
            <ApplicationDeck
              applications={applications}
              docRequirements={docRequirements}
              reminders={reminders}
            />
          </div>
        </div>
      )}
    </div>
  );
}
