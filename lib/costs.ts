/**
 * Cost estimates for an application. Everything is optional: users fill in
 * what they know, and the summary says what is missing.
 */

export interface CostInputs {
  currency: string | null;
  tuitionPerYear: number | null;
  livingCostPerYear: number | null;
  applicationFee: number | null;
  fundingPerYear: number | null;
  durationYears: number | null;
}

export interface CostSummary {
  currency: string | null;
  /** True when at least one cost or funding figure was entered. */
  hasAny: boolean;
  /** Tuition + living costs for one year (missing parts count as 0). */
  perYear: number;
  years: number;
  /** True when the duration was not entered and 1 year was assumed. */
  assumedDuration: boolean;
  /** Application fee + perYear × years. */
  totalCost: number;
  /** Funding per year × years. */
  totalFunding: number;
  /** totalCost − totalFunding; negative means funding exceeds costs. */
  netCost: number;
  /** Human-readable names of fields still empty. */
  missing: string[];
}

export const COST_FIELD_LABELS = {
  tuitionPerYear: "Tuition per year",
  livingCostPerYear: "Living costs per year",
  applicationFee: "Application fee",
  fundingPerYear: "Funding per year",
  durationYears: "Duration",
} as const;

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Reads cost columns from an applications row (numeric columns may arrive as strings). */
export function costInputsFromRow(row: Record<string, unknown>): CostInputs {
  return {
    currency: (row.cost_currency as string | null) || null,
    tuitionPerYear: toNumber(row.tuition_per_year),
    livingCostPerYear: toNumber(row.living_cost_per_year),
    applicationFee: toNumber(row.application_fee),
    fundingPerYear: toNumber(row.funding_per_year),
    durationYears: toNumber(row.duration_years),
  };
}

export function computeCostSummary(inputs: CostInputs): CostSummary {
  const tuition = inputs.tuitionPerYear ?? 0;
  const living = inputs.livingCostPerYear ?? 0;
  const fee = inputs.applicationFee ?? 0;
  const funding = inputs.fundingPerYear ?? 0;
  const assumedDuration = !inputs.durationYears || inputs.durationYears <= 0;
  const years = assumedDuration ? 1 : (inputs.durationYears as number);

  const missing: string[] = [];
  if (inputs.tuitionPerYear === null) missing.push(COST_FIELD_LABELS.tuitionPerYear);
  if (inputs.livingCostPerYear === null) missing.push(COST_FIELD_LABELS.livingCostPerYear);
  if (inputs.applicationFee === null) missing.push(COST_FIELD_LABELS.applicationFee);
  if (inputs.durationYears === null) missing.push(COST_FIELD_LABELS.durationYears);

  const perYear = tuition + living;
  const totalCost = fee + perYear * years;
  const totalFunding = funding * years;

  return {
    currency: inputs.currency,
    hasAny:
      inputs.tuitionPerYear !== null ||
      inputs.livingCostPerYear !== null ||
      inputs.applicationFee !== null ||
      inputs.fundingPerYear !== null,
    perYear,
    years,
    assumedDuration,
    totalCost: round2(totalCost),
    totalFunding: round2(totalFunding),
    netCost: round2(totalCost - totalFunding),
    missing,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type ParsedCostFields =
  | { ok: true; values: {
      cost_currency: string | null;
      tuition_per_year: number | null;
      living_cost_per_year: number | null;
      application_fee: number | null;
      funding_per_year: number | null;
      duration_years: number | null;
    } }
  | { ok: false; error: string };

/** Parses "12,500" / "12 500.50" style amounts; empty → null. */
export function parseAmount(raw: FormDataEntryValue | null): number | null | "invalid" {
  if (raw === null) return null;
  const s = String(raw).trim().replace(/[\s,]/g, "");
  if (!s) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return "invalid";
  const n = Number(s);
  return n > 999_999_999_999 ? "invalid" : n;
}

/** Validates the cost section of the new/edit application forms. */
export function parseCostFields(formData: FormData): ParsedCostFields {
  const fields = {
    tuition_per_year: ["tuitionPerYear", COST_FIELD_LABELS.tuitionPerYear],
    living_cost_per_year: ["livingCostPerYear", COST_FIELD_LABELS.livingCostPerYear],
    application_fee: ["applicationFee", COST_FIELD_LABELS.applicationFee],
    funding_per_year: ["fundingPerYear", COST_FIELD_LABELS.fundingPerYear],
  } as const;

  const values: Record<string, number | null> = {};
  for (const [column, [name, label]] of Object.entries(fields)) {
    const parsed = parseAmount(formData.get(name));
    if (parsed === "invalid") {
      return { ok: false, error: `${label} must be a positive amount, e.g. 12500 or 12500.50.` };
    }
    values[column] = parsed;
  }

  const durationRaw = String(formData.get("durationYears") ?? "").trim();
  let duration: number | null = null;
  if (durationRaw) {
    const d = Number(durationRaw);
    if (!Number.isFinite(d) || d <= 0 || d > 10) {
      return { ok: false, error: "Duration must be between 0.5 and 10 years." };
    }
    duration = Math.round(d * 10) / 10;
  }

  const currencyRaw = String(formData.get("costCurrency") ?? "").trim().toUpperCase();
  const anyAmount = Object.values(values).some((v) => v !== null);
  if (currencyRaw && !/^[A-Z]{3}$/.test(currencyRaw)) {
    return { ok: false, error: "Please choose a valid currency." };
  }
  if (anyAmount && !currencyRaw) {
    return { ok: false, error: "Please choose the currency for these amounts." };
  }

  return {
    ok: true,
    values: {
      cost_currency: anyAmount ? currencyRaw : currencyRaw || null,
      tuition_per_year: values.tuition_per_year,
      living_cost_per_year: values.living_cost_per_year,
      application_fee: values.application_fee,
      funding_per_year: values.funding_per_year,
      duration_years: duration,
    },
  };
}

export function formatMoney(amount: number, currency: string | null): string {
  if (!currency) return amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
  try {
    // Rupees read naturally in lakh/crore grouping (₹1,41,45,698)
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: Math.abs(amount) >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  }
}

/** Shown when the database hasn't got the cost columns yet. */
export const COSTS_MIGRATION_HINT =
  "Cost fields need the 20261114000000_application_costs.sql migration. Run it in the Supabase SQL Editor, then save again.";

/** PostgREST error codes for an unknown column. */
export function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST204" || error.code === "42703" || /column .* does not exist/i.test(error.message || "");
}
