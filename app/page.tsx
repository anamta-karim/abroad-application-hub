import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* ═══ Floating Frosted Glass Navigation ═══ */}
      <header className="sticky top-4 z-40 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-nav rounded-2xl px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-dark text-white flex items-center justify-center font-heading font-extrabold text-sm shadow-md shadow-brand/20">
              A
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-ink-deep text-base tracking-tight leading-tight">
                Abroad Application Hub
              </span>
              <span className="text-[10px] font-semibold text-ink-muted hidden sm:inline-block">
                Study Abroad &amp; Scholarship Workspace
              </span>
            </div>
          </div>

          <nav className="flex items-center space-x-2 text-sm font-semibold">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-ink-muted hover:text-ink-deep hover:bg-white/60 transition-all min-h-[40px] flex items-center"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand text-white text-xs sm:text-sm font-bold shadow-md shadow-brand/20 transition-all min-h-[40px] flex items-center active:scale-95"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* ═══ Hero & Value Proposition (Master Frosted Glass Stage) ═══ */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col justify-center space-y-12">
        <div className="glass-stage rounded-[32px] p-8 sm:p-14 lg:p-16 space-y-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-badge-teal text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-teal animate-pulse" aria-hidden="true" />
            Study Abroad &amp; Scholarship Workspace
          </div>

          <div className="space-y-4 max-w-4xl">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight text-ink-deep leading-tight">
              Organize international applications with your own official sources.
            </h1>
            <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-3xl">
              A dedicated personal workspace to track programs, scholarships, and deadlines. Ground requirements directly in your uploaded prospectus PDFs and official university pages.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand text-white font-bold text-sm shadow-lg shadow-brand/25 active:scale-95 transition-all text-center"
            >
              Create free workspace
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl glass-input text-ink-deep font-bold text-sm hover:bg-white transition-all text-center"
            >
              Sign in to workspace
            </Link>
          </div>
        </div>

        {/* ═══ 3 Core Pillars (Frosted Glass Cards) ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-7 space-y-3">
            <div className="w-10 h-10 rounded-xl glass-badge-blue flex items-center justify-center font-heading font-bold text-sm mb-2">
              01
            </div>
            <h2 className="font-heading font-bold text-ink-deep text-base">Official source grounding</h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Requirements, deadlines, and criteria cite exact pages from your official prospectus documents and webpages.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-7 space-y-3">
            <div className="w-10 h-10 rounded-xl glass-badge-teal flex items-center justify-center font-heading font-bold text-sm mb-2">
              02
            </div>
            <h2 className="font-heading font-bold text-ink-deep text-base">User-reviewed facts</h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Extracted dates and requirements remain pending suggestions until you verify them. Nothing is silently overwritten.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-7 space-y-3">
            <div className="w-10 h-10 rounded-xl glass-badge-neutral flex items-center justify-center font-heading font-bold text-sm mb-2">
              03
            </div>
            <h2 className="font-heading font-bold text-ink-deep text-base">Private &amp; independent</h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Every document and application record is owner-isolated with strict row-level security. Built entirely within free-tier limits.
            </p>
          </div>
        </div>
      </main>

      {/* ═══ Footer ═══ */}
      <footer className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-xs text-ink-muted">
        <div className="glass-card rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Abroad Application Hub &bull; Personal study-abroad and scholarship workspace</span>
          <div className="flex items-center space-x-4">
            <Link href="/privacy" className="hover:text-brand transition-colors font-medium">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-brand transition-colors font-medium">
              Terms &amp; Quotas
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
