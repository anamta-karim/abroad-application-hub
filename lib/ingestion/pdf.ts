import zlib from "zlib";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface PdfExtractionResult {
  title: string;
  pages: ExtractedPage[];
  fullText: string;
}

/**
 * Extracts plain text and page metadata from a PDF Buffer.
 * Uses native zlib stream decompression and text-operator extraction without external binaries.
 */
export function extractTextFromPdf(pdfBuffer: Buffer): PdfExtractionResult {
  const binaryString = pdfBuffer.toString("binary");

  // Verify PDF header %PDF-1.x
  if (!binaryString.startsWith("%PDF-")) {
    throw new Error("Invalid file format: Not a valid PDF document.");
  }

  // 1. Locate and decompress stream objects
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;
  const decompressedStreams: string[] = [];

  while ((match = streamRegex.exec(binaryString)) !== null) {
    const rawStream = match[1];
    const streamBuffer = Buffer.from(rawStream, "binary");

    try {
      // Try inflate (FlateDecode)
      const decompressed = zlib.inflateSync(streamBuffer);
      decompressedStreams.push(decompressed.toString("utf-8"));
    } catch {
      try {
        // Try raw inflate without zlib header
        const decompressedRaw = zlib.inflateRawSync(streamBuffer);
        decompressedStreams.push(decompressedRaw.toString("utf-8"));
      } catch {
        // If not compressed with flate, keep raw text
        decompressedStreams.push(streamBuffer.toString("utf-8"));
      }
    }
  }

  // 2. Extract text operators (BT ... ET blocks, Tj, TJ)
  const pages: ExtractedPage[] = [];
  let currentPageNumber = 1;

  for (const streamContent of decompressedStreams) {
    const streamText = extractTextFromStream(streamContent);
    if (streamText.trim().length > 0) {
      pages.push({
        pageNumber: currentPageNumber,
        text: streamText.trim(),
      });
      currentPageNumber++;
    }
  }

  // If no streams contained text operators, fallback to direct text object regex
  if (pages.length === 0) {
    const fallbackText = extractTextFromStream(binaryString);
    if (fallbackText.trim().length > 0) {
      pages.push({
        pageNumber: 1,
        text: fallbackText.trim(),
      });
    }
  }

  const fullText = pages.map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`).join("\n\n");

  // Attempt to extract title from /Title (document metadata)
  let title = "Official PDF Document";
  const titleMetaMatch = binaryString.match(/\/Title\s*\(([^)]+)\)/i);
  if (titleMetaMatch && titleMetaMatch[1]) {
    title = cleanPdfString(titleMetaMatch[1]);
  } else if (pages.length > 0) {
    // First line of first page
    const firstLine = pages[0].text.split("\n")[0]?.trim();
    if (firstLine && firstLine.length > 3 && firstLine.length < 120) {
      title = firstLine;
    }
  }

  return {
    title,
    pages,
    fullText,
  };
}

/**
 * Extracts text characters from PDF content stream drawing operators.
 */
function extractTextFromStream(stream: string): string {
  const lines: string[] = [];

  // Match text objects between BT and ET
  const btEtRegex = /BT[\s\S]*?ET/g;
  let btMatch: RegExpExecArray | null;

  while ((btMatch = btEtRegex.exec(stream)) !== null) {
    const block = btMatch[0];

    // Extract individual strings inside (string) Tj
    const tjRegex = /\(([\s\S]*?)\)\s*Tj/g;
    let tjMatch: RegExpExecArray | null;
    let blockText = "";

    while ((tjMatch = tjRegex.exec(block)) !== null) {
      blockText += cleanPdfString(tjMatch[1]) + " ";
    }

    // Extract array strings inside [(string1) 20 (string2)] TJ
    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let arrayMatch: RegExpExecArray | null;

    while ((arrayMatch = tjArrayRegex.exec(block)) !== null) {
      const arrayContent = arrayMatch[1];
      const stringMatches = arrayContent.match(/\(([\s\S]*?)\)/g);
      if (stringMatches) {
        for (const s of stringMatches) {
          const inner = s.slice(1, -1);
          blockText += cleanPdfString(inner) + " ";
        }
      }
    }

    if (blockText.trim()) {
      lines.push(blockText.trim());
    }
  }

  return lines.join("\n");
}

function cleanPdfString(raw: string): string {
  return raw
    .replace(/\\([()\\])/g, "$1") // unescape \( \) \\
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}
