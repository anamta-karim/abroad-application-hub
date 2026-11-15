import { describe, it, expect, vi, afterEach } from "vitest";
import { parseOcrOutput, ocrPdf, ocrTitle, titleFrom, buildOcrPrompt, OCR_MESSAGES, OCR_MAX_PAGES } from "@/lib/ingestion/ocr";
import { buildGeminiBody } from "@/lib/ai/gemini";
import { chunkDocumentText } from "@/lib/ingestion/chunker";
import { extractCandidateFacts } from "@/lib/ingestion/extractor";

const TRANSCRIPT = `--- Page 1 ---
# Entry requirements

Applicants must hold a bachelor's degree with a minimum GPA of 3.2 on a 4.0 scale.

The application deadline is 15 January 2027.

--- Page 2 ---
# Required documents

You must submit an academic transcript and two letters of recommendation.`;

describe("Reading an OCR transcription", () => {
  it("splits pages on the markers", () => {
    const pages = parseOcrOutput(TRANSCRIPT, 2);
    expect(pages.map((p) => p.pageNumber)).toEqual([1, 2]);
    expect(pages[0].text.startsWith("# Entry requirements")).toBe(true);
    expect(pages[1].text).toContain("two letters of recommendation");
  });

  it("tolerates code fences and marker spacing, drops empty and out-of-range pages", () => {
    const raw = "```text\n-- Page 1 --\nThe deadline is 15 January 2027 for all applicants.\n--- page 2 ---\n[no text]\n--- Page 9 ---\nNot a real page of this document at all.\n```";
    const pages = parseOcrOutput(raw, 2);
    expect(pages).toEqual([{ pageNumber: 1, text: "The deadline is 15 January 2027 for all applicants." }]);
  });

  it("rejects answers that aren't a transcription", () => {
    expect(parseOcrOutput("I'm sorry, I can't read this document.")).toEqual([]);
    expect(parseOcrOutput("--- Page 1 ---\n[illegible] [illegible]\n--- Page 2 ---\nok")).toEqual([]);
  });

  it("feeds the normal pipeline with page-accurate citations", () => {
    const fullText = parseOcrOutput(TRANSCRIPT, 2)
      .map((p) => `--- Page ${p.pageNumber} ---\n\n${p.text}`)
      .join("\n\n");
    const chunks = chunkDocumentText(fullText);
    expect(new Set(chunks.map((c) => c.pageNumber))).toEqual(new Set([1, 2]));
    const facts = extractCandidateFacts(chunks);
    expect(facts.find((f) => f.factType === "deadline")?.value.extractedValue).toBe("15 January 2027");
  });

  it("titles the source from the first line of the document", () => {
    expect(titleFrom([{ pageNumber: 1, text: "Northbridge University\n\nMSc Data Science\n\n# Entry requirements" }])).toBe("Northbridge University");
    expect(titleFrom([{ pageNumber: 1, text: "# Admissions Guide 2027\nBody" }])).toBe("Admissions Guide 2027");
    expect(titleFrom([{ pageNumber: 1, text: "[illegible]" }])).toBeNull();
  });

  it("labels sources as OCR exactly once", () => {
    expect(ocrTitle("Prospectus 2027")).toBe("Prospectus 2027 (OCR)");
    expect(ocrTitle("Prospectus 2027 (OCR)")).toBe("Prospectus 2027 (OCR)");
    expect(ocrTitle("  ")).toBe("Scanned PDF (OCR)");
  });

  it("explains when a scan can't be read", () => {
    expect(OCR_MESSAGES.tooManyPages(55)).toContain(`up to ${OCR_MAX_PAGES} pages`);
    expect(OCR_MESSAGES.limitReached(30)).toContain("30 daily AI uses");
    expect(buildOcrPrompt(1)).toBe("Transcribe all 1 page of this PDF.");
  });
});

describe("OCR request", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends the PDF before the prompt", () => {
    const body = buildGeminiBody({ prompt: "P", inlineData: { mimeType: "application/pdf", data: "QUJD" } }) as {
      contents: { parts: Record<string, unknown>[] }[];
    };
    expect(body.contents[0].parts).toEqual([{ inlineData: { mimeType: "application/pdf", data: "QUJD" } }, { text: "P" }]);
  });

  it("returns a page-split result from the model's transcription", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: TRANSCRIPT }] } }] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await ocrPdf(new Uint8Array([37, 80, 68, 70]), 2);
    expect(result?.title).toBe("Entry requirements");
    expect(result?.pages).toHaveLength(2);
    expect(result?.fullText).toContain("--- Page 2 ---");

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.contents[0].parts[0].inlineData).toEqual({ mimeType: "application/pdf", data: "JVBERg==" });
    expect(sent.generationConfig.temperature).toBe(0);
  });

  it("returns null without a key, on HTTP errors, or for an unusable answer", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await ocrPdf(new Uint8Array([1]), 1)).toBeNull();

    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("quota", { status: 429 })));
    expect(await ocrPdf(new Uint8Array([1]), 1)).toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Sorry, I can't." }] } }] }), { status: 200 }))
    );
    expect(await ocrPdf(new Uint8Array([1]), 1)).toBeNull();
  });
});
