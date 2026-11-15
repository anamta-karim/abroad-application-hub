/**
 * OCR for scanned (image-only) PDFs, using Gemini's document understanding.
 *
 * Only used when a PDF has no selectable text. The model is asked to
 * transcribe, not summarise, page by page with "--- Page N ---" markers, so
 * the output flows through the same chunking, citations and fact extraction
 * as a normal PDF. Sources read this way are labelled "(OCR)" so citations
 * make clear the text was machine-read from images.
 */
import { PDFDocument } from "pdf-lib";
import { generateWithGemini } from "@/lib/ai/gemini";
import type { ExtractedPage, PdfExtractionResult } from "./pdf";
import { OCR_MAX_PAGES } from "./ocrLimits";

export { OCR_MAX_PAGES };

/** Minimum characters of real text before we accept a transcription. */
const MIN_OCR_CHARS = 40;

export const OCR_SYSTEM_PROMPT = [
  "You are an OCR engine. Transcribe the text in the attached scanned PDF exactly as printed.",
  "Rules:",
  "- Output only the transcription: no introduction, commentary, summary or translation.",
  "- Start every page with a line containing exactly `--- Page N ---` (N = page number in the PDF), then that page's text.",
  "- Keep the original language, wording, numbers, dates and punctuation. Never guess or fill in missing words.",
  "- Mark text you cannot read as [illegible].",
  "- Put a blank line between paragraphs. Write headings on their own line starting with `# `.",
  "- Write table rows on one line each with cells separated by ` | `.",
  "- A page with no text gets its marker followed by [no text].",
].join("\n");

export function buildOcrPrompt(totalPages?: number): string {
  return totalPages
    ? `Transcribe all ${totalPages} page${totalPages === 1 ? "" : "s"} of this PDF.`
    : "Transcribe every page of this PDF.";
}

const MARKER = /^\s*-{2,}\s*page\s+(\d{1,4})\s*-{2,}\s*$/i;

/**
 * Splits a transcription into pages. Returns [] if it doesn't look like a
 * transcription (no page markers, or almost no text).
 */
