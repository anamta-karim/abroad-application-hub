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
  const ranked: RankedChunk[] = [];

  // 3. Score chunks using term frequency and heading weight
  for (const item of chunksData as any[]) {
    const content = item.content || "";
    const heading = (item.section_heading || "").toLowerCase();
    const sourceInfo = item.sources || {};
    const sourceTitle = sourceInfo.display_name || "Official Source";
    const sourceType = sourceInfo.source_type || "webpage";

    const contentTokens = tokenize(content);
    if (contentTokens.length === 0) continue;

    let matchCount = 0;
    for (const token of contentTokens) {
      if (queryTermsSet.has(token)) {
        matchCount++;
      }
    }

    // Heading boost: if query matches section heading, add significant weight
    let headingBoost = 0;
    for (const qt of queryTokens) {
      if (heading.includes(qt)) {
        headingBoost += 3;
      }
    }

    // Phrase match bonus
    const phraseBonus = content.toLowerCase().includes(query.toLowerCase().trim()) ? 5 : 0;

    const termDensity = matchCount / Math.max(contentTokens.length, 50);
    const totalScore = matchCount + headingBoost + phraseBonus + termDensity * 10;

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

function tokenize(text: string): string[] {
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
    .filter((word) => word.length > 2 && !stopwords.has(word));
}
