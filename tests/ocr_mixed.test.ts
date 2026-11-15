import { describe, it, expect, vi, afterEach } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractTextFromPdf } from "@/lib/ingestion/pdf";
import { formatPageList, mergeOcrPages, ocrPages, ocrTitle, pdfWithPages } from "@/lib/ingestion/ocr";

// A 1×1 PNG, standing in for a scanned page image
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
  "base64"
);

/** Page 1 text, page 2 a scanned image, page 3 blank, page 4 text. */
async function mixedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const image = await doc.embedPng(PNG);

  const p1 = doc.addPage([595, 842]);
  p1.drawText("Entry requirements: a bachelor's degree with a GPA of 3.2 or higher.", { x: 50, y: 780, size: 11, font });
  const p2 = doc.addPage([595, 842]);
  p2.drawImage(image, { x: 0, y: 0, width: 595, height: 842 });
  doc.addPage([595, 842]);
  const p4 = doc.addPage([595, 842]);
  p4.drawText("Scholarships: the Merit Award pays EUR 900 a month for two years.", { x: 50, y: 780, size: 11, font });
  return doc.save();
}

describe("Scanned pages inside a text PDF", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("finds pages that are an image with no text, but not blank pages", async () => {
    const result = await extractTextFromPdf(await mixedPdf());
    expect(result.pages.map((p) => p.pageNumber)).toEqual([1, 4]);
    expect(result.imagePages).toEqual([2]);
    expect(result.totalPages).toBe(4);
  });

  it("reports no scanned pages for an ordinary text PDF", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    doc.addPage([595, 842]).drawText("The application deadline is 15 January 2027 for all applicants.", { x: 50, y: 780, size: 11, font });
    const result = await extractTextFromPdf(await doc.save());
    expect(result.imagePages).toEqual([]);
  });

  it("sends only the scanned pages and maps them back to their real page numbers", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const transcript = "--- Page 1 ---\n# Tuition fees\n\nTuition is EUR 2,314 a year for EU students.";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: transcript }] } }] }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const pages = await ocrPages(await mixedPdf(), [2]);
    expect(pages).toEqual([{ pageNumber: 2, text: "# Tuition fees\n\nTuition is EUR 2,314 a year for EU students." }]);

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    const sentPdf = await PDFDocument.load(Buffer.from(sent.contents[0].parts[0].inlineData.data, "base64"));
    expect(sentPdf.getPageCount()).toBe(1);
    expect(sent.contents[0].parts[1].text).toBe("Transcribe all 1 page of this PDF.");
  });

  it("returns null when OCR isn't available", async () => {
    expect(await ocrPages(await mixedPdf(), [2])).toBeNull();
    expect(await ocrPages(await mixedPdf(), [])).toEqual([]);
  });

  it("builds a PDF of just the requested pages", async () => {
    const subset = await PDFDocument.load(await pdfWithPages(await mixedPdf(), [2, 4]));
    expect(subset.getPageCount()).toBe(2);
  });

  it("merges OCR pages in page order with markers", async () => {
    const merged = mergeOcrPages(
      {
        title: "Prospectus",
        totalPages: 4,
        pages: [
          { pageNumber: 1, text: "Page one." },
          { pageNumber: 4, text: "Page four." },
        ],
        fullText: "",
      },
      [{ pageNumber: 2, text: "Scanned page two." }]
    );
    expect(merged.pages.map((p) => p.pageNumber)).toEqual([1, 2, 4]);
    expect(merged.fullText).toBe(
      "--- Page 1 ---\n\nPage one.\n\n--- Page 2 ---\n\nScanned page two.\n\n--- Page 4 ---\n\nPage four."
    );
  });

  it("labels which pages were machine-read", () => {
    expect(formatPageList([5, 3, 4, 8, 3])).toBe("3–5, 8");
    expect(ocrTitle("Prospectus 2027", [2])).toBe("Prospectus 2027 (OCR p. 2)");
    expect(ocrTitle("Prospectus 2027 (OCR p. 2)", [2, 3])).toBe("Prospectus 2027 (OCR p. 2–3)");
    expect(ocrTitle("Prospectus 2027 (OCR p. 2)")).toBe("Prospectus 2027 (OCR)");
  });
});
