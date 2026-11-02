import type { FactType, Confidence } from "@/types/database";
import type { TextChunk } from "./chunker";

export interface CandidateFact {
  factType: FactType;
  label: string;
  value: {
    extractedValue: string;
    context: string;
    confidenceReason: string;
  };
  confidence: Confidence;
  chunkIndex: number;
}

/**
 * Extracts candidate admissions and scholarship facts from text chunks.
 * Facts always start as 'suggested' until confirmed or edited by the user.
 */
export function extractCandidateFacts(chunks: TextChunk[]): CandidateFact[] {
  const candidateFacts: CandidateFact[] = [];
  const seenLabels = new Set<string>();

  for (const chunk of chunks) {
    const text = chunk.content;
    const sentences = text.split(/(?<=[.!?])\s+|\n+/);

    for (const sentence of sentences) {
      const sLower = sentence.toLowerCase().trim();
      if (sLower.length < 10) continue;

      // ── 1. Deadlines ──
      if (
        (sLower.includes("deadline") ||
          sLower.includes("closing date") ||
          sLower.includes("due date") ||
          sLower.includes("submit by") ||
          sLower.includes("applications close")) &&
        /\b(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/i.test(
          sentence
        )
      ) {
        const dateMatch = sentence.match(
          /\b(\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}|\w+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\b/i
        );

        const extractedValue = dateMatch ? dateMatch[0] : sentence.trim();
        const label = "Application Deadline";

        if (!seenLabels.has(`${label}:${extractedValue}`)) {
          seenLabels.add(`${label}:${extractedValue}`);
          candidateFacts.push({
            factType: "deadline",
            label,
            value: {
              extractedValue,
              context: sentence.trim(),
              confidenceReason: "Matched explicit deadline keyword and calendar date in text.",
            },
            confidence: dateMatch ? "clear" : "uncertain",
            chunkIndex: chunk.chunkIndex,
          });
        }
      }

      // ── 2. Required Documents ──
      const docPatterns = [
        { key: "transcript", label: "Academic Transcript", pattern: /\b(transcript[s]?|records of study|mark sheet[s]?)\b/i },
        { key: "ielts_toefl", label: "English Language Proficiency (IELTS / TOEFL)", pattern: /\b(ielts|toefl|duolingo english|pte academic|cefr)\b/i },
        { key: "recommendation", label: "Letters of Recommendation", pattern: /\b(letter[s]? of recommendation|reference letter[s]?|referee report[s]?|academic reference[s]?)\b/i },
        { key: "sop", label: "Statement of Purpose / Personal Statement", pattern: /\b(statement of purpose|personal statement|motivation letter|letter of motivation)\b/i },
        { key: "cv", label: "Curriculum Vitae (CV) / Resume", pattern: /\b(curriculum vitae|\bcv\b|\bresume\b)\b/i },
        { key: "passport", label: "Passport / Photo ID", pattern: /\b(copy of passport|valid passport|identification document)\b/i },
        { key: "financial", label: "Financial Evidence / Bank Statement", pattern: /\b(bank statement|proof of funds|financial guarantee|affidavit of support)\b/i },
      ];

      for (const doc of docPatterns) {
        if (doc.pattern.test(sentence) && !seenLabels.has(doc.label)) {
          // Check if sentence indicates a requirement (required, submit, provide, upload, must)
          const isRequiredContext = /\b(require[ds]?|must|submit|provide|upload|attach|include|mandatory)\b/i.test(sentence);
          seenLabels.add(doc.label);
          candidateFacts.push({
            factType: "document",
            label: doc.label,
            value: {
              extractedValue: doc.label,
              context: sentence.trim(),
              confidenceReason: isRequiredContext
                ? "Document explicitly marked as required in admissions criteria."
                : "Mentioned in document guidelines; review to confirm necessity.",
            },
            confidence: isRequiredContext ? "clear" : "uncertain",
            chunkIndex: chunk.chunkIndex,
          });
        }
      }

      // ── 3. Funding & Scholarship Coverage ──
      if (
        (sLower.includes("tuition waiver") ||
          sLower.includes("full scholarship") ||
          sLower.includes("monthly stipend") ||
          sLower.includes("living allowance") ||
          sLower.includes("coverage:") ||
          sLower.includes("award value")) &&
        !seenLabels.has("funding_coverage")
      ) {
        seenLabels.add("funding_coverage");
        candidateFacts.push({
          factType: "funding",
          label: "Scholarship Coverage & Stipend",
          value: {
            extractedValue: sentence.trim(),
            context: sentence.trim(),
            confidenceReason: "Identified scholarship benefits or funding coverage details.",
          },
          confidence: "clear",
          chunkIndex: chunk.chunkIndex,
        });
      }

      // ── 4. Academic Eligibility / Minimum GPA ──
      if (
        (sLower.includes("minimum gpa") ||
          sLower.includes("2:1 honours") ||
          sLower.includes("first class") ||
          sLower.includes("bachelor's degree") ||
          sLower.includes("undergraduate degree") ||
          sLower.includes("grade point average")) &&
        !seenLabels.has("eligibility_academic")
      ) {
        seenLabels.add("eligibility_academic");
        candidateFacts.push({
          factType: "eligibility",
          label: "Academic Entry Requirements",
          value: {
            extractedValue: sentence.trim(),
            context: sentence.trim(),
            confidenceReason: "Minimum academic entry criteria identified.",
          },
          confidence: "uncertain",
          chunkIndex: chunk.chunkIndex,
        });
      }
    }
  }

  return candidateFacts;
}
