import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RecommenderDirectory, type DirectoryReferee } from "@/components/RecommenderDirectory";
import { ADVICE_STYLES } from "@/components/letterStyles";
import { loadLetters, loadLettersNeeded, loadRecommenders } from "@/lib/recommendationsData";
import { letterAdvice, letterDueDate, letterProgress, letterProgressText } from "@/lib/recommendations";
import { todayString } from "@/lib/calendar";

export const metadata = { title: "Recommenders · AbroadAtlas" };

export default async function RecommendersPage() {
  const supabase = await createClient();
  const today = todayString();

  const [{ letters, migrationMissing }, referees, { data: appsData }] = await Promise.all([
    loadLetters(supabase),
    loadRecommenders(supabase),
    supabase
      .from("applications")
      .select("id, title, institution_or_provider, deadline, status, archived_at")
      .order("deadline", { ascending: true, nullsFirst: false }),
  ]);

  const apps = appsData ?? [];
  const appById = new Map(apps.map((a) => [a.id, a]));
  const activeApps = apps.filter((a) => !a.archived_at && !["rejected", "withdrawn"].includes(a.status));
  const needed = await loadLettersNeeded(
    supabase,
    activeApps.map((a) => a.id)
  );

  // Letters that need action now, most urgent first
  const toneRank = { bad: 0, warn: 1, info: 2 } as const;
  const attention = letters
    .map((l) => {
      const app = appById.get(l.application_id);
      if (!app || app.archived_at) return null;
      const advice = letterAdvice(l, app.deadline, today);
      if (!advice || advice.tone === "info") return null;
      return { letter: l, app, advice, due: letterDueDate(l, app.deadline) };
    })
    .filter((x) => x !== null)
    .sort((a, b) => toneRank[a.advice.tone] - toneRank[b.advice.tone] || (a.due ?? "9999").localeCompare(b.due ?? "9999"));

  const byApp = activeApps
    .map((app) => {
      const appLetters = letters.filter((l) => l.application_id === app.id);
      const n = needed.get(app.id) ?? null;
      return { app, progress: letterProgress(appLetters, n?.count ?? null), hasLetters: appLetters.length > 0, statedNeed: Boolean(n) };
    })
    .filter((x) => x.hasLetters || x.statedNeed);

  const directory: DirectoryReferee[] = referees.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    email: r.email,
    notes: r.notes,
    letters: letters
      .filter((l) => l.recommender_id === r.id)
      .map((l) => {
        const app = appById.get(l.application_id);
        return {
          id: l.id,
          applicationId: l.application_id,
          appTitle: app?.title ?? "Application",
          status: l.status,
          due: letterDueDate(l, app?.deadline ?? null),
        };
      }),
  }));

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-heading font-extrabold text-ink-deep tracking-tight">Recommenders</h1>
        <p className="text-sm text-ink-muted mt-1 max-w-2xl">
          Track who is writing your recommendation letters, for which applications, and when to ask, follow up or send a
          reminder.
        </p>
      </div>

      {attention.length > 0 && (
        <section aria-labelledby="attention-heading" className="glass-card rounded-2xl p-5 space-y-3">
          <h2 id="attention-heading" className="font-heading font-bold text-base text-ink-deep">
            Needs attention
          </h2>
          <ul className="divide-y divide-slate-200/70">
            {attention.map(({ letter, app, advice }) => (
              <li key={letter.id}>
                <Link href={`/app/applications/${app.id}#letters-heading`} className="block py-2.5 group">
                  <span className="block text-sm font-semibold text-ink-deep group-hover:text-brand">
                    {letter.recommender?.name ?? "Referee"} · {app.title}
                  </span>
                  <span className={`block text-xs font-semibold ${ADVICE_STYLES[advice.tone]}`}>{advice.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {byApp.length > 0 && (
        <section aria-labelledby="by-app-letters-heading" className="space-y-3">
          <h2 id="by-app-letters-heading" className="font-heading font-bold text-base text-ink-deep">
            By application
          </h2>
          <ul className="space-y-2">
            {byApp.map(({ app, progress }) => (
              <li key={app.id}>
                <Link
                  href={`/app/applications/${app.id}#letters-heading`}
                  className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-white/80 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-ink-deep truncate">{app.title}</p>
                    {app.institution_or_provider && <p className="text-xs text-ink-muted truncate">{app.institution_or_provider}</p>}
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-lg border text-xs font-bold ${
                      progress.done
                        ? "bg-teal-50 text-teal-800 border-teal-200"
                        : progress.refereesMissing > 0
                        ? "bg-amber-50 text-amber-900 border-amber-200"
                        : "bg-slate-50 text-ink-main border-slate-200"
                    }`}
                  >
                    {letterProgressText(progress)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="glass-stage rounded-3xl p-6 sm:p-8">
        <RecommenderDirectory referees={directory} migrationMissing={migrationMissing} />
      </section>
    </div>
  );
}