export function parseOcrOutput(raw: string, totalPages?: number): ExtractedPage[] {
  const text = raw.replace(/^```[a-z]*\s*|\s*```$/gi, "").replace(/\r\n/g, "\n");
  const pages = new Map<number, string[]>();
  let current: number | null = null;

  for (const line of text.split("\n")) {
    const m = line.match(MARKER);
    if (m) {
      const n = Number(m[1]);
      current = n >= 1 && (!totalPages || n <= totalPages) ? n : null;
      if (current !== null && !pages.has(current)) pages.set(current, []);
      continue;
    }
    if (current !== null) pages.get(current)!.push(line);
  }

  const result = [...pages.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([pageNumber, lines]) => ({
      pageNumber,
      text: lines
        .join("\n")
        .replace(/^\s*\[no text\]\s*$/gim, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    }))
    .filter((p) => p.text.length > 0);

  const chars = result.reduce((n, p) => n + p.text.replace(/\s|\[illegible\]/g, "").length, 0);
  return chars >= MIN_OCR_CHARS ? result : [];
}

/**
 * The document's first line (usually the institution or document name), for
 * the source title. Exported for tests.
 */
export function titleFrom(pages: ExtractedPage[]): string | null {
  const firstLine = (pages[0]?.text ?? "").split("\n").find((l) => l.trim()) ?? "";
  const title = firstLine.replace(/^# /, "").replace(/\[illegible\]/g, "").trim();
  return title.length >= 3 && title.length <= 120 ? title : null;
}

/**
 * Transcribes a scanned PDF. Returns null when OCR isn't available or the
 * model didn't return a usable transcription (callers show the scanned-PDF
 * message in that case).
 */
export async function ocrPdf(pdfBytes: Uint8Array, totalPages?: number): Promise<PdfExtractionResult | null> {
  const raw = await generateWithGemini({
    system: OCR_SYSTEM_PROMPT,
    prompt: buildOcrPrompt(totalPages),
    inlineData: { mimeType: "application/pdf", data: Buffer.from(pdfBytes).toString("base64") },
    temperature: 0,
    maxOutputTokens: 32768,
    timeoutMs: 110_000,
  });
  if (!raw) return null;

  const pages = parseOcrOutput(raw, totalPages);
  if (pages.length === 0) {
    console.warn("[ocr] transcription had no usable page text");
    return null;
  }

  const fullText = pages.map((p) => `--- Page ${p.pageNumber} ---\n\n${p.text}`).join("\n\n");
  return {
    title: titleFrom(pages) ?? "",
    pages,
    fullText,
    totalPages: totalPages ?? pages[pages.length - 1].pageNumber,
  };
}

// ── Scanned pages inside a text PDF ──

/** A new PDF holding only the given pages (1-based), in order. */
export async function pdfWithPages(pdfBytes: Uint8Array, pageNumbers: number[]): Promise<Uint8Array> {
  const source = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
  const subset = await PDFDocument.create();
  const copied = await subset.copyPages(
    source,
    pageNumbers.map((n) => n - 1)
  );
  for (const page of copied) subset.addPage(page);
  return subset.save();
}

/**
 * Transcribes only some pages of a PDF (the scanned ones inside a text PDF).
 * Those pages are sent as their own small PDF; the transcription's page
 * numbers are mapped back to the original document. Returns null when OCR
 * isn't available or gave nothing usable.
 */
export async function ocrPages(pdfBytes: Uint8Array, pageNumbers: number[]): Promise<ExtractedPage[] | null> {
  if (pageNumbers.length === 0) return [];
  let subset: Uint8Array;
  try {
    subset = await pdfWithPages(pdfBytes, pageNumbers);
  } catch (err) {
    console.warn(`[ocr] could not separate scanned pages: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }

  const raw = await generateWithGemini({
    system: OCR_SYSTEM_PROMPT,
    prompt: buildOcrPrompt(pageNumbers.length),
    inlineData: { mimeType: "application/pdf", data: Buffer.from(subset).toString("base64") },
    temperature: 0,
    maxOutputTokens: 32768,
    timeoutMs: 110_000,
  });
  if (!raw) return null;

  const pages = parseOcrOutput(raw, pageNumbers.length).map((p) => ({ ...p, pageNumber: pageNumbers[p.pageNumber - 1] }));
  if (pages.length === 0) {
    console.warn("[ocr] scanned pages had no usable text");
    return null;
  }
  return pages;
}

/** Adds OCR'd pages to a text extraction, in page order, and rebuilds the full text. */
export function mergeOcrPages(result: PdfExtractionResult, ocrd: ExtractedPage[]): PdfExtractionResult {
  const byPage = new Map(result.pages.map((p) => [p.pageNumber, p]));
  for (const p of ocrd) {
    const existing = byPage.get(p.pageNumber);
    // Keep any text the page already had (e.g. a caption) above the transcription
    byPage.set(p.pageNumber, existing ? { pageNumber: p.pageNumber, text: `${existing.text}\n\n${p.text}` } : p);
  }
  const pages = [...byPage.values()].sort((a, b) => a.pageNumber - b.pageNumber);
  const fullText = pages.map((p) => `--- Page ${p.pageNumber} ---\n\n${p.text}`).join("\n\n");
  return { ...result, pages, fullText };
}

/** "3", "3, 5", "3–5, 8" */
export function formatPageList(pages: number[]): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(j > i ? `${sorted[i]}–${sorted[j]}` : String(sorted[i]));
    i = j;
  }
  return parts.join(", ");
}

// ── User-facing messages ──

export const OCR_MESSAGES = {
  tooManyPages: (pages: number) =>
    `This PDF is scanned (it has no selectable text) and has ${pages} pages; scanned PDFs of up to ${OCR_MAX_PAGES} pages can be read. Upload just the pages you need, or add the official webpage link instead.`,
  limitReached: (limit: number) =>
    `This PDF is scanned, and reading scanned PDFs uses one of your ${limit} daily AI uses, which have run out for today. Try again tomorrow, or upload a text-based PDF.`,
  failed:
    "This PDF looks scanned, and its text couldn't be read automatically. Upload a clearer or text-based copy, or add the official webpage link instead.",
};

/**
 * Marks a source title as machine-read, so its citations say so: "(OCR)" for
 * a scanned PDF, "(OCR p. 3–4)" when only some pages were scanned.
 */
export function ocrTitle(title: string, ocrPageNumbers?: number[]): string {
  const base = title.replace(/\s*\(OCR[^)]*\)\s*$/i, "").trim();
  const label = ocrPageNumbers && ocrPageNumbers.length > 0 ? `(OCR p. ${formatPageList(ocrPageNumbers)})` : "(OCR)";
  return `${(base || "Scanned PDF").slice(0, 160)} ${label}`.slice(0, 200);
}
