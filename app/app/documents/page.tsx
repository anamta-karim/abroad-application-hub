import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DocumentInventory } from "@/components/DocumentInventory";
import {
  COMMON_DOCUMENTS,
  coverageFor,
  demandByDocument,
  type CoverageState,
  type OwnedDocument,
} from "@/lib/documents/catalog";
import { countdownLabel, formatDateLabel, todayString } from "@/lib/calendar";

const STATE_STYLES: Record<CoverageState, { icon: string; cls: string; label: (owned: string | null) => string }> = {
  have: { icon: "✓", cls: "text-teal-800 bg-teal-50 border-teal-200", label: (o) => `You have it${o ? ` (${o})` : ""}` },
  expires_before_deadline: { icon: "!", cls: "text-amber-900 bg-amber-50 border-amber-200", label: () => "You have it, but it expires before the deadline" },
  expired: { icon: "!", cls: "text-red-800 bg-red-50 border-red-200", label: () => "Your copy has expired" },
  missing: { icon: "○", cls: "text-ink-main bg-white/70 border-slate-200", label: () => "Still needed" },
  specific: { icon: "★", cls: "text-violet-900 bg-violet-50 border-violet-200", label: () => "Specific to this application" },
};

export default async function DocumentsPage() {
  const supabase = await createClient();
  const today = todayString();

  const [{ data: ownedData }, { data: appsData }, { data: reqData }] = await Promise.all([
    supabase.from("user_documents").select("id, document_type, display_name, expires_on").order("created_at"),
    supabase
      .from("applications")
      .select("id, title, institution_or_provider, deadline, status")
      .is("archived_at", null)
      .not("status", "in", "(rejected,withdrawn)")
      .order("deadline", { ascending: true, nullsFirst: false }),
    supabase.from("document_requirements").select("application_id, document_type, status"),
  ]);

  const owned = (ownedData || []) as OwnedDocument[];
  const apps = appsData || [];
  const requirements = reqData || [];
  const activeAppIds = new Set(apps.map((a) => a.id));
  const demand = demandByDocument(requirements.filter((r) => activeAppIds.has(r.application_id)));

  const items = COMMON_DOCUMENTS.map((d) => ({
    key: d.key,
    label: d.label,
    description: d.description,
    expires: d.expires,
    neededBy: demand.get(d.key) || 0,
  }));

  const perApp = apps.map((app) => {
    const reqs = requirements.filter((r) => r.application_id === app.id);
    const coverage = coverageFor(reqs, owned, app.deadline, today);
    const covered = coverage.filter((c) => c.state === "have").length;
    return { app, coverage, covered };
  });
  const withReqs = perApp.filter((p) => p.coverage.length > 0);
  const withoutReqs = perApp.filter((p) => p.coverage.length === 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-ink-deep tracking-tight">Documents</h1>
        <p className="text-sm text-ink-muted mt-1 max-w-2xl">
          Keep track of the documents you already have, and see what each application still needs.
        </p>
      </div>

      <DocumentInventory items={items} owned={owned} today={today} />

      <section aria-labelledby="by-app-heading" className="space-y-4">
        <div>
          <h2 id="by-app-heading" className="font-heading font-bold text-lg text-ink-deep">
            By application
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Each application's document checklist, compared with what you have. Checklists come from the requirements you
            add or confirm on each application.
          </p>
        </div>

        {withReqs.length === 0 && (
          <div className="glass-card rounded-2xl p-6 text-center text-xs text-ink-muted">
            None of your applications has a document checklist yet. Open an application and add its requirements, or
            upload its prospectus and confirm the suggested documents.
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {withReqs.map(({ app, coverage, covered }) => {
            const outstanding = coverage.filter((c) => c.state !== "have");
            return (
              <article key={app.id} className="glass-card rounded-2xl p-5 space-y-3">
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/app/applications/${app.id}`} className="font-heading font-bold text-ink-deep hover:text-brand">
                      {app.title}
                    </Link>
                    <p className="text-xs text-ink-muted">
                      {[app.institution_or_provider, app.deadline && `Deadline ${formatDateLabel(app.deadline)} (${countdownLabel(app.deadline, today).toLowerCase()})`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      outstanding.length === 0 ? "bg-teal-100 text-teal-900" : "bg-slate-100 text-ink-main"
                    }`}
                  >
                    {covered} of {coverage.length} ready
                  </span>
                </header>
                <ul className="space-y-1.5">
                  {coverage.map((c, i) => {
                    const style = STATE_STYLES[c.state];
                    return (
                      <li key={i} className={`flex items-start gap-2.5 px-3 py-2 rounded-xl border text-xs ${style.cls}`}>
                        <span className="font-bold w-3 text-center shrink-0" aria-hidden="true">
                          {style.icon}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold">{c.requirement}</span>
                          <span className="block opacity-80">
                            {style.label(c.owned && c.owned.display_name !== c.requirement ? c.owned.display_name : null)}
                            {c.owned?.expires_on && c.state !== "have" ? ` (expires ${formatDateLabel(c.owned.expires_on)})` : ""}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>

        {withoutReqs.length > 0 && (
          <p className="text-xs text-ink-muted">
            No checklist yet for:{" "}
            {withoutReqs.map(({ app }, i) => (
              <span key={app.id}>
                {i > 0 && ", "}
                <Link href={`/app/applications/${app.id}`} className="font-semibold text-brand hover:text-brand-dark">
                  {app.title}
                </Link>
              </span>
            ))}
            .
          </p>
        )}
      </section>
    </div>
  );
}
