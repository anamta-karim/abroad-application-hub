import crypto from "crypto";

export interface TextChunk {
  chunkIndex: number;
  pageNumber: number | null;
  sectionHeading: string | null;
  content: string;
  charCount: number;
}

export function computeSha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Splits document text into manageable semantic chunks with section headings and page tracking.
 */
export function chunkDocumentText(
  fullText: string,
  options: {
    maxChunkSizeChars?: number;
    chunkOverlapChars?: number;
  } = {}
): TextChunk[] {
  const maxChunkSize = options.maxChunkSizeChars || 1200;
  const chunkOverlap = options.chunkOverlapChars || 150;

  const chunks: TextChunk[] = [];
  const paragraphs = fullText.split(/\n\n+/);

  let currentChunkText = "";
  let currentHeading: string | null = null;
  let currentPageNumber: number | null = 1;
  let chunkIndex = 0;

  // Ends the current chunk at a page or section boundary, without carrying
  // overlap across it, so every chunk's page number and heading are accurate.
  const closeChunkAtBoundary = () => {
    if (currentChunkText.trim()) {
      chunks.push({
        chunkIndex,
        pageNumber: currentPageNumber,
        sectionHeading: currentHeading,
        content: currentChunkText.trim(),
        charCount: currentChunkText.trim().length,
      });
      chunkIndex++;
    }
    currentChunkText = "";
  };

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Page markers: --- Page X ---
    const pageMatch = trimmed.match(/^---\s*Page\s*(\d+)\s*---\s*$/i);
    if (pageMatch) {
      closeChunkAtBoundary();
      currentPageNumber = parseInt(pageMatch[1], 10);
      continue;
    }

    // Heading markers: # Heading (from HTML h1-h4 or larger PDF text)
    if (trimmed.startsWith("#")) {
      closeChunkAtBoundary();
      currentHeading = trimmed.replace(/^#+\s*/, "").slice(0, 100);
    }

    if (currentChunkText.length + trimmed.length + 2 <= maxChunkSize) {
      currentChunkText += (currentChunkText ? "\n\n" : "") + trimmed;
    } else {
      if (currentChunkText) {
        chunks.push({
          chunkIndex,
          pageNumber: currentPageNumber,
          sectionHeading: currentHeading,
          content: currentChunkText,
          charCount: currentChunkText.length,
        });
        chunkIndex++;

        // Keep trailing overlap
        const overlap = currentChunkText.slice(-chunkOverlap);
        currentChunkText = overlap + "\n\n" + trimmed;
      } else {
        // Single paragraph larger than maxChunkSize, split by length
        chunks.push({
          chunkIndex,
          pageNumber: currentPageNumber,
          sectionHeading: currentHeading,
          content: trimmed.slice(0, maxChunkSize),
          charCount: maxChunkSize,
        });
        chunkIndex++;
        currentChunkText = trimmed.slice(maxChunkSize - chunkOverlap);
      }
    }
  }

  if (currentChunkText.trim()) {
    chunks.push({
      chunkIndex,
      pageNumber: currentPageNumber,
      sectionHeading: currentHeading,
      content: currentChunkText.trim(),
      charCount: currentChunkText.trim().length,
    });
  }

  return chunks;
}
