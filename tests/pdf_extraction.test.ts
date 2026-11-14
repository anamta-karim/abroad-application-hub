import { describe, it, expect } from "vitest";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { extractTextFromPdf, layoutPageText, PdfExtractionError } from "@/lib/ingestion/pdf";
import { chunkDocumentText } from "@/lib/ingestion/chunker";
import { extractCandidateFacts } from "@/lib/ingestion/extractor";

/** Builds a multi-page brochure: a large heading, then body lines, per page. */
async function makeBrochure(pages: { heading: string; lines: string[] }[], title?: string) {
  const doc = await PDFDocument.create();
  if (title) doc.setTitle(title);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const p of pages) {
    const page = doc.addPage([595, 842]);
    let y = 780;
    page.drawText(p.heading, { x: 50, y, size: 20, font: bold });
    y -= 40;
    for (const line of p.lines) {
      if (line === "") {
        y -= 18; // blank line = paragraph gap
        continue;
      }
      page.drawText(line, { x: 50, y, size: 11, font });
      y -= 14;
    }
  }
  return Buffer.from(await doc.save());
}

describe("PDF extraction", () => {
  it("reads every page with correct page numbers, headings and paragraphs", async () => {
    const pdf = await makeBrochure(
      [
        { heading: "MSc Data Science 2027 Entry", lines: ["Applications close on 15 January 2027.", "", "A minimum GPA of 3.0 is required."] },
        { heading: "Required Documents", lines: ["You must submit an academic transcript and", "two letters of recommendation."] },
        { heading: "Funding", lines: ["A full scholarship includes a monthly stipend."] },
      ],
      "Data Science Prospectus"
    );

    const result = await extractTextFromPdf(pdf);
    expect(result.title).toBe("Data Science Prospectus");
    expect(result.totalPages).toBe(3);
    expect(result.pages.map((p) => p.pageNumber)).toEqual([1, 2, 3]);
    expect(result.pages[1].text).toContain("# Required Documents");
    // Wrapped lines are joined into one paragraph
    expect(result.pages[1].text).toContain("an academic transcript and two letters of recommendation.");
    // A vertical gap starts a new paragraph
    expect(result.pages[0].text).toContain("15 January 2027.\n\nA minimum GPA");
  });

  it("falls back to the first heading when there is no title metadata", async () => {
    const pdf = await makeBrochure([{ heading: "Erasmus Mundus Guide", lines: ["Applications open in October each year for this programme."] }]);
    expect((await extractTextFromPdf(pdf)).title).toBe("Erasmus Mundus Guide");
  });

  it("feeds chunks with accurate page numbers and sections into fact extraction", async () => {
    const pdf = await makeBrochure([
      { heading: "Key Dates", lines: ["The application deadline is 15 January 2027."] },
      { heading: "Documents", lines: ["Applicants must submit an academic transcript."] },
    ]);
    const { fullText } = await extractTextFromPdf(pdf);
    const chunks = chunkDocumentText(fullText);

    const deadlineChunk = chunks.find((c) => c.content.includes("15 January 2027"))!;
    expect(deadlineChunk.pageNumber).toBe(1);
    expect(deadlineChunk.sectionHeading).toBe("Key Dates");
    const docsChunk = chunks.find((c) => c.content.includes("transcript"))!;
    expect(docsChunk.pageNumber).toBe(2);
    expect(docsChunk.sectionHeading).toBe("Documents");

    const facts = extractCandidateFacts(chunks);
    expect(facts.find((f) => f.factType === "deadline")?.value.extractedValue).toBe("15 January 2027");
    expect(facts.some((f) => f.label === "Academic Transcript")).toBe(true);
  });

  it("rejects image-only (scanned) PDFs with a clear message", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    page.drawRectangle({ x: 50, y: 50, width: 495, height: 742, color: rgb(0.9, 0.9, 0.9) });
    const pdf = Buffer.from(await doc.save());

    await expect(extractTextFromPdf(pdf)).rejects.toMatchObject({ code: "no_text" });
    await expect(extractTextFromPdf(pdf)).rejects.toBeInstanceOf(PdfExtractionError);
  });

  it("rejects files that aren't PDFs", async () => {
    await expect(extractTextFromPdf(Buffer.from("PK\u0003\u0004 renamed docx"))).rejects.toMatchObject({ code: "not_pdf" });
  });

  it("reports a damaged PDF instead of throwing a raw error", async () => {
    const broken = Buffer.from("%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF garbage");
    await expect(extractTextFromPdf(broken)).rejects.toMatchObject({ code: expect.stringMatching(/unreadable|no_text/) });
  });
});

describe("Page layout", () => {
  it("re-joins words hyphenated across lines", () => {
    const text = layoutPageText([
      { str: "Applicants need a recog-", y: 700, fontSize: 11, hasEOL: true },
      { str: "nised degree.", y: 686, fontSize: 11, hasEOL: true },
    ]);
    expect(text).toBe("Applicants need a recognised degree.");
  });
});
