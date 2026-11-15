import Link from "next/link";
import {
  eligibilitySummary,
  requirementLabel,
  type EligibilityResult,
  type MatchStatus,
  type RequirementCheck,
} from "@/lib/eligibility";

export const STATUS_STYLES: Record<MatchStatus, { label: string; badge: string; icon: string }> = {
  met: { label: "Met", badge: "bg-teal-50 text-teal-800 border-teal-200", icon: "✓" },
  not_met: { label: "Not met", badge: "bg-red-50 text-red-700 border-red-200", icon: "✕" },
  unknown: { label: "Add your score", badge: "bg-slate-50 text-ink-muted border-slate-200", icon: "?" },
};

export const TONE_STYLES = {
  good: "bg-teal-50 text-teal-800 border-teal-200",
  bad: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-slate-50 text-ink-muted border-slate-200",
} as const;

function Badge({ status }: { status: MatchStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold whitespace-nowrap ${s.badge}`}>
      <span aria-hidden="true">{s.icon}</span>
      {s.label}
    </span>
  );
}

function CheckRow({ check, label }: { check: RequirementCheck; label?: string }) {
  const r = check.requirement;
  return (
    <li className="py-3 space-y-1.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-deep">
            {label ?? requirementLabel(r.kind)}
            {r.optional && <span className="ml-2 text-[11px] font-semibold text-ink-subtle">(optional)</span>}
          </p>
          <p className="text-xs text-ink-muted">
            Needs <span className="font-semibold text-ink-deep">{check.needed}</span>
            {" · "}
            You: <span className="font-semibold text-ink-deep">{check.yours ?? "not added"}</span>
          </p>
        </div>
        <Badge status={check.status} />
      </div>
      {check.note && <p className="text-[11px] text-amber-800">{check.note}</p>}
      <details className="text-[11px] text-ink-muted">
        <summary className="cursor-pointer font-semibold text-brand hover:text-brand-dark w-fit">
          Source{r.pageNumber ? `, p. ${r.pageNumber}` : ""}
        </summary>
        <blockquote className="mt-1 pl-3 border-l-2 border-brand/30 italic">
          “{r.quote}”
          <span className="not-italic block mt-0.5 text-ink-subtle">{r.sourceTitle}</span>
        </blockquote>
      </details>
    </li>
  );
}

interface Props {
  result: EligibilityResult;
  hasProfile: boolean;
  hasSources: boolean;
}

/** Eligibility for one application: each requirement from its sources vs. your profile. */
export function EligibilityCard({ result, hasProfile, hasSources }: Props) {
  const summary = eligibilitySummary(result);
  const empty = result.checks.length === 0 && !result.english;

  return (
    <section className="glass-card rounded-2xl p-5 sm:p-6 space-y-3" aria-labelledby="eligibility-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="eligibility-heading" className="text-xs font-bold uppercase tracking-wider text-ink-muted font-heading">
          Eligibility
        </h2>
        <div className="flex items-center gap-3">
          {!empty && hasProfile && (
            <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${TONE_STYLES[summary.tone]}`}>{summary.label}</span>
          )}
          <Link href="/app/eligibility" className="text-xs font-bold text-brand hover:text-brand-dark">
            {hasProfile ? "Edit my scores" : "Add my scores"}
          </Link>
        </div>
      </div>

      {empty ? (
        <p className="text-sm text-ink-muted">
          {hasSources
            ? "No GPA, test-score, work-experience or degree requirements were found in this application's sources."
            : "Attach the official admissions page or prospectus below, and the GPA, test-score and experience requirements it states will be checked against your profile here."}
        </p>
      ) : (
        <>
          {!hasProfile && (
            <p className="text-xs text-ink-muted">
              These requirements were found in your sources.{" "}
              <Link href="/app/eligibility" className="font-bold text-brand hover:text-brand-dark">
                Add your grades and scores
              </Link>{" "}
              to see whether you meet them.
            </p>
          )}
          <ul className="divide-y divide-slate-200/70">
            {result.checks.map((c) => (
              <CheckRow key={c.requirement.kind} check={c} />
            ))}
            {result.english && (
              <li className="py-3 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-ink-deep">
                    English language{" "}
                    <span className="text-[11px] font-semibold text-ink-subtle">
                      {result.english.checks.length > 1 ? "(any one of these)" : ""}
                    </span>
                  </p>
                  <Badge status={result.english.status} />
                </div>
                <ul className="pl-3 border-l-2 border-slate-200 divide-y divide-slate-200/60">
                  {result.english.checks.map((c) => (
                    <CheckRow key={c.requirement.kind} check={c} />
                  ))}
                </ul>
              </li>
            )}
          </ul>
          <p className="text-[11px] text-ink-subtle">
            Read from this application&apos;s sources. Requirements can differ by track or country of study, so confirm with the
            university before relying on this.
          </p>
        </>
      )}
    </section>
  );
}
