import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Query owned applications
  const { data: applications } = await supabase
    .from("applications")
    .select("id, title, record_type, institution_or_provider, status, deadline, verification_state, updated_at")
    .order("created_at", { ascending: false });

  const hasApplications = applications && applications.length > 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-rule">
        <div>
          <h1 className="text-2xl font-bold text-ink">Applications</h1>
          <p className="text-sm text-ink-muted">
            Manage your study-abroad program and scholarship applications.
          </p>
        </div>
        <div>
          <Link
            href="/app/applications/new"
            className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium text-surface bg-forest hover:bg-forest-hover rounded focus:outline-none focus:ring-2 focus:ring-forest transition-colors"
          >
            Add application
          </Link>
        </div>
      </div>

      {/* Main Workspace Area */}
      {!hasApplications ? (
        <div className="bg-surface border border-rule rounded p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-ink">No applications yet</h2>
            <p className="text-sm text-ink-muted leading-relaxed">
              Add your first university program or scholarship application. You can paste an official webpage URL or upload a prospectus PDF to extract and track requirements.
            </p>
          </div>
          <div>
            <Link
              href="/app/applications/new"
              className="inline-flex items-center justify-center h-11 px-5 text-sm font-medium text-surface bg-forest hover:bg-forest-hover rounded focus:outline-none focus:ring-2 focus:ring-forest transition-colors"
            >
              Add your first application
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-surface border border-rule rounded overflow-hidden">
            <div className="divide-y divide-rule">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-sage text-forest">
                        {app.record_type}
                      </span>
                      <h3 className="font-semibold text-ink text-base">
                        <Link
                          href={`/app/applications/${app.id}`}
                          className="hover:underline focus:outline-none focus:underline"
                        >
                          {app.title}
                        </Link>
                      </h3>
                    </div>
                    {app.institution_or_provider && (
                      <p className="text-xs text-ink-muted">
                        {app.institution_or_provider}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-ink-muted">
                    {app.deadline && (
                      <span>Deadline: {app.deadline}</span>
                    )}
                    <span className="capitalize px-2.5 py-1 bg-paper border border-rule rounded text-ink">
                      {app.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
