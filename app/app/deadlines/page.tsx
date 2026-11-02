import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DeadlinesPage() {
  const supabase = await createClient();
  const { data: applications } = await supabase
    .from("applications")
    .select("id, title, record_type, institution_or_provider, deadline, status")
    .not("deadline", "is", null)
    .order("deadline", { ascending: true });

  const hasDeadlines = applications && applications.length > 0;
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-ink-deep tracking-tight">
            Application Deadlines
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Chronological schedule of target submission milestones.
          </p>
        </div>
      </div>

      {!hasDeadlines ? (
        <div className="glass-card rounded-3xl p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl glass-badge-teal flex items-center justify-center font-bold text-xl mx-auto">
            &bull;
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-heading font-bold text-ink-deep">No deadlines scheduled</h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Target deadlines saved with your applications will appear here in chronological order with countdown trackers.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/app/applications/new"
              className="inline-flex items-center justify-center h-10 px-5 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-md transition-colors"
            >
              + Add an application
            </Link>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl divide-y divide-glass-borderSubtle overflow-hidden">
          {applications.map((app) => {
            const deadlineDate = new Date(app.deadline!);
            const diffDays = Math.ceil(
              (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            return (
              <div key={app.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 text-sm">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="glass-badge-blue px-2 py-0.5 rounded text-[11px] font-bold">
                      {app.record_type}
                    </span>
                    <Link
                      href={`/app/applications/${app.id}`}
                      className="font-bold text-ink-deep hover:text-brand transition-colors"
                    >
                      {app.title}
                    </Link>
                  </div>
                  {app.institution_or_provider && (
                    <p className="text-xs text-ink-muted">{app.institution_or_provider}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-bold text-brand-dark block text-sm">
                    {deadlineDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {diffDays >= 0 ? `${diffDays} days remaining` : `${Math.abs(diffDays)} days ago`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
