import Link from "next/link";
import { computeCostSummary, formatMoney, type CostInputs } from "@/lib/costs";

export function CostSummaryCard({ applicationId, inputs }: { applicationId: string; inputs: CostInputs }) {
  const s = computeCostSummary(inputs);
  const editHref = `/app/applications/${applicationId}/edit`;

  if (!s.hasAny) {
    return (
      <section className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted font-heading">Estimated cost</h2>
          <p className="text-sm text-ink-muted mt-1">
            Add tuition, living costs and funding to see a total and compare it with other applications.
          </p>
        </div>
        <Link
          href={editHref}
          className="shrink-0 h-9 px-4 inline-flex items-center text-xs font-bold text-brand-dark bg-white/80 border border-brand/30 hover:bg-brand-soft rounded-xl transition-colors"
        >
          + Add costs
        </Link>
      </section>
    );
  }

  const c = s.currency;
  const covered = s.netCost <= 0;
  const yearsLabel = `${s.years} ${s.years === 1 ? "year" : "years"}${s.assumedDuration ? " (assumed)" : ""}`;

  return (
    <section className="glass-card rounded-2xl p-5 sm:p-6 space-y-4" aria-labelledby="cost-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="cost-heading" className="text-xs font-bold uppercase tracking-wider text-ink-muted font-heading">
          Estimated cost · {yearsLabel}
        </h2>
        <Link href={editHref} className="text-xs font-bold text-brand hover:text-brand-dark">
          Edit costs
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Stat label="Per year" value={formatMoney(s.perYear, c)} note="Tuition + living" />
        <Stat label="Total cost" value={formatMoney(s.totalCost, c)} note="Incl. application fee" />
        <Stat label="Funding" value={s.totalFunding > 0 ? `− ${formatMoney(s.totalFunding, c)}` : "None"} note="Over the duration" />
        <Stat
          label={covered ? "Fully covered" : "Net cost"}
          value={covered ? `+ ${formatMoney(Math.abs(s.netCost), c)}` : formatMoney(s.netCost, c)}
          note={covered ? "Funding left over" : "What you pay"}
          emphasis
        />
      </div>

      {s.missing.length > 0 && (
        <p className="text-[11px] text-ink-subtle">
          Not entered yet: {s.missing.join(", ")}. Missing amounts count as zero.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value, note, emphasis }: { label: string; value: string; note: string; emphasis?: boolean }) {
  return (
    <div className="space-y-0.5 min-w-0">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle block font-heading">{label}</span>
      <div
        className={`font-heading font-extrabold truncate ${emphasis ? "text-xl text-brand-dark" : "text-lg text-ink-deep"}`}
        title={value}
      >
        {value}
      </div>
      <span className="text-[11px] text-ink-muted block">{note}</span>
    </div>
  );
}
