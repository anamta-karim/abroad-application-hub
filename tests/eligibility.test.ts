import { describe, it, expect } from "vitest";
import {
  parseRequirementsFromSentence,
  extractEligibilityRequirements,
  matchEligibility,
  eligibilitySummary,
  parseAcademicProfile,
  profileFromRow,
  profileIsEmpty,
  EMPTY_PROFILE,
  type AcademicProfile,
} from "@/lib/eligibility";
import { sampleProspectus, sampleDates } from "@/lib/demo/sample";
import { chunkDocumentText } from "@/lib/ingestion/chunker";

const kinds = (s: string) => parseRequirementsFromSentence(s).map((r) => r.kind);
const first = (s: string) => parseRequirementsFromSentence(s)[0];

describe("Reading requirements from source sentences", () => {
  it("reads GPA with an explicit scale, and the degree in the same sentence", () => {
    const reqs = parseRequirementsFromSentence(
      "Applicants must hold a bachelor's degree in computer science with a minimum GPA of 3.0 on a 4.0 scale."
    );
    expect(reqs.find((r) => r.kind === "gpa")).toMatchObject({ minimum: 3, scale: 4 });
    expect(reqs.find((r) => r.kind === "degree")).toMatchObject({ degree: "bachelors" });
  });

  it("reads other GPA forms", () => {
    expect(first("A CGPA of 7.5/10 or equivalent is required.")).toMatchObject({ kind: "gpa", minimum: 7.5, scale: 10 });
    expect(first("Minimum GPA: 3.3 out of 4.0")).toMatchObject({ minimum: 3.3, scale: 4 });
    expect(first("A minimum GPA of 3.2 is expected.")).toMatchObject({ minimum: 3.2, scale: 4, scaleAssumed: true });
    expect(first("Candidates need at least 60% aggregate marks in their bachelor's.")).toMatchObject({ kind: "gpa", minimum: 60, scale: 100 });
  });

  it("reads IELTS with and without a per-band minimum", () => {
    expect(first("IELTS Academic overall 6.5 with no band below 6.0, or TOEFL iBT 90.")).toMatchObject({ kind: "ielts", minimum: 6.5, minBand: 6 });
    expect(kinds("IELTS Academic overall 6.5 with no band below 6.0, or TOEFL iBT 90.")).toEqual(["ielts", "toefl"]);
    expect(first("An IELTS score of 7.0 is required.")).toMatchObject({ minimum: 7, minBand: undefined });
    expect(first("IELTS 6.5 overall with a minimum of 6.0 in each band.")).toMatchObject({ minBand: 6 });
  });

  it("reads PTE, Duolingo, GRE, GMAT and work experience", () => {
    expect(first("PTE Academic: 58 overall.")).toMatchObject({ kind: "pte", minimum: 58 });
    expect(first("Duolingo English Test score of 115.")).toMatchObject({ kind: "duolingo", minimum: 115 });
    expect(first("A GRE score of 310 is required.")).toMatchObject({ kind: "gre", minimum: 310 });
    expect(first("GMAT score of 600 or above.")).toMatchObject({ kind: "gmat", minimum: 600 });
    expect(first("Applicants need at least two years of relevant work experience.")).toMatchObject({ kind: "work_experience", minimum: 2 });
    expect(first("Minimum 3 years full-time professional experience.")).toMatchObject({ kind: "work_experience", minimum: 3 });
  });

  it("marks optional requirements", () => {
    expect(first("GRE scores (minimum 300) are optional but recommended.")).toMatchObject({ kind: "gre", optional: true });
  });

  it("ignores numbers that aren't entry requirements", () => {
    expect(kinds("The scholarship covers 50% of tuition fees.")).toEqual([]);
    expect(kinds("IELTS is not required for native English speakers.")).toEqual([]);
    expect(kinds("GRE results from 2025 are accepted.")).toEqual([]);
    expect(kinds("The degree takes 2 years to complete.")).toEqual([]);
    expect(kinds("Students progress through 120 ECTS of coursework.")).toEqual([]);
  });
});

