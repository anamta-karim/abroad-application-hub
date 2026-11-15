import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationRow } from "@/types/database";
import { computeCostSummary, costInputsFromRow, formatMoney, type CostSummary } from "@/lib/costs";
import { getRates, convertToBase, SUPPORTED_CURRENCIES, SUPPORTED_CURRENCY_CODES } from "@/lib/fx";
import { countdownLabel, daysBetween, formatDateLabel, todayString } from "@/lib/calendar";

const MAX_COMPARE = 4;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_LABELS: Record<string, string> = {
  researching: "Researching",
  preparing: "Preparing",
  submitted: "Submitted",
  interview: "Interview",
  offer_received: "Offer received",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readIds(raw: string | string[] | undefined): string[] {
  const list = (Array.isArray(raw) ? raw : raw ? [raw] : []).flatMap((v) => v.split(","));
  return Array.from(new Set(list.map((s) => s.trim()).filter((s) => UUID_RE.test(s)))).slice(0, MAX_COMPARE);
}

interface Column {
  app: ApplicationRow;
  cost: CostSummary;
  /** Amounts converted into the display currency (null = cannot convert). */
  converted: {
    tuition: number | null;
    living: number | null;
    fee: number | null;
    funding: number | null;
    total: number | null;
    net: number | null;
  };
  canConvert: boolean;
  docsReady: number;
  docsTotal: number;
  openTasks: number;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const selectedIds = readIds(sp.ids);
  const supabase = await createClient();
  const today = todayString();

  const { data: allApps } = await supabase
    .from("applications")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  const apps = allApps || [];

  const selected = selectedIds.map((id) => apps.find((a) => a.id === id)).filter((a): a is ApplicationRow => Boolean(a));

  // Display currency: chosen, else the most common currency among selected apps, else USD
  const rawCurrency = String(Array.isArray(sp.currency) ? sp.currency[0] : sp.currency || "").toUpperCase();
  const currencyCounts = new Map<string, number>();
  for (const a of selected) if (a.cost_currency) currencyCounts.set(a.cost_currency, (currencyCounts.get(a.cost_currency) || 0) + 1);
  const mostCommon = [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const displayCurrency = SUPPORTED_CURRENCY_CODES.has(rawCurrency)
    ? rawCurrency
    : mostCommon && SUPPORTED_CURRENCY_CODES.has(mostCommon)
    ? mostCommon
    : "USD";

  let columns: Column[] = [];
  let fxDate: string | null = null;
  let fxFailed = false;

  if (selected.length > 0) {
    const ids = selected.map((a) => a.id);
    const needsFx = selected.some((a) => a.cost_currency && a.cost_currency !== displayCurrency);

    const [{ data: reqs }, { data: tasks }, fx] = await Promise.all([
      supabase.from("document_requirements").select("application_id, status").in("application_id", ids),
      supabase.from("tasks").select("application_id, status").in("application_id", ids),
      needsFx ? getRates(displayCurrency) : Promise.resolve(null),
    ]);
    if (needsFx && !fx) fxFailed = true;
    fxDate = fx?.date ?? null;

    columns = selected.map((app) => {
      const inputs = costInputsFromRow(app);
      const cost = computeCostSummary(inputs);
      const from = cost.currency;
      const conv = (n: number | null) =>
        n === null ? null : from === displayCurrency ? n : convertToBase(n, from, fx);
      const canConvert = !cost.hasAny || from === displayCurrency || conv(1) !== null;
      const appReqs = (reqs || []).filter((r) => r.application_id === app.id && r.status !== "not_applicable");
      return {
        app,
        cost,
        canConvert,
        converted: {
          tuition: conv(inputs.tuitionPerYear),
          living: conv(inputs.livingCostPerYear),
          fee: conv(inputs.applicationFee),
          funding: conv(inputs.fundingPerYear),
          total: cost.hasAny ? conv(cost.totalCost) : null,
          net: cost.hasAny ? conv(cost.netCost) : null,
        },
        docsReady: appReqs.filter((r) => r.status === "ready" || r.status === "submitted").length,
        docsTotal: appReqs.length,
        openTasks: (tasks || []).filter((t) => t.application_id === app.id && (t.status === "open" || t.status === "in_progress")).length,
      };
    });
  }

  // Highlights
  const netValues = columns.filter((c) => c.converted.net !== null).map((c) => c.converted.net as number);
  const lowestNet = netValues.length >= 2 ? Math.min(...netValues) : null;
  const upcoming = columns
    .filter((c) => c.app.deadline && c.app.deadline >= today)
    .sort((a, b) => ((a.app.deadline ?? "") < (b.app.deadline ?? "") ? -1 : 1));
  const firstDueId = upcoming.length >= 2 ? upcoming[0].app.id : null;

  const money = (n: number | null) => (n === null ? null : formatMoney(n, displayCurrency));
  const withoutId = (id: string) => {
    const rest = selectedIds.filter((x) => x !== id);
    const qs = new URLSearchParams();
    for (const r of rest) qs.append("ids", r);
    qs.set("currency", displayCurrency);
    return `/app/compare?${qs.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-widest text-brand font-heading">Compare</span>
        <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-ink-deep tracking-tight">
          Compare applications
        </h1>
        <p className="text-sm text-ink-muted max-w-2xl">
          Pick up to {MAX_COMPARE} programs or scholarships to see deadlines, progress and costs side by side.
        </p>
      </div>

      {/* ── Picker (GET form, so a comparison is a shareable URL) ── */}
      <form method="get" action="/app/compare" className="glass-card rounded-2xl p-4 sm:p-5 space-y-4">
        {apps.length === 0 ? (
          <p className="text-sm text-ink-muted">
            You have no active applications yet.{" "}
            <Link href="/app/discover" className="font-bold text-brand hover:text-brand-dark">
              Find some in Discover
            </Link>
            .
          </p>
        ) : (
          <fieldset>
            <legend className="text-xs font-bold text-ink-deep font-heading mb-2">
              Choose applications ({selected.length}/{MAX_COMPARE} selected)
            </legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto pr-1">
              {apps.map((a) => (
                <label
                  key={a.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl border border-glass-borderSubtle bg-white/50 hover:bg-white cursor-pointer has-[:checked]:border-brand/50 has-[:checked]:bg-brand-soft/40"
                >
                  <input
                    type="checkbox"
                    name="ids"
                    value={a.id}
                    defaultChecked={selectedIds.includes(a.id)}
                    className="mt-0.5 accent-[var(--brand-blue)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-ink-deep truncate">{a.title}</span>
                    <span className="block text-[11px] text-ink-muted truncate">
                      {[a.record_type === "scholarship" ? "Scholarship" : "Program", a.institution_or_provider]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label htmlFor="currency" className="text-xs font-bold text-ink-deep font-heading">
            Show costs in
          </label>
          <select
            id="currency"
            name="currency"
            defaultValue={displayCurrency}
            className="sm:w-56 h-10 px-3 text-sm glass-input rounded-xl text-ink-deep"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="sm:ml-auto h-10 px-5 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-sm cursor-pointer"
          >
            Compare
          </button>
        </div>
        {selectedIds.length >= MAX_COMPARE && (
          <p className="text-[11px] text-ink-subtle">Only the first {MAX_COMPARE} selected applications are compared.</p>
        )}
      </form>

      {selected.length === 1 && (
        <p className="glass-card-subtle rounded-xl px-4 py-3 text-xs text-ink-muted">
          Select at least one more application to compare.
        </p>
      )}

      {fxFailed && (
        <p role="alert" className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Exchange rates are unavailable right now, so amounts in other currencies can&apos;t be converted. Try again later
          or pick {displayCurrency === "USD" ? "another" : "the original"} currency.
        </p>
      )}

      {columns.length > 0 && (
        <section aria-label="Comparison" className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="align-top">
                  <th scope="col" className="sticky left-0 z-10 bg-white/95 backdrop-blur w-36 min-w-[9rem] p-4 text-left">
                    <span className="sr-only">Field</span>
                  </th>
                  {columns.map((c) => (
                    <th key={c.app.id} scope="col" className="min-w-[13rem] p-4 text-left border-l border-slate-200/80">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.app.record_type === "scholarship" ? "glass-badge-teal" : "glass-badge-blue"}`}>
                        {c.app.record_type}
                      </span>
                      <Link
                        href={`/app/applications/${c.app.id}`}
                        className="block mt-1.5 font-heading font-bold text-ink-deep hover:text-brand leading-snug"
                      >
                        {c.app.title}
                      </Link>
                      <span className="block text-xs font-normal text-ink-muted mt-0.5">
                        {c.app.institution_or_provider || "—"}
                      </span>
                      <Link href={withoutId(c.app.id)} className="inline-block mt-2 text-[11px] font-semibold text-ink-subtle hover:text-red-600">
                        Remove
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <GroupRow label="Overview" span={columns.length} />
                <Row label="Country" values={columns.map((c) => c.app.country)} />
                <Row label="Degree" values={columns.map((c) => c.app.degree_level)} />
                <Row label="Intake" values={columns.map((c) => c.app.study_period)} />
                <Row label="Status" values={columns.map((c) => STATUS_LABELS[c.app.status] || c.app.status)} />

                <GroupRow label="Timeline & progress" span={columns.length} />
                <Row
                  label="Deadline"
                  values={columns.map((c) =>
                    c.app.deadline ? (
                      <span key="d">
                        <span className="font-semibold text-ink-deep">{formatDateLabel(c.app.deadline)}</span>
                        <span className={`block text-xs ${daysBetween(today, c.app.deadline) < 0 ? "text-ink-subtle" : "text-ink-muted"}`}>
                          {countdownLabel(c.app.deadline, today)}
                        </span>
                        {c.app.id === firstDueId && <Badge tone="amber">Due first</Badge>}
                      </span>
                    ) : null
                  )}
                />
                <Row
                  label="Documents ready"
                  values={columns.map((c) => (c.docsTotal > 0 ? `${c.docsReady} of ${c.docsTotal}` : null))}
                />
                <Row label="Open tasks" values={columns.map((c) => String(c.openTasks))} />

                <GroupRow label={`Costs (${displayCurrency})`} span={columns.length} />
                <Row label="Tuition / year" values={columns.map((c) => money(c.converted.tuition))} />
                <Row label="Living / year" values={columns.map((c) => money(c.converted.living))} />
                <Row label="Application fee" values={columns.map((c) => money(c.converted.fee))} />
                <Row
                  label="Duration"
                  values={columns.map((c) =>
                    c.cost.assumedDuration ? null : `${c.cost.years} ${c.cost.years === 1 ? "year" : "years"}`
                  )}
                />
                <Row
                  label="Funding / year"
                  values={columns.map((c) => (c.converted.funding ? `− ${money(c.converted.funding)}` : null))}
                />
                <Row label="Total cost" values={columns.map((c) => money(c.converted.total))} strong />
                <Row
                  label="Net cost"
                  strong
                  values={columns.map((c) => {
                    if (!c.cost.hasAny) {
                      return (
                        <Link key="add" href={`/app/applications/${c.app.id}/edit`} className="text-xs font-bold text-brand hover:text-brand-dark">
                          + Add costs
                        </Link>
                      );
                    }
                    if (!c.canConvert || c.converted.net === null) {
                      return (
                        <span key="nc" className="text-xs text-ink-muted">
                          {formatMoney(c.cost.netCost, c.cost.currency)}
                          <span className="block text-ink-subtle">Can&apos;t convert {c.cost.currency}</span>
                        </span>
                      );
                    }
                    const net = c.converted.net;
                    return (
                      <span key="net">
                        <span className={`font-heading font-extrabold ${net <= 0 ? "text-teal-dark" : "text-brand-dark"}`}>
                          {net <= 0 ? `Covered (+${money(Math.abs(net))})` : money(net)}
                        </span>
                        {c.cost.currency && c.cost.currency !== displayCurrency && (
                          <span className="block text-[11px] text-ink-subtle">
                            {c.cost.netCost <= 0
                              ? `+${formatMoney(Math.abs(c.cost.netCost), c.cost.currency)} surplus in ${c.cost.currency}`
                              : `${formatMoney(c.cost.netCost, c.cost.currency)} in ${c.cost.currency}`}
                          </span>
                        )}
                        {lowestNet !== null && net === lowestNet && <Badge tone="teal">Lowest net cost</Badge>}
                        {c.cost.missing.length > 0 && (
                          <span className="block text-[11px] text-ink-subtle mt-1">Missing: {c.cost.missing.join(", ").toLowerCase()}</span>
                        )}
                      </span>
                    );
                  })}
                />
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-[11px] text-ink-subtle border-t border-glass-borderSubtle">
            {fxDate
              ? `Other currencies converted at European Central Bank reference rates from ${fxDate} (via Frankfurter). Conversions are approximate.`
              : "All amounts shown in the currency they were entered in."}{" "}
            Net cost = application fee + (tuition + living) × duration − funding × duration.
          </p>
        </section>
      )}
    </div>
  );
}

