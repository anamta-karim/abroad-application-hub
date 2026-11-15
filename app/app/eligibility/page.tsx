import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AcademicProfileForm } from "@/components/AcademicProfileForm";
import { TONE_STYLES } from "@/components/EligibilityCard";
import { eligibilitySummary, matchEligibility, profileIsEmpty } from "@/lib/eligibility";
import { loadAcademicProfile, loadEligibilityRequirements } from "@/lib/eligibilityData";

export const metadata = { title: "Eligibility · AbroadAtlas" };

export default async function EligibilityPage() {
  const supabase = await createClient();
  const [{ profile, migrationMissing }, { data: apps }] = await Promise.all([
    loadAcademicProfile(supabase),
    supabase
      .from("applications")
      .select("id, title, institution_or_provider, record_type, deadline")
      .is("archived_at", null)
      .order("deadline", { ascending: true, nullsFirst: false }),
  ]);

  const applications = apps ?? [];
  const requirements = await loadEligibilityRequirements(
    supabase,
    applications.map((a) => a.id)
  );
  const hasProfile = !profileIsEmpty(profile);

  const rows = applications.map((app) => {
    const result = matchEligibility(requirements.get(app.id) ?? [], profile);
    return { app, result, summary: eligibilitySummary(result) };
  });
  // Gaps first, then things to check, then all met, then nothing found
  const rank = (r: (typeof rows)[number]) =>
    r.result.total === 0 ? 3 : r.summary.tone === "bad" ? 0 : r.summary.tone === "neutral" ? 1 : 2;
  rows.sort((a, b) => rank(a) - rank(b));

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-ink-deep tracking-tight">Eligibility</h1>
        <p className="text-sm text-ink-muted mt-1 max-w-2xl">
          Add your grades and test scores once, and every application is checked against the requirements stated in its
          own sources: GPA, English tests, GRE/GMAT, work experience and prior degree.
        </p>
      </div>

      <section className="glass-stage rounded-3xl p-6 sm:p-8 space-y-4">
        <div>
          <h2 className="font-heading font-bold text-base text-ink-deep">Your academic profile</h2>
          <p className="text-xs text-ink-muted mt-1">Every field is optional and only visible to you.</p>
        </div>
        <AcademicProfileForm initial={profile} migrationMissing={migrationMissing} />
      </section>

      <section className="space-y-3">
        <h2 className="font-heading font-bold text-base text-ink-deep">How you match</h2>
        {rows.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-ink-muted">
            No active applications yet.{" "}
            <Link href="/app/applications/new" className="font-bold text-brand hover:text-brand-dark">
              Add one
            </Link>{" "}
            to check your eligibility.
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map(({ app, result, summary }) => (
              <li key={app.id}>
                <Link
                  href={`/app/applications/${app.id}#eligibility-heading`}
                  className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/80 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-ink-deep truncate">{app.title}</p>
                    <p className="text-xs text-ink-muted truncate">
                      {app.record_type === "scholarship" ? "Scholarship" : "Program"}
                      {app.institution_or_provider ? ` · ${app.institution_or_provider}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-lg border text-xs font-bold ${
                      result.total === 0 || !hasProfile ? TONE_STYLES.neutral : TONE_STYLES[summary.tone]
                    }`}
                  >
                    {result.total === 0
                      ? "No requirements found in sources"
                      : hasProfile
                        ? summary.label
                        : `${result.total} ${result.total === 1 ? "requirement" : "requirements"} found`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-ink-subtle">
          Only requirements written in an application&apos;s attached sources are checked. Always confirm with the university.
        </p>
      </section>
    </div>
  );
}
