/**
 * Eligibility matching: finds measurable entry requirements (GPA, English
 * tests, GRE/GMAT, work experience, prior degree) in an application's own
 * sources, and compares them with the user's academic profile.
 *
 * Deterministic and grounded: every requirement carries the sentence it came
 * from and its page, and anything we can't compare is reported as unknown
 * rather than guessed.
 */
import type { AcademicProfileRow, DegreeLevel } from "@/types/database";

export type RequirementKind =
  | "degree"
  | "gpa"
  | "ielts"
  | "toefl"
  | "pte"
  | "duolingo"
  | "gre"
  | "gmat"
  | "work_experience";

export const ENGLISH_KINDS: RequirementKind[] = ["ielts", "toefl", "pte", "duolingo"];

export interface EligibilityRequirement {
  kind: RequirementKind;
  /** Minimum value (degree: rank of the required level). */
  minimum: number;
  /** GPA scale, e.g. 4 for "3.0 on a 4.0 scale", 100 for percentages. */
  scale?: number;
  /** True when the scale was not stated and has been inferred. */
  scaleAssumed?: boolean;
  /** IELTS: lowest score allowed in any band. */
  minBand?: number;
  /** Degree requirement level. */
  degree?: DegreeLevel;
  /** Mentioned as optional / recommended rather than required. */
  optional?: boolean;
  quote: string;
  pageNumber: number | null;
  sourceTitle: string;
}

export interface EligibilityChunk {
  content: string;
  page_number: number | null;
  sourceTitle: string;
}

export type AcademicProfile = Omit<AcademicProfileRow, "user_id" | "created_at" | "updated_at">;

export const EMPTY_PROFILE: AcademicProfile = {
  highest_degree: null,
  gpa: null,
  gpa_scale: null,
  ielts_overall: null,
  ielts_min_band: null,
  toefl_ibt: null,
  pte_academic: null,
  duolingo: null,
  gre_total: null,
  gmat_total: null,
  work_experience_years: null,
};

export const DEGREE_LABELS: Record<DegreeLevel, string> = {
  high_school: "High school / secondary",
  bachelors: "Bachelor's degree",
  masters: "Master's degree",
  phd: "PhD / doctorate",
};
const DEGREE_RANK: Record<DegreeLevel, number> = { high_school: 1, bachelors: 2, masters: 3, phd: 4 };

/** Words that sometimes stand in for small numbers ("two years of experience"). */
const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/** Keywords used to pre-filter chunks in the database (case-insensitive). */
export const ELIGIBILITY_KEYWORDS = ["gpa", "grade point", "ielts", "toefl", "pte", "duolingo", "gre", "gmat", "experience", "degree", "aggregate", "marks"];

const OPTIONAL_RE = /\b(optional|not required|recommended|encouraged|preferred|waived?|may (?:also )?submit)\b/i;

/** Splits source text into sentences (also used by the letter tracker). */
export function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 8);
}

function num(raw: string | undefined): number | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower in NUMBER_WORDS) return NUMBER_WORDS[lower];
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function inRange(n: number | null, lo: number, hi: number): n is number {
  return n !== null && n >= lo && n <= hi;
}

