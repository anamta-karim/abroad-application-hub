import { describe, it, expect } from "vitest";
import {
  computeCostSummary,
  costInputsFromRow,
  parseAmount,
  parseCostFields,
  isMissingColumnError,
} from "@/lib/costs";
import { convertToBase, type FxRates } from "@/lib/fx";
import {
  buildMonthGrid,
  parseMonthParam,
  shiftMonth,
  daysBetween,
  countdownLabel,
  gridRange,
} from "@/lib/calendar";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe("Cost summary", () => {
  it("computes total and net cost over the duration", () => {
    const s = computeCostSummary({
      currency: "GBP",
      tuitionPerYear: 20000,
      livingCostPerYear: 12000,
      applicationFee: 100,
      fundingPerYear: 15000,
      durationYears: 2,
    });
    expect(s.perYear).toBe(32000);
    expect(s.totalCost).toBe(64100);
    expect(s.totalFunding).toBe(30000);
    expect(s.netCost).toBe(34100);
    expect(s.missing).toEqual([]);
    expect(s.assumedDuration).toBe(false);
  });

  it("assumes one year and lists missing fields when partly filled", () => {
    const s = computeCostSummary({
      currency: "EUR",
      tuitionPerYear: 1500,
      livingCostPerYear: null,
      applicationFee: null,
      fundingPerYear: null,
      durationYears: null,
    });
    expect(s.hasAny).toBe(true);
    expect(s.assumedDuration).toBe(true);
    expect(s.totalCost).toBe(1500);
    expect(s.missing).toContain("Living costs per year");
    expect(s.missing).toContain("Duration");
  });

  it("goes negative when funding exceeds costs (a stipend surplus)", () => {
    const s = computeCostSummary({
      currency: "KRW",
      tuitionPerYear: 0,
      livingCostPerYear: 9_000_000,
      applicationFee: 0,
      fundingPerYear: 12_000_000,
      durationYears: 2,
    });
    expect(s.netCost).toBe(-6_000_000);
  });

  it("reads numeric columns that arrive as strings", () => {
    const inputs = costInputsFromRow({ cost_currency: "USD", tuition_per_year: "45000.00", duration_years: "1.5" });
    expect(inputs.tuitionPerYear).toBe(45000);
    expect(inputs.durationYears).toBe(1.5);
    expect(inputs.livingCostPerYear).toBeNull();
  });
});

describe("Cost form parsing", () => {
  it("accepts separators and rejects negatives or text", () => {
    expect(parseAmount("12,500")).toBe(12500);
    expect(parseAmount("12 500.50")).toBe(12500.5);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("-5")).toBe("invalid");
    expect(parseAmount("abc")).toBe("invalid");
  });

  it("requires a currency when amounts are entered", () => {
    const r = parseCostFields(form({ tuitionPerYear: "1000", costCurrency: "" }));
    expect(r.ok).toBe(false);
  });

  it("validates duration and returns column values", () => {
    expect(parseCostFields(form({ durationYears: "12" })).ok).toBe(false);
    const r = parseCostFields(
      form({ costCurrency: "gbp", tuitionPerYear: "20000", livingCostPerYear: "", durationYears: "1" })
    );
    expect(r).toEqual({
      ok: true,
      values: {
        cost_currency: "GBP",
        tuition_per_year: 20000,
        living_cost_per_year: null,
        application_fee: null,
        funding_per_year: null,
        duration_years: 1,
      },
    });
  });

  it("recognises a missing-column error from PostgREST", () => {
    expect(isMissingColumnError({ code: "PGRST204", message: "Could not find the 'tuition_per_year' column" })).toBe(true);
    expect(isMissingColumnError({ code: "23514", message: "check constraint" })).toBe(false);
  });
});

describe("Currency conversion", () => {
  const inrRates: FxRates = { base: "INR", date: "2026-11-13", rates: { INR: 1, USD: 0.0106, GBP: 0.008 } };

  it("converts into the base currency", () => {
    expect(convertToBase(100, "USD", inrRates)).toBeCloseTo(9433.96, 1);
    expect(convertToBase(500, "INR", inrRates)).toBe(500);
  });

  it("returns null for unknown currencies or missing rates", () => {
    expect(convertToBase(100, "PKR", inrRates)).toBeNull();
    expect(convertToBase(100, "USD", null)).toBeNull();
    expect(convertToBase(100, null, inrRates)).toBeNull();
  });
});

describe("Calendar helpers", () => {
  it("builds Monday-first weeks covering the whole month", () => {
    const weeks = buildMonthGrid({ year: 2026, month: 11 }, "2026-11-14");
    // 1 Nov 2026 is a Sunday, so the grid starts on Monday 26 Oct
    expect(weeks[0][0].date).toBe("2026-10-26");
    expect(weeks[0][6]).toMatchObject({ date: "2026-11-01", inMonth: true });
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(30);
    expect(weeks.flat().find((d) => d.isToday)?.date).toBe("2026-11-14");
    expect(gridRange(weeks)).toEqual({ from: "2026-10-26", to: "2026-12-06" });
  });

  it("parses and shifts months across year boundaries", () => {
    expect(parseMonthParam("2027-02")).toEqual({ year: 2027, month: 2 });
    expect(parseMonthParam("bad", new Date(2026, 10, 14))).toEqual({ year: 2026, month: 11 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("counts whole days without timezone drift", () => {
    expect(daysBetween("2026-11-14", "2026-12-01")).toBe(17);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2); // across a DST change
    expect(countdownLabel("2026-11-15", "2026-11-14")).toBe("Tomorrow");
    expect(countdownLabel("2026-11-10", "2026-11-14")).toBe("4 days ago");
  });
});
