import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  buildMonthGrid,
  gridRange,
  monthLabel,
  monthParam,
  parseMonthParam,
  shiftMonth,
  todayString,
  countdownLabel,
  formatDateLabel,
  daysBetween,
  WEEKDAY_LABELS,
} from "@/lib/calendar";

type EventKind = "deadline" | "task" | "document" | "opening";

interface CalendarEvent {
  date: string;
  kind: EventKind;
  title: string;
  subtitle: string | null;
  href: string;
}

const KIND_STYLES: Record<EventKind, { label: string; chip: string; dot: string }> = {
  deadline: { label: "Application deadline", chip: "bg-blue-100 text-blue-900 border-blue-200", dot: "bg-blue-600" },
  task: { label: "Task due", chip: "bg-amber-100 text-amber-900 border-amber-200", dot: "bg-amber-500" },
  document: { label: "Document due", chip: "bg-violet-100 text-violet-900 border-violet-200", dot: "bg-violet-500" },
  opening: { label: "Expected opening", chip: "bg-teal-100 text-teal-900 border-teal-200", dot: "bg-teal-500" },
};

const MAX_CHIPS = 3;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DeadlinesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const rawMonth = Array.isArray(sp.month) ? sp.month[0] : sp.month;
  const ref = parseMonthParam(rawMonth);
  const today = todayString();
  const weeks = buildMonthGrid(ref, today);
  const { from, to } = gridRange(weeks);

  const supabase = await createClient();
  const [{ data: apps }, { data: tasks }, { data: docs }, { data: reminders }, { data: nextApps }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, title, institution_or_provider, deadline, status")
      .is("archived_at", null)
      .gte("deadline", from)
      .lte("deadline", to),
    supabase
      .from("tasks")
      .select("id, title, due_date, status, application_id, applications(title)")
      .in("status", ["open", "in_progress"])
      .gte("due_date", from)
      .lte("due_date", to),
    supabase
      .from("document_requirements")
      .select("id, document_type, due_date, status, application_id, applications(title)")
      .in("status", ["not_started", "in_progress", "requested"])
      .gte("due_date", from)
      .lte("due_date", to),
    supabase
      .from("opening_reminders" as any)
      .select("id, title, institution_or_provider, expected_open_date, status")
      .eq("status", "watching")
      .gte("expected_open_date", from)
      .lte("expected_open_date", to),
    supabase
      .from("applications")
      .select("id, title, deadline")
      .is("archived_at", null)
      .gte("deadline", today)
      .order("deadline", { ascending: true })
      .limit(1),
  ]);

  const events: CalendarEvent[] = [
    ...(apps || []).map((a) => ({
      date: a.deadline as string,
      kind: "deadline" as const,
      title: a.title,
      subtitle: a.institution_or_provider,
      href: `/app/applications/${a.id}`,
    })),
    ...((tasks || []) as any[]).map((t) => ({
      date: t.due_date as string,
      kind: "task" as const,
      title: t.title,
      subtitle: t.applications?.title ?? null,
      href: `/app/applications/${t.application_id}`,
    })),
    ...((docs || []) as any[]).map((d) => ({
      date: d.due_date as string,
      kind: "document" as const,
      title: d.document_type,
      subtitle: d.applications?.title ?? null,
      href: `/app/applications/${d.application_id}`,
    })),
    ...((reminders || []) as any[]).map((r) => ({
      date: r.expected_open_date as string,
      kind: "opening" as const,
      title: r.title,
      subtitle: r.institution_or_provider,
      href: "/app",
    })),
  ].sort((a, b) => (a.date === b.date ? a.kind.localeCompare(b.kind) : a.date < b.date ? -1 : 1));

  const byDate = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const list = byDate.get(e.date) || [];
    list.push(e);
    byDate.set(e.date, list);
  }

  const monthPrefix = `${monthParam(ref)}-`;
  const monthEvents = events.filter((e) => e.date.startsWith(monthPrefix));
  const agendaDates = Array.from(new Set(monthEvents.map((e) => e.date)));
  const nextDeadline = (nextApps || [])[0];
  const isCurrentMonth = today.startsWith(monthPrefix);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-extrabold text-ink-deep tracking-tight">Deadlines</h1>
          <p className="text-sm text-ink-muted mt-1">
            {nextDeadline ? (
              <>
                Next deadline:{" "}
                <Link href={`/app/applications/${nextDeadline.id}`} className="font-bold text-brand-dark hover:text-brand">
                  {nextDeadline.title}
                </Link>{" "}
                · {formatDateLabel(nextDeadline.deadline as string)} ({countdownLabel(nextDeadline.deadline as string, today).toLowerCase()})
              </>
            ) : (
              "No upcoming application deadlines."
            )}
          </p>
        </div>
        <Link
          href="/app/applications/new"
          className="self-start sm:self-auto inline-flex items-center justify-center h-10 px-5 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-md"
        >
          + Add an application
        </Link>
      </div>

      {/* ── Month navigation ── */}
      <nav aria-label="Month" className="flex items-center justify-between gap-2">
        <Link
          href={`/app/deadlines?month=${monthParam(shiftMonth(ref, -1))}`}
          className="h-9 px-3 inline-flex items-center text-xs font-bold text-ink-deep glass-card rounded-xl hover:text-brand"
          aria-label="Previous month"
        >
          ← <span className="hidden sm:inline ml-1">Previous</span>
        </Link>
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-heading font-extrabold text-ink-deep" aria-live="polite">
            {monthLabel(ref)}
          </h2>
          {!isCurrentMonth && (
            <Link href="/app/deadlines" className="text-xs font-bold text-brand hover:text-brand-dark">
              Today
            </Link>
          )}
        </div>
        <Link
          href={`/app/deadlines?month=${monthParam(shiftMonth(ref, 1))}`}
          className="h-9 px-3 inline-flex items-center text-xs font-bold text-ink-deep glass-card rounded-xl hover:text-brand"
          aria-label="Next month"
        >
          <span className="hidden sm:inline mr-1">Next</span> →
        </Link>
      </nav>

      {/* ── Legend ── */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-ink-muted" aria-label="Legend">
        {(Object.keys(KIND_STYLES) as EventKind[]).map((k) => (
          <li key={k} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${KIND_STYLES[k].dot}`} aria-hidden="true" />
            {KIND_STYLES[k].label}
          </li>
        ))}
      </ul>

      {/* ── Month grid ── */}
      <section aria-label={`${monthLabel(ref)} calendar`} className="glass-card rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-white/50">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
              <span className="sm:hidden">{d.slice(0, 1)}</span>
              <span className="hidden sm:inline">{d}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((day, i) => {
            const dayEvents = byDate.get(day.date) || [];
            const isPast = day.date < today;
            return (
              <div
                key={day.date}
                className={`min-h-[3.75rem] sm:min-h-[7.5rem] p-1 sm:p-1.5 border-slate-200/80 ${
                  i % 7 !== 6 ? "border-r" : ""
                } ${i < weeks.length * 7 - 7 ? "border-b" : ""} ${day.inMonth ? "bg-white/30" : "bg-white/5"}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      day.isToday
                        ? "bg-brand text-white"
                        : day.inMonth
                        ? isPast
                          ? "text-ink-subtle"
                          : "text-ink-deep"
                        : "text-ink-subtle/60"
                    }`}
                    aria-label={day.isToday ? `Today, ${formatDateLabel(day.date)}` : undefined}
                  >
                    {day.day}
                  </span>
                </div>

                {/* Phone: coloured dots */}
                {dayEvents.length > 0 && (
                  <a href={`#day-${day.date}`} className="sm:hidden flex flex-wrap gap-0.5 mt-1" aria-label={`${dayEvents.length} items on ${formatDateLabel(day.date)}`}>
                    {dayEvents.slice(0, 4).map((e, j) => (
                      <span key={j} className={`w-1.5 h-1.5 rounded-full ${KIND_STYLES[e.kind].dot}`} />
                    ))}
                  </a>
                )}

                {/* Tablet/desktop: chips */}
                <ul className="hidden sm:block mt-1 space-y-1">
                  {dayEvents.slice(0, MAX_CHIPS).map((e, j) => (
                    <li key={j}>
                      <Link
                        href={e.href}
                        title={`${KIND_STYLES[e.kind].label}: ${e.title}${e.subtitle ? ` · ${e.subtitle}` : ""}`}
                        className={`block truncate px-1.5 py-0.5 rounded-md border text-[11px] font-semibold leading-tight hover:brightness-95 ${
                          KIND_STYLES[e.kind].chip
                        } ${isPast ? "opacity-60" : ""}`}
                      >
                        {e.title}
                      </Link>
                    </li>
                  ))}
                  {dayEvents.length > MAX_CHIPS && (
                    <li>
                      <a href={`#day-${day.date}`} className="block px-1 text-[11px] font-bold text-brand hover:text-brand-dark">
                        +{dayEvents.length - MAX_CHIPS} more
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Agenda for the month ── */}
      <section aria-labelledby="agenda-heading" className="space-y-3">
        <h2 id="agenda-heading" className="text-sm font-heading font-bold text-ink-deep">
          {monthLabel(ref)} · {monthEvents.length} {monthEvents.length === 1 ? "item" : "items"}
        </h2>
        {monthEvents.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center text-xs text-ink-muted">
            Nothing scheduled this month. Deadlines, task and document due dates, and watchlist openings appear here.
          </div>
        ) : (
          <div className="glass-card rounded-2xl divide-y divide-glass-borderSubtle overflow-hidden">
            {agendaDates.map((date) => {
              const diff = daysBetween(today, date);
              return (
                <div key={date} id={`day-${date}`} className="p-4 sm:px-5 flex flex-col sm:flex-row gap-2 sm:gap-6 scroll-mt-24">
                  <div className="sm:w-36 shrink-0">
                    <span className={`block text-sm font-bold ${diff < 0 ? "text-ink-subtle" : "text-ink-deep"}`}>
                      {formatDateLabel(date)}
                    </span>
                    <span className={`text-xs ${diff >= 0 && diff <= 7 ? "text-amber-700 font-semibold" : "text-ink-muted"}`}>
                      {countdownLabel(date, today)}
                    </span>
                  </div>
                  <ul className="flex-1 space-y-2 min-w-0">
                    {(byDate.get(date) || []).map((e, j) => (
                      <li key={j} className="flex items-start gap-2.5 min-w-0">
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${KIND_STYLES[e.kind].dot}`} aria-hidden="true" />
                        <div className="min-w-0">
                          <Link href={e.href} className="text-sm font-semibold text-ink-deep hover:text-brand break-words">
                            {e.title}
                          </Link>
                          <span className="block text-xs text-ink-muted">
                            {KIND_STYLES[e.kind].label}
                            {e.subtitle ? ` · ${e.subtitle}` : ""}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
