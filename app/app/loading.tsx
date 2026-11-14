/**
 * Shown instantly inside the /app layout while the next page loads on the
 * server, so navigation responds the moment a link is clicked.
 */
export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-live="polite" aria-label="Loading page">
      <div className="space-y-3">
        <div className="h-3 w-28 rounded-full bg-slate-200/80" />
        <div className="h-9 w-64 max-w-full rounded-xl bg-slate-200/80" />
        <div className="h-3 w-96 max-w-full rounded-full bg-slate-200/60" />
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="h-4 w-40 rounded-full bg-slate-200/80" />
        <div className="space-y-3">
          <div className="h-3 w-full rounded-full bg-slate-200/60" />
          <div className="h-3 w-5/6 rounded-full bg-slate-200/60" />
          <div className="h-3 w-2/3 rounded-full bg-slate-200/60" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-5 space-y-3">
            <div className="h-3 w-24 rounded-full bg-slate-200/80" />
            <div className="h-7 w-16 rounded-lg bg-slate-200/80" />
          </div>
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