describe("Collecting requirements from an application's sources", () => {
  it("finds the sample prospectus requirements with their page", () => {
    const text = sampleProspectus(sampleDates("2026-11-15").deadline);
    const chunks = chunkDocumentText(text).map((c) => ({ content: c.content, page_number: c.pageNumber ?? null, sourceTitle: "Prospectus" }));
    const reqs = extractEligibilityRequirements(chunks);
    expect(reqs.map((r) => r.kind)).toEqual(["degree", "gpa", "ielts", "toefl"]);
    const gpa = reqs.find((r) => r.kind === "gpa")!;
    expect(gpa.pageNumber).toBe(1);
    expect(gpa.quote).toContain("3.0 on a 4.0 scale");
  });

  it("keeps the first statement of each kind, but prefers a required one over an optional mention", () => {
    const reqs = extractEligibilityRequirements([
      { content: "GRE scores (minimum 300) are optional. A GRE score of 315 is required for funding.", page_number: 2, sourceTitle: "S" },
      { content: "IELTS 6.5 overall. IELTS 7.0 for the teaching track.", page_number: 3, sourceTitle: "S" },
    ]);
    expect(reqs.find((r) => r.kind === "gre")).toMatchObject({ minimum: 315, optional: false });
    expect(reqs.find((r) => r.kind === "ielts")).toMatchObject({ minimum: 6.5 });
  });
});

describe("Matching a profile against requirements", () => {
  const reqs = extractEligibilityRequirements([
    {
      content:
        "Applicants must hold a bachelor's degree with a minimum GPA of 3.0 on a 4.0 scale. IELTS overall 6.5 with no band below 6.0, or TOEFL iBT 90. At least two years of work experience.",
      page_number: 1,
      sourceTitle: "S",
    },
  ]);
  const base: AcademicProfile = { ...EMPTY_PROFILE, highest_degree: "bachelors", gpa: 3.4, gpa_scale: 4, work_experience_years: 3 };

  it("reports every requirement met", () => {
    const r = matchEligibility(reqs, { ...base, ielts_overall: 7, ielts_min_band: 6.5 });
    expect(r.counts).toEqual({ met: 4, notMet: 0, unknown: 0 });
    expect(r.total).toBe(4);
    expect(r.checks.find((c) => c.requirement.kind === "gpa")?.needed).toBe("3.0 / 4");
    expect(r.english?.checks[0].needed).toBe("6.5 overall, no band below 6.0");
    expect(eligibilitySummary(r)).toEqual({ label: "All 4 requirements met", tone: "good" });
  });

  it("treats English tests as alternatives", () => {
    const viaToefl = matchEligibility(reqs, { ...base, ielts_overall: 6, ielts_min_band: 5.5, toefl_ibt: 95 });
    expect(viaToefl.english?.status).toBe("met");
    const neither = matchEligibility(reqs, { ...base, ielts_overall: 6, ielts_min_band: 5.5, toefl_ibt: 80 });
    expect(neither.english?.status).toBe("not_met");
    expect(eligibilitySummary(neither).tone).toBe("bad");
  });

  it("fails IELTS on a low band even with a good overall score", () => {
    const r = matchEligibility(reqs, { ...base, ielts_overall: 7, ielts_min_band: 5.5 });
    expect(r.english?.checks[0]).toMatchObject({ status: "not_met" });
  });

  it("asks for the lowest band when only the overall IELTS is known", () => {
    const r = matchEligibility(reqs, { ...base, ielts_overall: 7 });
    expect(r.english?.checks[0].status).toBe("unknown");
  });

  it("converts GPA between scales and says it is approximate", () => {
    const r = matchEligibility(reqs, { ...base, gpa: 8.2, gpa_scale: 10, ielts_overall: 7, ielts_min_band: 6.5 });
    const gpa = r.checks.find((c) => c.requirement.kind === "gpa")!;
    expect(gpa.status).toBe("met"); // 8.2/10 ≈ 3.28/4
    expect(gpa.yours).toBe("8.2 / 10 ≈ 3.28 / 4");
    expect(gpa.note).toMatch(/rough guide/);
  });

  it("flags gaps and unknowns", () => {
    const r = matchEligibility(reqs, { ...EMPTY_PROFILE, highest_degree: "high_school", gpa: 2.8, gpa_scale: 4 });
    expect(r.counts).toEqual({ met: 0, notMet: 2, unknown: 2 });
    expect(eligibilitySummary(r).label).toBe("2 gaps · 0 of 4 met");
  });

  it("does not count optional requirements", () => {
    const opt = extractEligibilityRequirements([{ content: "GRE scores (minimum 320) are optional.", page_number: 1, sourceTitle: "S" }]);
    const r = matchEligibility(opt, { ...EMPTY_PROFILE, gre_total: 300 });
    expect(r.total).toBe(0);
    expect(r.checks[0].status).toBe("not_met");
  });

  it("works without a profile", () => {
    const r = matchEligibility(reqs, null);
    expect(r.counts.unknown).toBe(4);
    expect(eligibilitySummary(matchEligibility([], null)).label).toBe("No measurable requirements found");
  });
});

