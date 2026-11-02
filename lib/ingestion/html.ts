/**
 * Cleans HTML content, extracting title, structured text, and section headings.
 */
export function extractCleanTextFromHtml(html: string): {
  title: string;
  cleanText: string;
} {
  // 1. Extract title
  let title = "Official Web Source";
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = decodeHtmlEntities(titleMatch[1].trim());
  }

  // 2. Remove script, style, noscript, svg, iframe, nav, and footer tags and contents
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, " ")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ");

  // 3. Convert headers to structured Markdown
  sanitized = sanitized
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n")
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, "\n\n#### $1\n\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n");

  // 4. Strip all remaining HTML tags
  sanitized = sanitized.replace(/<[^>]+>/g, " ");

  // 5. Decode HTML entities
  sanitized = decodeHtmlEntities(sanitized);

  // 6. Clean whitespace and empty lines
  const cleanLines = sanitized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const cleanText = cleanLines.join("\n\n");

  // If no title found from <title>, try first # heading
  if (title === "Official Web Source") {
    const headingMatch = cleanText.match(/^#+\s+(.+)$/m);
    if (headingMatch && headingMatch[1]) {
      title = headingMatch[1].trim();
    }
  }

  return { title, cleanText };
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}
