import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen p-4 sm:p-8 flex flex-col justify-between max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between py-2">
        <Link
          href="/"
          className="text-xs font-semibold text-ink-muted hover:text-brand transition-colors inline-flex items-center gap-1.5"
        >
          &larr; Back to Home
        </Link>
        <span className="text-xs font-bold text-ink-subtle">Abroad Application Hub</span>
      </header>

      <main className="glass-stage rounded-3xl p-6 sm:p-12 space-y-6">
        <div className="space-y-1">
          <span className="glass-badge-blue px-3 py-1 rounded-full text-xs font-bold inline-block">
            Terms of Use &amp; Service Limits
          </span>
          <h1 className="text-3xl font-heading font-extrabold text-ink-deep tracking-tight mt-2">
            Terms &amp; Operational Quotas
          </h1>
          <p className="text-xs text-ink-muted">
            Last updated: November 2026 &bull; Transparent, free-tier-only operation
          </p>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-ink-deep leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-heading font-bold text-base text-ink-deep">1. Independent Study Workspace</h2>
            <p className="text-ink-muted">
              Abroad Application Hub is an independent personal organization tool. It is not affiliated with, endorsed by, or an official agent of any university, scholarship commission, embassy, or immigration authority.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading font-bold text-base text-ink-deep">2. Grounding Policy &amp; User Verification</h2>
            <p className="text-ink-muted">
              While our extraction engine extracts admissions requirements from your uploaded prospectuses, applicants remain solely responsible for verifying final application deadlines, visa regulations, and eligibility criteria directly with official university portals before submitting.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading font-bold text-base text-ink-deep">3. Free-Tier Quotas &amp; Guardrails</h2>
            <p className="text-ink-muted">
              To guarantee no-cost access without requiring credit cards or commercial upgrades:
            </p>
            <ul className="list-disc list-inside space-y-1 text-ink-muted pl-2">
              <li><strong>Document Upload Limit:</strong> Maximum 10MB per PDF file.</li>
              <li><strong>Webpage Ingestion:</strong> Maximum 5MB and 10-second request timeout per URL.</li>
              <li><strong>SSRF Defense:</strong> Restricted to standard public HTTP/HTTPS URLs. Private IP ranges, internal hostnames, and non-web ports are blocked.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading font-bold text-base text-ink-deep">4. Service Availability &amp; Offline Continuity</h2>
            <p className="text-ink-muted">
              Your application tracking, checklist items, deadlines, and personal notes remain fully accessible even if third-party model services are temporarily offline or quotas are exhausted.
            </p>
          </section>
        </div>
      </main>

      <footer className="text-center text-xs text-ink-muted py-4">
        Abroad Application Hub &bull; Free-tier study abroad personal workspace
      </footer>
    </div>
  );
}
