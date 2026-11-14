import { SUPPORTED_CURRENCIES } from "@/lib/fx";

interface CostFieldsProps {
  defaults?: {
    cost_currency?: string | null;
    tuition_per_year?: number | string | null;
    living_cost_per_year?: number | string | null;
    application_fee?: number | string | null;
    funding_per_year?: number | string | null;
    duration_years?: number | string | null;
  };
  /** Render collapsed inside a <details> (used on the new-application form). */
  collapsible?: boolean;
}

const inputClass =
  "w-full px-4 py-2.5 rounded-xl text-sm glass-input text-ink-deep placeholder:text-ink-subtle";
const labelClass = "block text-xs font-bold text-ink-deep font-heading";

function str(v: number | string | null | undefined): string {
  return v === null || v === undefined ? "" : String(v);
}

/**
 * Optional cost estimate inputs. Field names are read by parseCostFields().
 */
export function CostFields({ defaults = {}, collapsible = false }: CostFieldsProps) {
  const hasValues = [
    defaults.tuition_per_year,
    defaults.living_cost_per_year,
    defaults.application_fee,
    defaults.funding_per_year,
  ].some((v) => v !== null && v !== undefined && v !== "");

  const body = (
    <div className="space-y-4">
      <p className="text-xs text-ink-muted">
        Estimates are fine. Use the currency the university or scholarship quotes; Compare converts between currencies.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="costCurrency" className={labelClass}>
            Currency
          </label>
          <select
            id="costCurrency"
            name="costCurrency"
            defaultValue={defaults.cost_currency || ""}
            className={`${inputClass} bg-white/70`}
          >
            <option value="">Select currency</option>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="durationYears" className={labelClass}>
            Duration (years)
          </label>
          <input
            id="durationYears"
            name="durationYears"
            type="number"
            min="0.5"
            max="10"
            step="0.5"
            inputMode="decimal"
            defaultValue={str(defaults.duration_years)}
            placeholder="e.g. 1 or 2"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AmountInput id="tuitionPerYear" label="Tuition per year" value={defaults.tuition_per_year} />
        <AmountInput id="livingCostPerYear" label="Living costs per year" value={defaults.living_cost_per_year} hint="Rent, food, transport, insurance" />
        <AmountInput id="applicationFee" label="Application fee (one-time)" value={defaults.application_fee} />
        <AmountInput id="fundingPerYear" label="Funding / scholarship per year" value={defaults.funding_per_year} hint="Subtracted from the total" />
      </div>
    </div>
  );

  if (!collapsible) {
    return (
      <fieldset className="space-y-3 pt-4 border-t border-glass-borderSubtle">
        <legend className="text-sm font-heading font-bold text-ink-deep">Costs &amp; funding</legend>
        {body}
      </fieldset>
    );
  }

  return (
    <details open={hasValues} className="group rounded-2xl border border-glass-borderSubtle bg-white/40 p-4">
      <summary className="cursor-pointer text-sm font-heading font-bold text-ink-deep list-none flex items-center justify-between">
        <span>Costs &amp; funding (optional)</span>
        <span className="text-xs text-ink-muted group-open:rotate-180 transition-transform" aria-hidden="true">
          ▼
        </span>
      </summary>
      <div className="pt-4">{body}</div>
    </details>
  );
}

function AmountInput({
  id,
  label,
  value,
  hint,
}: {
  id: string;
  label: string;
  value: number | string | null | undefined;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        defaultValue={str(value)}
        placeholder="0"
        className={inputClass}
      />
      {hint && <p className="text-[11px] text-ink-subtle">{hint}</p>}
    </div>
  );
}
