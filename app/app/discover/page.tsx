import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DiscoverAddButton } from "@/components/DiscoverAddButton";
import {
  searchCatalog,
  catalogCountries,
  DEGREE_LEVEL_FILTERS,
  type CatalogEntry,
} from "@/lib/catalog/scholarships";
import { searchUniversities, STUDY_DESTINATIONS, type UniversityResult } from "@/lib/catalog/universities";
import { searchUsSchools, filterPrograms, type UsSchoolResult } from "@/lib/catalog/usPrograms";
import { errorMessage } from "@/lib/errors";

type Tab = "scholarships" | "universities" | "us-programs";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const MAX_PROGRAMS_PER_SCHOOL = 30;

function param(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v || "").trim().slice(0, 120);
}

function newApplicationHref(fields: Record<string, string | null | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) if (v) qs.set(k, v);
  return `/app/applications/new?${qs.toString()}`;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const rawTab = param(sp, "tab");
  const tab: Tab = rawTab === "universities" || rawTab === "us-programs" ? rawTab : "scholarships";
  const q = param(sp, "q");
  const country = param(sp, "country");
  const level = param(sp, "level");
  const program = param(sp, "program");

  const supabase = await createClient();

  // What the user already has, so results can show "Added"
  const [{ data: appsData }, { data: remindersData }] = await Promise.all([
    supabase.from("applications").select("id, title, institution_or_provider"),
    supabase.from("opening_reminders").select("title, status"),
  ]);
  const addedApps = new Map<string, string>();
  for (const a of appsData || []) {
    addedApps.set(`${a.title}|${a.institution_or_provider || ""}`.toLowerCase(), a.id);
  }
  const watching = new Set(
    (remindersData || []).filter((r) => r.status === "watching").map((r) => String(r.title).toLowerCase())
  );

  let scholarships: CatalogEntry[] = [];
  let universities: UniversityResult[] = [];
  let usSchools: UsSchoolResult[] = [];
  let searchError: string | null = null;

  if (tab === "scholarships") {
    scholarships = searchCatalog({ query: q, country, degreeLevel: level });
  } else if (tab === "universities" && q) {
    try {
      universities = await searchUniversities(q, country);
    } catch (err) {
      searchError = errorMessage(err) || "University search failed.";
    }
  } else if (tab === "us-programs" && q) {
    try {
      usSchools = await searchUsSchools(q);
    } catch (err) {
      searchError = errorMessage(err) || "US program search failed.";
    }
  }

  const tabs: { id: Tab; label: string; hint: string }[] = [
    { id: "scholarships", label: "Scholarships", hint: "Curated international awards" },
    { id: "universities", label: "Universities worldwide", hint: "Research Organization Registry" },
    { id: "us-programs", label: "US degree programs", hint: "College Scorecard" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-brand font-heading">Discover</span>
        <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-ink-deep tracking-tight">
          Find programs &amp; scholarships
        </h1>
        <p className="text-sm text-ink-muted max-w-2xl">
          Search known scholarships, universities, and US degree programs, then add them to your workspace in one click.
        </p>
      </div>

      {/* ── Tabs ── */}
      <nav aria-label="Discover sources" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/app/discover?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              tab === t.id
                ? "bg-brand text-white shadow-sm"
                : "glass-card text-ink-main hover:text-brand"
            }`}
          >
            {t.label}
            <span className={`block text-[10px] font-medium ${tab === t.id ? "text-white/80" : "text-ink-subtle"}`}>
              {t.hint}
            </span>
          </Link>
        ))}
      </nav>

      {/* ── Honesty note ── */}
      <p className="text-xs text-ink-muted glass-card-subtle rounded-xl px-4 py-3 leading-relaxed">
        <strong className="text-ink-deep">Always confirm on the official page.</strong> Imported items are saved as
        unreviewed. Funding and windows describe past cycles, and deadlines change every year, so add your real deadline
        once the call is published.
      </p>

      {/* ── Search form (GET, so results are linkable) ── */}
      <form method="get" action="/app/discover" className="glass-card rounded-2xl p-4 flex flex-col lg:flex-row gap-2">
        <input type="hidden" name="tab" value={tab} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          required={tab !== "scholarships"}
          minLength={tab !== "scholarships" ? 2 : undefined}
          aria-label={tab === "us-programs" ? "School name" : tab === "universities" ? "University name" : "Search scholarships"}
          placeholder={
            tab === "us-programs"
              ? "School name, e.g. Carnegie Mellon"
              : tab === "universities"
              ? "University name or keyword, e.g. technical"
              : "Keyword, e.g. fully funded, Korea, leadership"
          }
          className="w-full lg:flex-1 h-10 px-3.5 text-sm glass-input rounded-xl text-ink-deep placeholder:text-ink-subtle"
        />

        {tab === "us-programs" && (
          <input
            type="search"
            name="program"
            defaultValue={program}
            aria-label="Program keyword"
            placeholder="Program keyword, e.g. computer"
            className="lg:w-56 h-10 px-3.5 text-sm glass-input rounded-xl text-ink-deep placeholder:text-ink-subtle"
          />
        )}

        {tab === "scholarships" && (
          <select
            name="country"
            defaultValue={country}
            aria-label="Country"
            className="lg:w-48 h-10 px-3 text-sm glass-input rounded-xl text-ink-deep"
          >
            <option value="">All countries</option>
            {catalogCountries().map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        {tab === "universities" && (
          <select
            name="country"
            defaultValue={country}
            aria-label="Country"
            className="lg:w-48 h-10 px-3 text-sm glass-input rounded-xl text-ink-deep"
          >
            <option value="">All countries</option>
            {STUDY_DESTINATIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        {(tab === "scholarships" || tab === "us-programs") && (
          <select
            name="level"
            defaultValue={level}
            aria-label="Degree level"
            className="lg:w-40 h-10 px-3 text-sm glass-input rounded-xl text-ink-deep"
          >
            <option value="">Any level</option>
            {(tab === "scholarships" ? DEGREE_LEVEL_FILTERS : ["Bachelor's", "Master's", "PhD", "Professional Degree"]).map(
              (l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              )
            )}
          </select>
        )}

        <button
          type="submit"
          className="h-10 px-5 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-sm transition-all cursor-pointer"
        >
          Search
        </button>
      </form>

      {searchError && (
        <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {searchError}
        </p>
      )}

      {/* ── Scholarships ── */}
      {tab === "scholarships" && (
        <section aria-label="Scholarship results" className="space-y-3">
          <p className="text-xs text-ink-subtle">
            {scholarships.length} {scholarships.length === 1 ? "scholarship" : "scholarships"}
          </p>
          {scholarships.length === 0 && (
            <EmptyResults text="No scholarships match. Try fewer words or clear the filters." />
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {scholarships.map((entry) => {
              const appId = addedApps.get(`${entry.title}|${entry.provider}`.toLowerCase());
              return (
                <article key={entry.id} className="glass-card rounded-2xl p-5 flex flex-col gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="glass-badge-blue px-2 py-0.5 rounded text-[11px] font-bold">{entry.country}</span>
                      {entry.degreeLevels.map((l) => (
                        <span key={l} className="glass-badge-neutral px-2 py-0.5 rounded text-[11px] font-semibold">
                          {l}
                        </span>
                      ))}
                    </div>
                    <h2 className="font-heading font-bold text-base text-ink-deep leading-snug">{entry.title}</h2>
                    <p className="text-xs text-ink-muted">{entry.provider}</p>
                  </div>
                  <dl className="text-xs text-ink-main space-y-1.5 leading-relaxed">
                    <div>
                      <dt className="inline font-semibold text-ink-deep">Usually covers: </dt>
                      <dd className="inline">{entry.funding}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-ink-deep">Who can apply: </dt>
                      <dd className="inline">{entry.eligibility}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-ink-deep">Typical window: </dt>
                      <dd className="inline">{entry.typicalWindow}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto pt-2 flex flex-wrap items-center gap-2">
                    <DiscoverAddButton
                      kind="catalog"
                      entryId={entry.id}
                      mode="application"
                      added={Boolean(appId)}
                      addedHref={appId ? `/app/applications/${appId}` : undefined}
                    />
                    {entry.typicalOpenMonth && (
                      <DiscoverAddButton
                        kind="catalog"
                        entryId={entry.id}
                        mode="watchlist"
                        added={watching.has(entry.title.toLowerCase())}
                      />
                    )}
                    <a
                      href={entry.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-brand hover:text-brand-dark ml-auto"
                    >
                      Official page ↗
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Universities (ROR) ── */}
      {tab === "universities" && (
        <section aria-label="University results" className="space-y-3">
          {!q && <EmptyResults text="Search by name to find a university anywhere in the world." />}
          {q && !searchError && universities.length === 0 && (
            <EmptyResults text="No universities found. Try another spelling, the English name, or remove the country filter." />
          )}
          <div className="glass-card rounded-2xl divide-y divide-glass-borderSubtle overflow-hidden">
            {universities.map((u) => (
              <div key={u.rorId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <h2 className="font-bold text-sm text-ink-deep">{u.name}</h2>
                  <p className="text-xs text-ink-muted">
                    {[u.city, u.country].filter(Boolean).join(", ")}
                    {u.website && (
                      <>
                        {" · "}
                        <a
                          href={u.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand hover:text-brand-dark break-all"
                        >
                          {u.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <Link
                  href={newApplicationHref({
                    institution: u.name,
                    country: u.country,
                    officialUrl: u.website,
                    recordType: "program",
                  })}
                  className="shrink-0 h-9 px-4 inline-flex items-center text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-sm"
                >
                  + Add a program here
                </Link>
              </div>
            ))}
          </div>
          {universities.length > 0 && (
            <p className="text-[11px] text-ink-subtle">
              University data from the Research Organization Registry (ROR), CC0. Pick a university, then enter the program
              name or paste its admissions page to auto-fill.
            </p>
          )}
        </section>
      )}

      {/* ── US programs (College Scorecard) ── */}
      {tab === "us-programs" && (
        <section aria-label="US program results" className="space-y-4">
          {!q && <EmptyResults text="Search for a US school by name to list the degree programs it offers." />}
          {q && !searchError && usSchools.length === 0 && (
            <EmptyResults text="No US schools found with that name. Try the official name, e.g. 'University of Michigan'." />
          )}
          {usSchools.map((school) => {
            const programs = filterPrograms(school.programs, program, level);
            const shown = programs.slice(0, MAX_PROGRAMS_PER_SCHOOL);
            return (
              <article key={school.id} className="glass-card rounded-2xl overflow-hidden">
                <header className="px-5 py-4 border-b border-glass-borderSubtle">
                  <h2 className="font-heading font-bold text-base text-ink-deep">{school.name}</h2>
                  <p className="text-xs text-ink-muted">
                    {[school.city, school.state].filter(Boolean).join(", ")} · {programs.length} matching{" "}
                    {programs.length === 1 ? "program" : "programs"}
                  </p>
                </header>
                {programs.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-ink-muted">No programs match your keyword or level at this school.</p>
                ) : (
                  <ul className="divide-y divide-glass-borderSubtle">
                    {shown.map((p) => {
                      const title = p.degreeLevel ? `${p.title} (${p.degreeLevel})` : p.title;
                      const appId = addedApps.get(`${title}|${school.name}`.toLowerCase());
                      return (
                        <li
                          key={`${p.title}-${p.degreeLevel}`}
                          className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-sm font-semibold text-ink-deep">{p.title}</p>
                            <p className="text-xs text-ink-muted">{p.credential}</p>
                          </div>
                          <DiscoverAddButton
                            kind="us-program"
                            payload={{
                              programTitle: p.title,
                              degreeLevel: p.degreeLevel,
                              schoolName: school.name,
                              city: school.city,
                              state: school.state,
                              website: school.website,
                            }}
                            added={Boolean(appId)}
                            addedHref={appId ? `/app/applications/${appId}` : undefined}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
                {programs.length > shown.length && (
                  <p className="px-5 py-3 text-[11px] text-ink-subtle border-t border-glass-borderSubtle">
                    Showing {shown.length} of {programs.length}. Add a program keyword to narrow the list.
                  </p>
                )}
              </article>
            );
          })}
          {usSchools.length > 0 && (
            <p className="text-[11px] text-ink-subtle">
              Program data from the U.S. Department of Education College Scorecard. It lists programs by field of study and
              degree, not deadlines: check the department&apos;s admissions page.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function EmptyResults({ text }: { text: string }) {
  return <p className="glass-card rounded-2xl p-6 text-center text-xs text-ink-muted">{text}</p>;
}
