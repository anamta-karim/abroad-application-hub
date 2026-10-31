import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="border-b border-rule bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="font-semibold text-forest text-lg">
            Abroad Application Hub
          </div>
          <nav className="flex items-center space-x-3 text-sm">
            <Link
              href="/login"
              className="px-3 py-2 text-ink hover:text-forest focus:outline-none focus:underline"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-forest text-surface rounded hover:bg-forest-hover focus:outline-none focus:ring-2 focus:ring-forest"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="space-y-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">
            Organize study-abroad programs and scholarships in one place.
          </h1>
          <p className="text-lg text-ink-muted leading-relaxed max-w-2xl">
            A personal workspace to manage university and scholarship applications using official sources. Track deadlines, requirements, and documents with citations directly from your uploaded materials and program pages.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center h-11 px-6 text-sm font-medium bg-forest text-surface rounded hover:bg-forest-hover focus:outline-none focus:ring-2 focus:ring-forest"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-11 px-6 text-sm font-medium bg-surface text-ink border border-rule rounded hover:bg-paper focus:outline-none focus:ring-2 focus:ring-forest"
            >
              Log in to workspace
            </Link>
          </div>

          <div className="pt-12 border-t border-rule grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <h2 className="font-semibold text-ink">Official source grounding</h2>
              <p className="text-ink-muted leading-normal">
                Requirements, dates, and funding details cite specific pages from your uploaded PDFs and saved program webpages.
              </p>
            </div>
            <div className="space-y-2">
              <h2 className="font-semibold text-ink">User-reviewed facts</h2>
              <p className="text-ink-muted leading-normal">
                Extracted information stays as suggested items until you verify or edit them. Nothing is silently overwritten.
              </p>
            </div>
            <div className="space-y-2">
              <h2 className="font-semibold text-ink">Private and independent</h2>
              <p className="text-ink-muted leading-normal">
                Your documents and applications remain completely private to your account. All features run within free-tier limits.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-rule bg-paper py-6 text-xs text-ink-muted">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>Abroad Application Hub. Personal study-abroad and scholarship workspace.</p>
          <p>Free-tier deployment, private user data.</p>
        </div>
      </footer>
    </div>
  );
}
