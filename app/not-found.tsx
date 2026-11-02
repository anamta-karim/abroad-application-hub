import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 text-center">
      <div className="glass-stage rounded-3xl p-8 sm:p-12 max-w-md w-full space-y-4">
        <span className="glass-badge-blue px-3 py-1 rounded-full text-xs font-bold">404</span>
        <h1 className="text-2xl font-heading font-extrabold text-ink-deep">Page Not Found</h1>
        <p className="text-sm text-ink-muted">
          The page you requested could not be found or has moved.
        </p>
        <div className="pt-2">
          <Link
            href="/app"
            className="inline-flex items-center justify-center h-10 px-6 text-sm font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-md transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