/** Finds the requirements stated in one sentence. */
export function parseRequirementsFromSentence(sentence: string): Omit<EligibilityRequirement, "quote" | "pageNumber" | "sourceTitle">[] {
  const out: Omit<EligibilityRequirement, "quote" | "pageNumber" | "sourceTitle">[] = [];
  const optional = OPTIONAL_RE.test(sentence);

  // ── GPA with an explicit scale: "GPA of 3.0 on a 4.0 scale", "CGPA 7.5/10", "3.2 out of 4" ──
  const gpaScaled = sentence.match(
    /\b(?:c?gpa|grade point average)\b[^.\d]{0,40}?(\d{1,2}(?:\.\d{1,2})?)\s*(?:\/|out of|on an?|on the)\s*(\d{1,3}(?:\.\d{1,2})?)(?:[- ]?point)?/i
  );
  if (gpaScaled) {
    const min = num(gpaScaled[1]);
    const scale = num(gpaScaled[2]);
    if (min !== null && scale !== null && scale >= 4 && scale <= 100 && min > 0 && min <= scale) {
      out.push({ kind: "gpa", minimum: min, scale, optional });
    }
  } else {
    // "minimum GPA of 3.0", "GPA of at least 3.3" (scale inferred from the value)
    const gpaPlain = sentence.match(/\b(?:c?gpa|grade point average)\b[^.\d]{0,40}?(\d{1,2}(?:\.\d{1,2})?)\b(?!\s*%)/i);
    const min = num(gpaPlain?.[1]);
    if (min !== null && min > 0 && min <= 10) {
      out.push({ kind: "gpa", minimum: min, scale: min <= 4 ? 4 : min <= 5 ? 5 : 10, scaleAssumed: true, optional });
    } else {
      // Percentages: "at least 60% aggregate", "minimum of 65% marks"
      const pct =
        sentence.match(/\b(?:minimum|at least|min\.?|not less than)\s+(?:of\s+)?(\d{2}(?:\.\d)?)\s*%\s*(?:marks|aggregate|overall|average|in)/i) ||
        sentence.match(/\b(\d{2}(?:\.\d)?)\s*%\s*(?:aggregate|marks|average marks)\b/i);
      const p = num(pct?.[1]);
      if (inRange(p, 35, 99)) out.push({ kind: "gpa", minimum: p, scale: 100, optional });
    }
  }

  // ── IELTS ──
  const ielts = sentence.match(/\bielts\b(?:\s+academic)?[^.\d]{0,40}?(\d(?:\.[05])?)\b/i);
  const ieltsMin = num(ielts?.[1]);
  if (inRange(ieltsMin, 4, 9)) {
    const band =
      sentence.match(/\bno (?:individual )?(?:band|sub-?scores?|components?|sections?|modules?)(?: score)?\s*(?:below|lower than|less than|under)\s*(\d(?:\.[05])?)/i) ||
      sentence.match(/\b(?:minimum|at least)(?: of)?\s*(\d(?:\.[05])?)\s*(?:in|for)\s*(?:each|every|all)(?: four)?\s*(?:band|component|section|module|skill)s?/i) ||
      sentence.match(/\b(?:each|every|all) (?:band|component|section|module|skill)s?[^.\d]{0,20}?(\d(?:\.[05])?)\b/i);
    const minBand = num(band?.[1]);
    out.push({ kind: "ielts", minimum: ieltsMin, minBand: inRange(minBand, 4, 9) ? minBand : undefined, optional });
  }

  // ── TOEFL iBT ──
  const toefl = sentence.match(/\btoefl\b(?:\s*i\.?bt)?[^.\d]{0,40}?(\d{2,3})\b/i);
  const toeflMin = num(toefl?.[1]);
  if (inRange(toeflMin, 30, 120)) out.push({ kind: "toefl", minimum: toeflMin, optional });

  // ── PTE Academic ──
  const pte = sentence.match(/\bpte\b(?:\s+academic)?[^.\d]{0,40}?(\d{2})\b/i);
  const pteMin = num(pte?.[1]);
  if (inRange(pteMin, 10, 90)) out.push({ kind: "pte", minimum: pteMin, optional });

  // ── Duolingo English Test ──
  const det = sentence.match(/\bduolingo\b(?:\s+english\s+test)?[^.\d]{0,40}?(\d{2,3})\b/i);
  const detMin = num(det?.[1]);
  if (inRange(detMin, 10, 160)) out.push({ kind: "duolingo", minimum: detMin, optional });

  // ── GRE (total, 260–340) ──
  const gre = sentence.match(/\bgre\b[^.\d]{0,40}?(\d{3})\b/i);
  const greMin = num(gre?.[1]);
  if (inRange(greMin, 260, 340)) out.push({ kind: "gre", minimum: greMin, optional });

  // ── GMAT (classic or Focus, 200–805) ──
  const gmat = sentence.match(/\bgmat\b(?:\s+focus)?[^.\d]{0,40}?(\d{3})\b/i);
  const gmatMin = num(gmat?.[1]);
  if (inRange(gmatMin, 200, 805)) out.push({ kind: "gmat", minimum: gmatMin, optional });

  // ── Work experience: "at least two years of relevant work experience" ──
  const work = sentence.match(
    /\b(?:at least|minimum(?: of)?|min\.?|a minimum of)?\s*(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*\+?\s*(?:full[- ]time\s+)?years?(?:'|’)?\s+(?:of\s+)?(?:relevant\s+|full[- ]time\s+|professional\s+|post[- ]graduation\s+|managerial\s+)*(?:work|professional|industry|managerial|working)\s+experience/i
  );
  const years = num(work?.[1]);
  if (inRange(years, 1, 20)) out.push({ kind: "work_experience", minimum: years, optional });

  // ── Prior degree: "must hold a bachelor's degree", "applicants must have a master's degree" ──
  const degree = sentence.match(
    /\b(?:hold|have|holding|possess|completed?|obtained|awarded)\b[^.]{0,30}?\b(bachelor|undergraduate|master|doctoral|phd)(?:'s|’s|s)?\b/i
  );
  if (degree) {
    const word = degree[1].toLowerCase();
    const level: DegreeLevel = word === "master" ? "masters" : word === "doctoral" || word === "phd" ? "phd" : "bachelors";
    out.push({ kind: "degree", minimum: DEGREE_RANK[level], degree: level, optional });
  }

  return out;
}

/**
 * Collects the requirements in an application's source chunks, keeping the
 * first statement of each kind (in document order).
 */
export function extractEligibilityRequirements(chunks: EligibilityChunk[]): EligibilityRequirement[] {
  const found = new Map<RequirementKind, EligibilityRequirement>();
  for (const chunk of chunks) {
    for (const sentence of sentencesOf(chunk.content || "")) {
      for (const req of parseRequirementsFromSentence(sentence)) {
        const existing = found.get(req.kind);
        // A required statement beats an earlier optional mention of the same kind
        if (existing && !(existing.optional && !req.optional)) continue;
        found.set(req.kind, {
          ...req,
          quote: sentence.length > 300 ? `${sentence.slice(0, 297)}…` : sentence,
          pageNumber: chunk.page_number,
          sourceTitle: chunk.sourceTitle,
        });
      }
    }
  }
  const order: RequirementKind[] = ["degree", "gpa", "ielts", "toefl", "pte", "duolingo", "gre", "gmat", "work_experience"];
  return order.filter((k) => found.has(k)).map((k) => found.get(k)!);
}

// ── Matching ──

export type MatchStatus = "met" | "not_met" | "unknown";

export interface RequirementCheck {
  requirement: EligibilityRequirement;
  status: MatchStatus;
  /** What the requirement says, e.g. "IELTS 6.5 overall, no band below 6.0". */
  needed: string;
  /** What the profile has, e.g. "7.0 overall, lowest band 6.5", or null if missing. */
  yours: string | null;
  /** Extra caveat, e.g. a GPA scale conversion. */
  note?: string;
}

export interface EnglishCheck {
  status: MatchStatus;
  checks: RequirementCheck[];
}

export interface EligibilityResult {
  checks: RequirementCheck[];
  /** English tests are alternatives: meeting any one of them is enough. */
  english: EnglishCheck | null;
  counts: { met: number; notMet: number; unknown: number };
  /** Requirement count, with the English alternatives counted once. */
  total: number;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ""));
/** Grades and IELTS bands read as "3.0" and "6.5", the way prospectuses write them. */
const fmt1 = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : fmt(n));

const KIND_LABELS: Record<RequirementKind, string> = {
  degree: "Prior degree",
  gpa: "GPA / grades",
  ielts: "IELTS",
  toefl: "TOEFL iBT",
  pte: "PTE Academic",
  duolingo: "Duolingo English Test",
  gre: "GRE",
  gmat: "GMAT",
  work_experience: "Work experience",
};
export const requirementLabel = (kind: RequirementKind) => KIND_LABELS[kind];

function scoreCheck(req: EligibilityRequirement, value: number | null, unit = ""): Omit<RequirementCheck, "requirement" | "needed"> {
  if (value === null) return { status: "unknown", yours: null };
  return { status: value >= req.minimum ? "met" : "not_met", yours: `${fmt(value)}${unit}` };
}

export function checkRequirement(req: EligibilityRequirement, profile: AcademicProfile): RequirementCheck {
  const p = profile;
  switch (req.kind) {
    case "degree": {
      const needed = `${DEGREE_LABELS[req.degree ?? "bachelors"]} or higher`;
      if (!p.highest_degree) return { requirement: req, needed, status: "unknown", yours: null };
      return {
        requirement: req,
        needed,
        status: DEGREE_RANK[p.highest_degree] >= req.minimum ? "met" : "not_met",
        yours: DEGREE_LABELS[p.highest_degree],
        note:
          DEGREE_RANK[p.highest_degree] < req.minimum
            ? "If you'll finish this degree before the course starts, check whether final-year students can apply."
            : undefined,
      };
    }
    case "gpa": {
      const scale = req.scale ?? 4;
      const needed = scale === 100 ? `${fmt(req.minimum)}%` : `${fmt1(req.minimum)} / ${fmt(scale)}${req.scaleAssumed ? " (scale assumed)" : ""}`;
      if (p.gpa === null || p.gpa_scale === null) return { requirement: req, needed, status: "unknown", yours: null };
      const yoursRaw = p.gpa_scale === 100 ? `${fmt(p.gpa)}%` : `${fmt1(p.gpa)} / ${fmt(p.gpa_scale)}`;
      if (p.gpa_scale === scale) {
        return { requirement: req, needed, status: p.gpa >= req.minimum ? "met" : "not_met", yours: yoursRaw };
      }
      // Different scales: a proportional conversion is only a rough guide
      const converted = (p.gpa / p.gpa_scale) * scale;
      return {
        requirement: req,
        needed,
        status: converted >= req.minimum ? "met" : "not_met",
        yours: `${yoursRaw} ≈ ${scale === 100 ? `${fmt(Math.round(converted * 10) / 10)}%` : `${fmt1(Math.round(converted * 100) / 100)} / ${fmt(scale)}`}`,
        note: "Converted proportionally between grading scales; universities often use their own conversion tables, so treat this as a rough guide.",
      };
    }
    case "ielts": {
      const needed = `${fmt1(req.minimum)} overall${req.minBand !== undefined ? `, no band below ${fmt1(req.minBand)}` : ""}`;
      if (p.ielts_overall === null) return { requirement: req, needed, status: "unknown", yours: null };
      const overallOk = p.ielts_overall >= req.minimum;
      const bandKnown = req.minBand === undefined || p.ielts_min_band !== null;
      const bandOk = req.minBand === undefined || (p.ielts_min_band !== null && p.ielts_min_band >= req.minBand);
      const yours = `${fmt1(p.ielts_overall)} overall${p.ielts_min_band !== null ? `, lowest band ${fmt1(p.ielts_min_band)}` : ""}`;
      if (!overallOk || (bandKnown && !bandOk)) return { requirement: req, needed, status: "not_met", yours };
      if (!bandKnown) return { requirement: req, needed, status: "unknown", yours, note: "Add your lowest band score to check the per-band minimum." };
      return { requirement: req, needed, status: "met", yours };
    }
    case "toefl":
      return { requirement: req, needed: `${fmt(req.minimum)} total`, ...scoreCheck(req, p.toefl_ibt) };
    case "pte":
      return { requirement: req, needed: `${fmt(req.minimum)} overall`, ...scoreCheck(req, p.pte_academic) };
    case "duolingo":
      return { requirement: req, needed: `${fmt(req.minimum)} overall`, ...scoreCheck(req, p.duolingo) };
    case "gre":
      return { requirement: req, needed: `${fmt(req.minimum)} total`, ...scoreCheck(req, p.gre_total) };
    case "gmat":
      return { requirement: req, needed: `${fmt(req.minimum)} total`, ...scoreCheck(req, p.gmat_total) };
    case "work_experience": {
      const needed = `${fmt(req.minimum)} ${req.minimum === 1 ? "year" : "years"}`;
      const v = p.work_experience_years;
      if (v === null) return { requirement: req, needed, status: "unknown", yours: null };
      return { requirement: req, needed, status: v >= req.minimum ? "met" : "not_met", yours: `${fmt(v)} ${v === 1 ? "year" : "years"}` };
    }
  }
}

/** Compares a profile with an application's requirements. */
export function matchEligibility(requirements: EligibilityRequirement[], profile: AcademicProfile | null): EligibilityResult {
  const p = profile ?? EMPTY_PROFILE;
  const all = requirements.map((r) => checkRequirement(r, p));
  const englishChecks = all.filter((c) => ENGLISH_KINDS.includes(c.requirement.kind));
  const checks = all.filter((c) => !ENGLISH_KINDS.includes(c.requirement.kind));

  let english: EnglishCheck | null = null;
  if (englishChecks.length > 0) {
    // Any one test is enough; a gap only counts once every test you have falls short
    const status: MatchStatus = englishChecks.some((c) => c.status === "met")
      ? "met"
      : englishChecks.some((c) => c.status === "not_met")
        ? "not_met"
        : "unknown";
    english = { status, checks: englishChecks };
  }

  // Optional requirements are shown but never counted as gaps
  const counted = [...checks.filter((c) => !c.requirement.optional).map((c) => c.status), ...(english ? [english.status] : [])];
  const counts = {
    met: counted.filter((s) => s === "met").length,
    notMet: counted.filter((s) => s === "not_met").length,
    unknown: counted.filter((s) => s === "unknown").length,
  };
  return { checks, english, counts, total: counted.length };
}

/** One-line verdict for lists and comparisons. */
export function eligibilitySummary(result: EligibilityResult): { label: string; tone: "good" | "bad" | "neutral" } {
  if (result.total === 0) return { label: "No measurable requirements found", tone: "neutral" };
  const { met, notMet, unknown } = result.counts;
  if (notMet > 0) return { label: `${notMet} ${notMet === 1 ? "gap" : "gaps"} · ${met} of ${result.total} met`, tone: "bad" };
  if (unknown > 0) return { label: `${met} of ${result.total} met · ${unknown} to check`, tone: "neutral" };
  return { label: `All ${result.total} requirements met`, tone: "good" };
}

// ── Profile form parsing ──

const PROFILE_LIMITS: Record<Exclude<keyof AcademicProfile, "highest_degree">, [number, number, string]> = {
  gpa: [0, 100, "GPA"],
  gpa_scale: [1, 100, "GPA scale"],
  ielts_overall: [0, 9, "IELTS overall"],
  ielts_min_band: [0, 9, "IELTS lowest band"],
  toefl_ibt: [0, 120, "TOEFL iBT"],
  pte_academic: [10, 90, "PTE Academic"],
  duolingo: [10, 160, "Duolingo"],
  gre_total: [260, 340, "GRE total"],
  gmat_total: [200, 805, "GMAT total"],
  work_experience_years: [0, 60, "Work experience"],
};
const INTEGER_FIELDS = new Set(["toefl_ibt", "pte_academic", "duolingo", "gre_total", "gmat_total"]);
/** Test scores where 0 means "not taken" (no real result is 0), so it is stored as blank. */
const TEST_FIELDS = new Set(["ielts_overall", "ielts_min_band", "toefl_ibt", "pte_academic", "duolingo", "gre_total", "gmat_total"]);

/** Validates profile form input; blank fields become null. */
export function parseAcademicProfile(input: Record<string, string | null | undefined>): { profile?: AcademicProfile; error?: string } {
  const profile: AcademicProfile = { ...EMPTY_PROFILE };

  const degree = (input.highest_degree || "").trim();
  if (degree) {
    if (!(degree in DEGREE_RANK)) return { error: "Choose your highest degree from the list." };
    profile.highest_degree = degree as DegreeLevel;
  }

  for (const [key, [lo, hi, label]] of Object.entries(PROFILE_LIMITS) as [keyof typeof PROFILE_LIMITS, [number, number, string]][]) {
    const raw = (input[key] || "").trim().replace(/,/g, ".");
    if (!raw || (TEST_FIELDS.has(key) && Number(raw) === 0)) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < lo || n > hi) return { error: `${label} must be a number between ${lo} and ${hi}.` };
    if (INTEGER_FIELDS.has(key) && !Number.isInteger(n)) return { error: `${label} must be a whole number.` };
    if ((key === "ielts_overall" || key === "ielts_min_band") && (n * 2) % 1 !== 0) {
      return { error: `${label} goes in steps of 0.5 (e.g. 6.5).` };
    }
    profile[key] = n;
  }

  if ((profile.gpa === null) !== (profile.gpa_scale === null)) {
    return { error: "Enter both your GPA and the scale it's out of (e.g. 3.4 out of 4, or 72 out of 100 for percentages)." };
  }
  if (profile.gpa !== null && profile.gpa_scale !== null && profile.gpa > profile.gpa_scale) {
    return { error: "Your GPA can't be higher than its scale." };
  }
  if (profile.ielts_min_band !== null && profile.ielts_overall === null) {
    return { error: "Add your IELTS overall score as well as your lowest band." };
  }
  return { profile };
}

/** Reads a database row (numeric columns may arrive as strings) into a profile. */
export function profileFromRow(row: Partial<Record<keyof AcademicProfile, unknown>> | null | undefined): AcademicProfile | null {
  if (!row) return null;
  const n = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
  const score = (v: unknown) => n(v) || null; // a test score of 0 means "not taken"
  const degree = typeof row.highest_degree === "string" && row.highest_degree in DEGREE_RANK ? (row.highest_degree as DegreeLevel) : null;
  return {
    highest_degree: degree,
    gpa: n(row.gpa),
    gpa_scale: n(row.gpa_scale),
    ielts_overall: score(row.ielts_overall),
    ielts_min_band: score(row.ielts_min_band),
    toefl_ibt: score(row.toefl_ibt),
    pte_academic: score(row.pte_academic),
    duolingo: score(row.duolingo),
    gre_total: score(row.gre_total),
    gmat_total: score(row.gmat_total),
    work_experience_years: n(row.work_experience_years),
  };
}

export function profileIsEmpty(p: AcademicProfile | null): boolean {
  return !p || Object.values(p).every((v) => v === null);
}
