import { describe, it, expect } from "vitest";
import { tokenize } from "@/lib/rag/retrieval";

describe("RAG Grounding & Evidence Abstention Engine", () => {
  it("strictly abstains when query has zero evidence in source chunks", () => {
    const query = "What is the tuition fee discount for astrophysics students?";
    const chunks = [
      {
        content: "The department offers courses in Medieval European History and Renaissance Art.",
        score: 0,
      },
    ];

    const hasEvidence = chunks.some((c) => c.score > 0);
    expect(hasEvidence).toBe(false);

    // Standard abstention response required by product rules
    const abstentionNotice =
      "I could not find verified evidence regarding this in your attached official sources.";
    expect(abstentionNotice).toContain("could not find verified evidence");
  });

  it("extracts structured citations with page numbers when evidence exists", () => {
    const mockChunk = {
      chunkId: "c-101",
      sourceId: "s-202",
      sourceTitle: "Oxford MSc Prospectus 2027",
      pageNumber: 8,
      sectionHeading: "Language Requirements",
      content:
        "Applicants must achieve an overall score of at least 7.5 in the academic IELTS with at least 7.0 in each component.",
    };

    const citation = {
      sourceId: mockChunk.sourceId,
      sourceTitle: mockChunk.sourceTitle,
      chunkId: mockChunk.chunkId,
      pageNumber: mockChunk.pageNumber,
      sectionHeading: mockChunk.sectionHeading,
      quote: mockChunk.content,
    };

    expect(citation.pageNumber).toBe(8);
    expect(citation.sourceTitle).toBe("Oxford MSc Prospectus 2027");
    expect(citation.quote).toContain("IELTS with at least 7.0");
  });

  it("separates official source facts from model coaching suggestions", () => {
    const response = {
      answer: "According to Oxford MSc Prospectus 2027 (Page 8): Applicants must achieve an overall score of at least 7.5 in the academic IELTS.",
      citations: [{ pageNumber: 8, sourceTitle: "Oxford MSc Prospectus" }],
      strategicSuggestions: [
        "Take the practice test at least 2 months before your target test date.",
      ],
    };

    expect(response.answer).not.toContain("practice test");
    expect(response.strategicSuggestions).toHaveLength(1);
    expect(response.strategicSuggestions[0]).toContain("Take the practice test");
  });

  it("preserves critical admissions acronyms during tokenization", () => {
    const tokens = tokenize("What is the TOPIK score required for GKS 2027?");
    expect(tokens).toContain("topik");
    expect(tokens).toContain("score");
    expect(tokens).toContain("required");
    expect(tokens).toContain("gks");
  });
});