describe("Academic profile form", () => {
  it("accepts a valid profile and turns blanks into null", () => {
    const { profile, error } = parseAcademicProfile({ highest_degree: "bachelors", gpa: "8,2", gpa_scale: "10", ielts_overall: "7.5", toefl_ibt: "" });
    expect(error).toBeUndefined();
    expect(profile).toMatchObject({ highest_degree: "bachelors", gpa: 8.2, gpa_scale: 10, ielts_overall: 7.5, toefl_ibt: null });
  });

  it("rejects invalid values with a clear message", () => {
    expect(parseAcademicProfile({ gpa: "3.5" }).error).toMatch(/both your GPA and the scale/);
    expect(parseAcademicProfile({ gpa: "5", gpa_scale: "4" }).error).toMatch(/higher than its scale/);
    expect(parseAcademicProfile({ ielts_overall: "6.7" }).error).toMatch(/steps of 0.5/);
    expect(parseAcademicProfile({ toefl_ibt: "130" }).error).toMatch(/between 0 and 120/);
    expect(parseAcademicProfile({ gre_total: "310.5" }).error).toMatch(/whole number/);
    expect(parseAcademicProfile({ ielts_min_band: "6" }).error).toMatch(/overall score/);
    expect(parseAcademicProfile({ highest_degree: "diploma" }).error).toMatch(/highest degree/);
  });

  it("reads database rows, including numeric strings", () => {
    const p = profileFromRow({ gpa: "3.40", gpa_scale: "4.00", highest_degree: "masters", toefl_ibt: 100 });
    expect(p).toMatchObject({ gpa: 3.4, gpa_scale: 4, highest_degree: "masters", toefl_ibt: 100, gre_total: null });
    expect(profileIsEmpty(profileFromRow({}))).toBe(true);
    expect(profileIsEmpty(null)).toBe(true);
  });
});

describe("Test scores of 0", () => {
  it("are treated as not taken, in the form and in saved rows", () => {
    expect(parseAcademicProfile({ ielts_overall: "0", toefl_ibt: "0", pte_academic: "0", work_experience_years: "0" }).profile).toMatchObject({
      ielts_overall: null,
      toefl_ibt: null,
      pte_academic: null,
      work_experience_years: 0,
    });
    expect(profileFromRow({ ielts_overall: "0.0", gre_total: 0, work_experience_years: "0.0" })).toMatchObject({
      ielts_overall: null,
      gre_total: null,
      work_experience_years: 0,
    });
  });
});
