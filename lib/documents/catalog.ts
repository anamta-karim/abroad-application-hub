/**
 * Documents that most study-abroad program and scholarship applications ask
 * for, and the logic that matches an application's requirements against what
 * the user already has. Pure functions, unit tested.
 */

export interface CommonDocument {
  key: string;
  label: string;
  description: string;
  /** Matches requirement names from the checklist or extracted facts. */
  pattern: RegExp;
  /** Documents that expire (show an expiry date field). */
  expires: boolean;
}

export const COMMON_DOCUMENTS: CommonDocument[] = [
  { key: "passport", label: "Passport", description: "Valid for your whole study period", pattern: /passport(?![- ]?(size|sized|style))|identity document|identification document|photo id/i, expires: true },
  { key: "transcripts", label: "Academic transcripts", description: "Marks or grades for every year of your degree", pattern: /transcript|mark ?sheets?|records? of study|grade (report|sheet)|academic records?/i, expires: false },
  { key: "degree_certificate", label: "Degree certificate", description: "Or a provisional certificate if you haven't graduated", pattern: /degree certificate|diploma|graduation certificate|provisional certificate|bachelor'?s certificate|proof of (degree|graduation)/i, expires: false },
  { key: "cv", label: "CV / résumé", description: "Education, experience and achievements", pattern: /\bcv\b|curriculum vitae|r[ée]sum[ée]/i, expires: false },
  { key: "statement", label: "Statement of purpose", description: "Also called personal statement or motivation letter", pattern: /statement of purpose|personal statement|motivation letter|letter of motivation|\bsop\b|statement of intent/i, expires: false },
  { key: "recommendations", label: "Recommendation letters", description: "Usually two or three, from academic or work referees", pattern: /recommendation|reference letter|letters? of reference|referee|\blor\b/i, expires: false },
  { key: "english_test", label: "English test score", description: "IELTS, TOEFL, PTE or Duolingo (usually valid 2 years)", pattern: /ielts|toefl|\bpte\b|duolingo|english (language )?(proficiency|test|certificate)|cefr/i, expires: true },
  { key: "aptitude_test", label: "GRE / GMAT score", description: "Only some programs require these (usually valid 5 years)", pattern: /\bgre\b|\bgmat\b/i, expires: true },
  { key: "financial_proof", label: "Proof of funds", description: "Bank statements or a sponsor letter", pattern: /bank statement|proof of funds|financial (guarantee|evidence|proof|statement)|affidavit of support|sponsor(ship)? letter/i, expires: true },
  { key: "photo", label: "Passport-size photo", description: "Recent, to the program's size rules", pattern: /photo(graph)?s?\b(?! id)/i, expires: false },
  { key: "research_proposal", label: "Research proposal / study plan", description: "Common for PhD programs and government scholarships", pattern: /research proposal|study plan|research plan|plan of study/i, expires: false },
  { key: "portfolio", label: "Portfolio / writing sample", description: "For design, arts or writing-heavy programs", pattern: /portfolio|writing sample/i, expires: false },
  { key: "medical", label: "Medical certificate", description: "Some government scholarships require a health check", pattern: /medical|health (certificate|check|form)|physical examination/i, expires: true },
];

export const COMMON_DOCUMENT_KEYS = new Set(COMMON_DOCUMENTS.map((d) => d.key));

/** A document the user has (a row in user_documents). */
export interface OwnedDocument {
  id: string;
  /** A COMMON_DOCUMENTS key, or "custom" for user-added documents. */
  document_type: string;
  display_name: string;
  expires_on: string | null;
}

export function matchCommonDocument(requirementName: string): CommonDocument | null {
  return COMMON_DOCUMENTS.find((d) => d.pattern.test(requirementName)) || null;
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export type CoverageState =
  | "have" // the user has a matching document
  | "expires_before_deadline" // has it, but it expires before this application's deadline
  | "expired" // has it, but it has already expired
  | "missing" // a common document the user hasn't got yet
  | "specific"; // not a common document: specific to this application

export interface RequirementCoverage {
  requirement: string;
  status: string;
  state: CoverageState;
  matched: CommonDocument | null;
  owned: OwnedDocument | null;
  /** Shown instead of the state's usual label (e.g. letter-tracker progress). */
  note?: string;
}

/** Recommendation-letter progress for one application, from the letter tracker. */
export interface LetterCoverage {
  submitted: number;
  target: number;
  text: string;
}

/**
 * Compares one application's requirements with the user's documents.
 * Custom documents match a requirement with the same name.
 */
export function coverageFor(
  requirements: { document_type: string; status: string }[],
  owned: OwnedDocument[],
  deadline: string | null,
  today: string,
  letters: LetterCoverage | null = null
): RequirementCoverage[] {
  const byKey = new Map(owned.filter((o) => o.document_type !== "custom").map((o) => [o.document_type, o]));
  const customs = owned.filter((o) => o.document_type === "custom");

  return requirements
    .filter((r) => r.status !== "not_applicable")
    .map((r) => {
      const matched = matchCommonDocument(r.document_type);

      // Letters are tracked per referee, so the tracker decides, not the inventory
      if (matched?.key === "recommendations" && letters && letters.target > 0) {
        const state: CoverageState = letters.submitted >= letters.target ? "have" : "missing";
        return { requirement: r.document_type, status: r.status, state, matched, owned: null, note: letters.text };
      }

      const own =
        (matched ? byKey.get(matched.key) : undefined) ||
        customs.find((c) => normalise(c.display_name) === normalise(r.document_type)) ||
        null;

      let state: CoverageState;
      if (own) {
        if (own.expires_on && own.expires_on < today) state = "expired";
        else if (own.expires_on && deadline && own.expires_on < deadline) state = "expires_before_deadline";
        else state = "have";
      } else {
        state = matched ? "missing" : "specific";
      }
      return { requirement: r.document_type, status: r.status, state, matched, owned: own };
    });
}

/** How many applications need each common document (for "Needed by N applications"). */
export function demandByDocument(requirementNames: { application_id: string; document_type: string }[]): Map<string, number> {
  const apps = new Map<string, Set<string>>();
  for (const r of requirementNames) {
    const m = matchCommonDocument(r.document_type);
    if (!m) continue;
    if (!apps.has(m.key)) apps.set(m.key, new Set());
    apps.get(m.key)!.add(r.application_id);
  }
  return new Map([...apps].map(([k, v]) => [k, v.size]));
}
