import { describe, it, expect } from "vitest";
import { matchCommonDocument, coverageFor, demandByDocument, COMMON_DOCUMENTS, type OwnedDocument } from "@/lib/documents/catalog";

describe("Matching requirement names to common documents", () => {
  it("recognises the names the fact extractor produces", () => {
    expect(matchCommonDocument("Academic Transcript")?.key).toBe("transcripts");
    expect(matchCommonDocument("English Language Proficiency (IELTS / TOEFL)")?.key).toBe("english_test");
    expect(matchCommonDocument("Letters of Recommendation")?.key).toBe("recommendations");
    expect(matchCommonDocument("Statement of Purpose / Personal Statement")?.key).toBe("statement");
    expect(matchCommonDocument("Curriculum Vitae (CV) / Resume")?.key).toBe("cv");
    expect(matchCommonDocument("Passport / Photo ID")?.key).toBe("passport");
    expect(matchCommonDocument("Financial Evidence / Bank Statement")?.key).toBe("financial_proof");
  });

  it("recognises common real-world variants", () => {
    expect(matchCommonDocument("Mark sheets for all semesters")?.key).toBe("transcripts");
    expect(matchCommonDocument("Provisional degree certificate")?.key).toBe("degree_certificate");
    expect(matchCommonDocument("Two passport-size photographs")?.key).toBe("photo");
    expect(matchCommonDocument("GRE General Test scores")?.key).toBe("aptitude_test");
    expect(matchCommonDocument("Study plan (max 2 pages)")?.key).toBe("research_proposal");
    expect(matchCommonDocument("Medical assessment form")?.key).toBe("medical");
  });

  it("leaves application-specific documents unmatched", () => {
    expect(matchCommonDocument("Departmental supplementary questionnaire")).toBeNull();
    expect(matchCommonDocument("Signed declaration of authenticity")).toBeNull();
  });

  it("has unique keys", () => {
    const keys = COMMON_DOCUMENTS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("Coverage of one application's checklist", () => {
  const owned: OwnedDocument[] = [
    { id: "1", document_type: "transcripts", display_name: "Academic transcripts", expires_on: null },
    { id: "2", document_type: "english_test", display_name: "English test score", expires_on: "2027-01-01" },
    { id: "3", document_type: "passport", display_name: "Passport", expires_on: "2026-10-01" },
    { id: "4", document_type: "custom", display_name: "Portfolio of 3 projects", expires_on: null },
  ];
  const requirements = [
    { document_type: "Academic Transcript", status: "not_started" },
    { document_type: "IELTS score report", status: "not_started" },
    { document_type: "Copy of passport", status: "not_started" },
    { document_type: "Letters of Recommendation", status: "in_progress" },
    { document_type: "portfolio of 3 projects", status: "not_started" },
    { document_type: "Departmental questionnaire", status: "not_started" },
    { document_type: "Proof of funds", status: "not_applicable" },
  ];

  const result = coverageFor(requirements, owned, "2027-03-01", "2026-11-15");
  const stateOf = (name: string) => result.find((r) => r.requirement === name)?.state;

  it("classifies each requirement", () => {
    expect(stateOf("Academic Transcript")).toBe("have");
    expect(stateOf("IELTS score report")).toBe("expires_before_deadline");
    expect(stateOf("Copy of passport")).toBe("expired");
    expect(stateOf("Letters of Recommendation")).toBe("missing");
    expect(stateOf("portfolio of 3 projects")).toBe("have"); // custom document, matched by name
    expect(stateOf("Departmental questionnaire")).toBe("specific");
  });

  it("skips requirements marked not applicable", () => {
    expect(result.find((r) => r.requirement === "Proof of funds")).toBeUndefined();
  });

  it("doesn't warn about expiry when there's no deadline", () => {
    const noDeadline = coverageFor([{ document_type: "IELTS", status: "not_started" }], owned, null, "2026-11-15");
    expect(noDeadline[0].state).toBe("have");
  });
});

describe("Demand across applications", () => {
  it("counts each application once per document", () => {
    const demand = demandByDocument([
      { application_id: "a", document_type: "Academic Transcript" },
      { application_id: "a", document_type: "Official transcripts (both degrees)" },
      { application_id: "b", document_type: "Transcript of records" },
      { application_id: "b", document_type: "IELTS" },
    ]);
    expect(demand.get("transcripts")).toBe(2);
    expect(demand.get("english_test")).toBe(1);
  });
});
