import Link from "next/link";
import type { ActionItem, ActionKind, Urgency } from "@/lib/weekly";

const MAX_ITEMS = 6;

const KIND_DOT: Record<ActionKind, string> = {
  deadline: "bg-blue-600",
  document: "bg-violet-500",
  task: "bg-amber-500",
  letter: "bg-rose-500",
  opening: "bg-teal-500",
};

const URGENCY_BADGE: Record<Urgency, { label: string; cls: string } | null> = {
  overdue: { label: "Overdue", cls: "bg-red-50 text-red-700 border-red-200" },
  urgent: { label: "Soon", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  soon: null,
};

export function ThisWeekPanel({ items }: { items: ActionItem[] }) {
  const shown = items.slice(0, MAX_ITEMS);
  const overdue = items.filter((i) => i.urgency === "overdue").length;

  return (
    <section aria-labelledby="this-week-heading" className="glass-card rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="this-week-heading" className="font-heading font-bold text-base text-ink-deep">
            This week
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {items.length === 0
              ? "Deadlines in the next 2 weeks and items due in the next 7 days."
              : `${items.length} ${items.length === 1 ? "thing needs" : "things need"} attention${
                  overdue > 0 ? `, ${overdue} overdue` : ""
                }.`}
          </p>
        </div>
        <Link href="/app/deadlines" className="shrink-0 text-xs font-bold text-brand hover:text-brand-dark">
          Calendar →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted py-2">
          <span className="text-teal-dark font-bold" aria-hidden="true">✓ </span>
          Nothing due in the next two weeks. Add deadlines and due dates to your applications to see them here.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200/70">
          {shown.map((item) => {
            const badge = URGENCY_BADGE[item.urgency];
            return (
              <li key={item.key}>
                <Link href={item.href} className="flex items-start gap-3 py-2.5 group">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${KIND_DOT[item.kind]}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink-deep group-hover:text-brand break-words">
                      {item.title}
                    </span>
                    <span className="block text-xs text-ink-muted break-words">{item.detail}</span>
                  </span>
                  {badge && (
                    <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > shown.length && (
        <Link href="/app/deadlines" className="block text-xs font-bold text-brand hover:text-brand-dark">
          +{items.length - shown.length} more on the calendar
        </Link>
      )}
    </section>
  );
}
