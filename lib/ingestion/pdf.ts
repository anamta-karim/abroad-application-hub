import { getDocumentProxy, extractTextItems, getMeta } from "unpdf";
import { errorName } from "@/lib/errors";

/**
 * PDF text extraction using pdf.js (via unpdf's serverless build).
 *
 * Handles the PDFs universities actually publish (embedded/subset fonts,
 * compressed streams, Word/Chrome/InDesign exports). Rebuilds paragraphs and
 * marks headings ("# Heading") from font sizes so the chunker can attach
 * section titles to citations. Scanned (image-only) and password-protected
 * PDFs are reported with a clear message instead of "succeeding" with no text.
 */

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface PdfExtractionResult {
  title: string;
  pages: ExtractedPage[];
  /** Pages joined with "--- Page N ---" markers, each on its own paragraph. */
  fullText: string;
  totalPages: number;
}

export type PdfErrorCode = "not_pdf" | "encrypted" | "no_text" | "unreadable";

export class PdfExtractionError extends Error {
  constructor(
    public code: PdfErrorCode,
    message: string,
    /** Page count, when the file could be opened (used to decide whether OCR is feasible). */
    public totalPages?: number
  ) {
    super(message);
    this.name = "PdfExtractionError";
  }
}

export const PDF_ERROR_MESSAGES: Record<PdfErrorCode, string> = {
  not_pdf: "This file isn't a valid PDF.",
  encrypted: "This PDF is password-protected. Remove the password (or upload an unprotected copy) and try again.",
  no_text:
    "This PDF has no selectable text. It looks like a scanned document. Upload a text-based PDF, or add the official webpage link instead.",
  unreadable: "This PDF couldn't be read. It may be damaged; try re-downloading it from the official site.",
};

/** Minimum characters of real text before we accept a document. */
const MIN_TEXT_CHARS = 40;

export interface TextItem {
  str: string;
  y: number;
  fontSize: number;
  hasEOL: boolean;
}

interface Line {
  text: string;
  y: number;
  fontSize: number;
}

/** Groups pdf.js text items into visual lines (hasEOL marks line ends). */
function toLines(items: TextItem[]): Line[] {
  const lines: Line[] = [];
  let parts: string[] = [];
  let y = 0;
  let fontSize = 0;

  const flush = () => {
    const text = parts.join("").replace(/\s+/g, " ").trim();
    if (text) lines.push({ text, y, fontSize });
    parts = [];
    fontSize = 0;
  };

  for (const item of items) {
    if (parts.length === 0 && item.str.trim()) y = item.y;
    if (item.str) {
      parts.push(item.str);
      if (item.str.trim()) fontSize = Math.max(fontSize, item.fontSize || 0);
    }
    if (item.hasEOL) flush();
  }
  flush();
  return lines;
}

/** Font size used by most of the text (weighted by characters). */
function bodyFontSize(lines: Line[]): number {
  const weights = new Map<number, number>();
  for (const l of lines) {
    const size = Math.round(l.fontSize * 2) / 2;
    weights.set(size, (weights.get(size) || 0) + l.text.length);
  }
  let best = 0;
  let bestWeight = -1;
  for (const [size, w] of weights) {
    if (w > bestWeight) {
      best = size;
      bestWeight = w;
    }
  }
  return best || 10;
}

/**
 * Rebuilds readable text for one page: wrapped lines joined into paragraphs,
 * blank lines between paragraphs, and larger short lines marked as "# headings".
 */
export function layoutPageText(items: TextItem[]): string {
  const lines = toLines(items);
  if (lines.length === 0) return "";
  const body = bodyFontSize(lines);

  const blocks: string[] = [];
  let paragraph = "";
  let prev: Line | null = null;

  const endParagraph = () => {
    if (paragraph.trim()) blocks.push(paragraph.trim());
    paragraph = "";
  };

  for (const line of lines) {
    const isHeading = line.fontSize >= body * 1.2 && line.text.length <= 120 && /[A-Za-zÀ-ɏ]/.test(line.text);

    if (isHeading) {
      endParagraph();
      blocks.push(`# ${line.text}`);
      prev = null;
      continue;
    }

    // A vertical gap noticeably bigger than a normal line step starts a new paragraph
    const gap = prev ? Math.abs(prev.y - line.y) : 0;
    const lineStep = (prev?.fontSize || body) * 1.6;
    if (prev && gap > lineStep) endParagraph();

    if (!paragraph) {
      paragraph = line.text;
    } else if (/[A-Za-z]-$/.test(paragraph) && /^[a-z]/.test(line.text)) {
      paragraph = paragraph.slice(0, -1) + line.text; // re-join a hyphenated word
    } else {
      paragraph += " " + line.text;
    }
    prev = line;
  }
  endParagraph();

  return blocks.join("\n\n");
}

function cleanTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const title = raw
    .replace(/^Microsoft (Word|PowerPoint) - /i, "")
    .replace(/\.(docx?|pptx?|indd|pdf)$/i, "")
    .trim();
  if (title.length < 3 || /^untitled/i.test(title)) return null;
  return title.slice(0, 200);
}

export async function extractTextFromPdf(pdfBuffer: Buffer | Uint8Array): Promise<PdfExtractionResult> {
  const bytes = pdfBuffer instanceof Uint8Array ? new Uint8Array(pdfBuffer) : new Uint8Array(pdfBuffer);
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  if (!header.includes("%PDF-")) {
    throw new PdfExtractionError("not_pdf", PDF_ERROR_MESSAGES.not_pdf);
  }

  let pdf;
  try {
    pdf = await getDocumentProxy(bytes);
  } catch (err) {
    if (errorName(err) === "PasswordException") {
      throw new PdfExtractionError("encrypted", PDF_ERROR_MESSAGES.encrypted);
    }
    throw new PdfExtractionError("unreadable", PDF_ERROR_MESSAGES.unreadable);
  }

  let pageItems: TextItem[][];
  let totalPages: number;
  try {
    const result = await extractTextItems(pdf);
    pageItems = result.items as TextItem[][];
    totalPages = result.totalPages;
  } catch {
    throw new PdfExtractionError("unreadable", PDF_ERROR_MESSAGES.unreadable);
  }

  const pages: ExtractedPage[] = pageItems
    .map((items, i) => ({ pageNumber: i + 1, text: layoutPageText(items) }))
    .filter((p) => p.text.trim().length > 0);

  const textChars = pages.reduce((n, p) => n + p.text.replace(/\s/g, "").length, 0);
  if (textChars < MIN_TEXT_CHARS) {
    throw new PdfExtractionError("no_text", PDF_ERROR_MESSAGES.no_text, totalPages);
  }

  let title: string | null = null;
  try {
    const meta = await getMeta(pdf);
    title = cleanTitle(meta.info?.Title);
  } catch {
    // Metadata is optional
  }
  if (!title) {
    const firstHeading = pages[0].text.match(/^# (.+)$/m)?.[1];
    const firstLine = pages[0].text.split("\n")[0]?.replace(/^# /, "");
    title = cleanTitle(firstHeading) || cleanTitle(firstLine) || "Official PDF Document";
  }

  // Each marker is its own paragraph so the chunker records the page without
  // swallowing that page's first paragraph.
  const fullText = pages.map((p) => `--- Page ${p.pageNumber} ---\n\n${p.text}`).join("\n\n");

  return { title, pages, fullText, totalPages };
}