function GroupRow({ label, span }: { label: string; span: number }) {
  return (
    <tr>
      <th
        scope="colgroup"
        colSpan={span + 1}
        className="text-left px-4 pt-5 pb-2 text-[11px] font-bold uppercase tracking-wider text-brand font-heading bg-white/40"
      >
        {label}
      </th>
    </tr>
  );
}

function Row({ label, values, strong }: { label: string; values: React.ReactNode[]; strong?: boolean }) {
  return (
    <tr className="border-t border-slate-200/80 align-top">
      <th scope="row" className="sticky left-0 z-10 bg-white/95 backdrop-blur px-4 py-3 text-left text-xs font-bold text-ink-muted">
        {label}
      </th>
      {values.map((v, i) => (
        <td key={i} className={`px-4 py-3 border-l border-slate-200/80 ${strong ? "font-semibold text-ink-deep" : "text-ink-main"}`}>
          {v === null || v === undefined || v === "" ? <span className="text-ink-subtle">—</span> : v}
        </td>
      ))}
    </tr>
  );
}

function Badge({ tone, children }: { tone: "teal" | "amber"; children: React.ReactNode }) {
  const cls = tone === "teal" ? "bg-teal-50 text-teal-800 border-teal-200" : "bg-amber-50 text-amber-800 border-amber-200";
  return <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${cls}`}>{children}</span>;
}
