import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen p-4 sm:p-8 flex flex-col justify-between max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2">
        <Link
          href="/"
          className="text-xs font-semibold text-ink-muted hover:text-brand transition-colors inline-flex items-center gap-1.5"
        >
          &larr; Back to Home
        </Link>
        <span className="text-xs font-bold text-ink-subtle">Abroad Application Hub</span>
      </header>

      {/* Main Glass Stage */}
      <main className="glass-stage rounded-3xl p-6 sm:p-12 space-y-6">
        <div className="space-y-1">
          <span className="glass-badge-teal px-3 py-1 rounded-full text-xs font-bold inline-block">
            Data Protection &amp; Privacy
          </span>
          <h1 className="text-3xl font-heading font-extrabold text-ink-deep tracking-tight mt-2">
            Privacy Policy
          </h1>
          <p className="text-xs text-ink-muted">
            Last updated: November 2026 &bull; Strict owner-isolated architecture
          </p>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-ink-deep leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-heading font-bold text-base text-ink-deep">1. Strict User Isolation</h2>
            <p className="text-ink-muted">
              Abroad Application Hub enforces PostgreSQL Row Level Security (RLS) across every database table. Every application, task, deadline, note, and uploaded prospectus chunk is owner-scoped. No other user or third-party advertiser can query, view, or modify your application portfolio.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading font-bold text-base text-ink-deep">2. Storage &amp; Private Documents</h2>
            <p className="text-ink-muted">
              Uploaded prospectuses, certificates, and admissions files are stored in private storage buckets. Public access is disabled. Files are only accessible through short-lived signed URLs generated specifically for your active session.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading font-bold text-base text-ink-deep">3. Grounded Verification &amp; No Silent Overwrites</h2>
            <p className="text-ink-muted">
              Extracted admissions requirements and deadlines remain suggested facts until you explicitly review and confirm them. Refreshed source ingestion never silently overwrites user-confirmed entries.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading font-bold text-base text-ink-deep">4. Account &amp; Data Deletion (Right to be Forgotten)</h2>
            <p className="text-ink-muted">
              You retain complete ownership over your data. You may download an offline JSON archive of your entire workspace at any time from Account Settings. Clicking &ldquo;Delete Account&rdquo; immediately and permanently wipes all your database rows, chunks, snapshots, and files.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-heading font-bold text-base text-ink-deep">5. Zero Third-Party Advertising</h2>
            <p className="text-ink-muted">
              This service operates entirely within verified free-tier infrastructure. We do not use commercial trackers, advertising cookies, or behavioral profiling tools.
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
