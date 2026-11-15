import { describe, it, expect } from "vitest";
import { catalogEntryFor, confirmedFunding, missingDetails, rowHasAnyValue } from "@/lib/compare";
import { SCHOLARSHIP_CATALOG } from "@/lib/catalog/scholarships";

describe("Compare: catalog details", () => {
  const erasmus = SCHOLARSHIP_CATALOG.find((e) => e.id === "erasmus-mundus")!;

  it("finds the Discover entry an application came from", () => {
    expect(catalogEntryFor({ title: "Renamed by me", official_url: erasmus.officialUrl + "/" })?.id).toBe("erasmus-mundus");
    expect(catalogEntryFor({ title: "  erasmus mundus joint masters scholarship ", official_url: null })?.id).toBe("erasmus-mundus");
    expect(catalogEntryFor({ title: "MSc Data Science (Sample)", official_url: "https://example.com" })).toBeNull();
  });
});

describe("Compare: funding from sources", () => {
  const fact = (review_state: string, extractedValue: string, created_at: string, fact_type = "funding") => ({
    fact_type,
    review_state,
    value: { extractedValue },
    created_at,
  });

  it("uses the latest confirmed or edited funding fact only", () => {
    expect(
      confirmedFunding([
        fact("confirmed", "Monthly stipend of EUR 900.", "2026-11-01T00:00:00Z"),
        fact("edited", "Full tuition and EUR 1,100 a month.", "2026-11-05T00:00:00Z"),
        fact("suggested", "Not reviewed yet.", "2026-11-09T00:00:00Z"),
        fact("confirmed", "15 January 2027", "2026-11-10T00:00:00Z", "deadline"),
      ])
    ).toBe("Full tuition and EUR 1,100 a month.");
    expect(confirmedFunding([fact("rejected", "Wrong.", "2026-11-01T00:00:00Z")])).toBeNull();
  });

  it("shortens long text for the table", () => {
    const long = "x".repeat(300);
    const text = confirmedFunding([fact("confirmed", long, "2026-11-01T00:00:00Z")])!;
    expect(text.length).toBe(180);
    expect(text.endsWith("…")).toBe(true);
  });
});

describe("Compare: what's missing", () => {
  const base = {
    recordType: "program",
    deadline: "2027-01-15",
    intake: "Fall 2027",
    hasCosts: true,
    hasFundingAmount: false,
    checklistItems: 4,
    sources: 1,
  };

  it("lists nothing for a complete application", () => {
    expect(missingDetails(base)).toEqual([]);
  });

  it("lists gaps, most useful first, pointing to where they're fixed", () => {
    const items = missingDetails({ ...base, deadline: null, intake: null, hasCosts: false, checklistItems: 0, sources: 0 });
    expect(items.map((i) => i.label)).toEqual(["deadline", "official page or PDF", "costs", "document checklist", "intake"]);
    expect(items.find((i) => i.kind === "source")?.where).toBe("app");
    expect(items.find((i) => i.kind === "costs")?.where).toBe("edit");
  });

  it("asks scholarships for a funding amount instead of costs", () => {
    const items = missingDetails({ ...base, recordType: "scholarship", hasCosts: false });
    expect(items.map((i) => i.kind)).toEqual(["funding"]);
    expect(missingDetails({ ...base, recordType: "scholarship", hasFundingAmount: true })).toEqual([]);
  });

  it("hides rows that are empty for every application", () => {
    expect(rowHasAnyValue([null, undefined, ""])).toBe(false);
    expect(rowHasAnyValue([null, "0"])).toBe(true);
  });
});
