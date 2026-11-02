import { createClient } from "@/lib/supabase/server";

export interface RankedChunk {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: string;
  pageNumber: number | null;
  sectionHeading: string | null;
  content: string;
  score: number;
}

const HIGH_SPECIFICITY_KEYWORDS = new Set([
  "topik", "ielts", "toefl", "duolingo", "pte", "gre", "gmat", "sat", "act",
  "gpa", "cgpa", "ects", "credits", "transcript",
  "apostille", "consular", "consulate", "embassy", "notary", "notarized",
  "stipend", "allowance", "tuition", "airfare", "dormitory", "dorm",
  "recommendation", "referee", "lor", "sop", "statement", "essay",
  "interview", "screening", "selection", "quota", "track", "round",
  "deadline", "dates", "schedule", "timeline", "age", "eligibility",
  "nationality", "citizenship", "medical", "physical", "visa",
  "gks", "kgsp", "niied", "daad", "mext", "csc", "chevening", "fulbright", "erasmus",
]);

/**
 * Retrieves the most semantically and lexically relevant chunks for an application query.
 * Scoped strictly to the authenticated user and target application_id.
 */
export async function retrieveRelevantChunks(
  applicationId: string,
  query: string,
  topK = 5
): Promise<RankedChunk[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required for chunk retrieval.");
  }

  // 1. Fetch chunks belonging to this application and user, joining source details
  const { data: chunksData, error } = await supabase
    .from("source_chunks")
    .select(`
      id,
      source_id,
      page_number,
      section_heading,
      content,
      chunk_index,
      sources:source_id (
        id,
        display_name,
        source_type
      )
    `)
    .eq("application_id", applicationId)
    .eq("user_id", user.id);

  if (error || !chunksData || chunksData.length === 0) {
    return [];
  }

  // 2. Tokenize and normalize query
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return [];
  }

  const queryTermsSet = new Set(queryTokens);
  const specificQueryTerms = queryTokens.filter((t) => HIGH_SPECIFICITY_KEYWORDS.has(t));
  const hasSpecificQueryTerms = specificQueryTerms.length > 0;

  const ranked: RankedChunk[] = [];

  // 3. Score chunks using weighted term frequency, specificity, heading, and sentence co-occurrence
  for (const item of chunksData as any[]) {
    const content = item.content || "";
    const contentLower = content.toLowerCase();
    const heading = (item.section_heading || "").toLowerCase();
    const sourceInfo = item.sources || {};
    const sourceTitle = sourceInfo.display_name || "Official Source";
    const sourceType = sourceInfo.source_type || "webpage";

    const contentTokens = tokenize(content);
    if (contentTokens.length === 0) continue;

    let matchCount = 0;
    let specificMatches = 0;

    for (const token of contentTokens) {
      if (queryTermsSet.has(token)) {
        matchCount++;
        if (HIGH_SPECIFICITY_KEYWORDS.has(token)) {
          specificMatches++;
        }
      }
    }

    // Specific term presence check
    let chunkHasSpecificTerms = false;
    for (const st of specificQueryTerms) {
      if (contentLower.includes(st) || heading.includes(st)) {
        chunkHasSpecificTerms = true;
        break;
      }
    }

    // If query asked for a high-specificity term (e.g. topik) and this chunk does NOT contain it,
    // don't let common generic words like 'required' inflate its score over chunks that do!
    if (hasSpecificQueryTerms && !chunkHasSpecificTerms) {
      matchCount = Math.min(matchCount, 1);
    }

    // Heading boost: if query terms match section heading
    let headingBoost = 0;
    for (const qt of queryTokens) {
      if (heading.includes(qt)) {
        headingBoost += HIGH_SPECIFICITY_KEYWORDS.has(qt) ? 15 : 4;
      }
    }

    // Specific match super-boost
    const specificityBoost = specificMatches * 15;

    // Phrase match bonus
    const queryTrimmed = query.toLowerCase().trim();
    const phraseBonus = contentLower.includes(queryTrimmed) ? 20 : 0;

    // Sentence co-occurrence bonus: 2 or more query terms in the same sentence
    let sentenceCooccurrenceBonus = 0;
    const sentences = contentLower.split(/(?<=[.!?])\s+/);
    for (const sentence of sentences) {
      let sentenceMatches = 0;
      for (const qt of queryTokens) {
        if (sentence.includes(qt)) sentenceMatches++;
      }
      if (sentenceMatches >= 2) {
        sentenceCooccurrenceBonus = Math.max(sentenceCooccurrenceBonus, sentenceMatches * 6);
      }
    }

    const termDensity = matchCount / Math.max(contentTokens.length, 50);
    const totalScore =
      matchCount +
      specificityBoost +
      headingBoost +
      phraseBonus +
      sentenceCooccurrenceBonus +
      termDensity * 10;

    if (totalScore > 0) {
      ranked.push({
        chunkId: item.id,
        sourceId: item.source_id,
        sourceTitle,
        sourceType,
        pageNumber: item.page_number,
        sectionHeading: item.section_heading,
        content,
        score: totalScore,
      });
    }
  }

  // Sort descending by score
  ranked.sort((a, b) => b.score - a.score);

  return ranked.slice(0, topK);
}

export function tokenize(text: string): string[] {
  const stopwords = new Set([
    "a", "an", "the", "in", "on", "at", "by", "for", "with", "about",
    "against", "between", "into", "through", "during", "before", "after",
    "above", "below", "to", "from", "up", "down", "is", "are", "was",
    "were", "be", "been", "being", "have", "has", "had", "do", "does",
    "did", "will", "would", "shall", "should", "can", "could", "may",
    "might", "must", "and", "but", "or", "because", "as", "until", "while",
    "what", "when", "where", "how", "who", "which", "this", "that", "these",
    "those", "am", "i", "you", "he", "she", "it", "we", "they",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2 && !stopwords.has(word));
}
