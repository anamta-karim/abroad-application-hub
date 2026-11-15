import { describe, it, expect } from "vitest";
import { sampleProspectus, sampleDates, longDate, addDaysIso, SAMPLE_REQUIREMENTS } from "@/lib/demo/sample";
import { chunkDocumentText } from "@/lib/ingestion/chunker";
import { extractCandidateFacts } from "@/lib/ingestion/extractor";
import { buildBlueprint } from "@/lib/rag/blueprint";
import { matchCommonDocument } from "@/lib/documents/catalog";

describe("Sample application content", () => {
  const today = "2026-11-15";
  const dates = sampleDates(today);
  const text = sampleProspectus(dates.deadline);
  const chunks = chunkDocumentText(text);
  const facts = extractCandidateFacts(chunks);

  it("puts the deadline 45 days out, with tasks before it", () => {
    expect(dates.deadline).toBe("2026-12-30");
    expect(dates.refereeTaskDue < dates.statementTaskDue).toBe(true);
    expect(dates.statementTaskDue < dates.deadline).toBe(true);
    expect(addDaysIso("2026-12-30", 3)).toBe("2027-01-02");
    expect(longDate("2027-01-05")).toBe("5 January 2027");
  });

  it("is clearly labelled as fictional", () => {
    expect(text).toContain("fictional university");
  });

  it("produces page-accurate chunks and the expected suggested facts", () => {
    expect(new Set(chunks.map((c) => c.pageNumber))).toEqual(new Set([1, 2, 3]));
    const deadline = facts.find((f) => f.factType === "deadline");
    expect(deadline?.value.extractedValue).toBe(longDate(dates.deadline));
    const docs = facts.filter((f) => f.factType === "document").map((f) => f.label);
    expect(docs).toEqual(
      expect.arrayContaining(["Academic Transcript", "Letters of Recommendation", "Statement of Purpose / Personal Statement"])
    );
    expect(facts.some((f) => f.factType === "funding")).toBe(true);
    expect(facts.some((f) => f.factType === "eligibility")).toBe(true);
  });

  it("gives every blueprint real evidence to quote", () => {
    const input = {
      app: {
        title: "MSc Data Science (Sample)",
        record_type: "program" as const,
        institution_or_provider: "Northbridge University (fictional)",
        country: "Netherlands",
        degree_level: "Master's",
        field_of_study: "Data Science",
        study_period: "Fall 2027",
        deadline: dates.deadline,
        duration_years: 2,
      },
      facts: [],
      requirements: SAMPLE_REQUIREMENTS,
      chunks: chunks.map((c, i) => ({ id: `c${i}`, sourceId: "s", sourceTitle: "Sample", pageNumber: c.pageNumber, sectionHeading: c.sectionHeading, content: c.content })),
      today,
    };
    expect(buildBlueprint("sop", input).answer).toContain("**Length limit: 1,000 words**");
    expect(buildBlueprint("lor", input).answer).toContain("**2 letters required**");
    expect(buildBlueprint("interview", input).answer).toContain("20-minute online interview");
    expect(buildBlueprint("study_plan", input).answer).toContain("research thesis");
    expect(buildBlueprint("sop", input).answer).toContain("*Machine Learning and AI Track*");
  });

  it("seeds checklist items that the Documents page recognises", () => {
    for (const r of SAMPLE_REQUIREMENTS) expect(matchCommonDocument(r.document_type), r.document_type).not.toBeNull();
  });
});
