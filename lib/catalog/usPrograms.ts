/**
 * US degree programs from the U.S. Department of Education College Scorecard
 * API (free; https://collegescorecard.ed.gov/data/api-documentation/).
 *
 * Set COLLEGE_SCORECARD_API_KEY (free from https://api.data.gov/signup/).
 * Without it the shared DEMO_KEY is used, which is heavily rate limited.
 */

const SCORECARD_ENDPOINT = "https://api.data.gov/ed/collegescorecard/v1/schools";

export interface UsProgram {
  title: string;
  credential: string;
  degreeLevel: string;
}

export interface UsSchoolResult {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  website: string | null;
  programs: UsProgram[];
}

/** Scorecard credential levels -> the degree labels used in the app. */
const CREDENTIAL_LEVELS: Record<number, string> = {
  1: "Undergraduate Certificate",
  2: "Associate",
  3: "Bachelor's",
  4: "Post-baccalaureate Certificate",
  5: "Master's",
  6: "PhD",
  7: "Professional Degree",
  8: "Graduate Certificate",
};

interface ScorecardProgram {
  title?: string;
  credential?: { level?: number; title?: string };
}

export function normalizeWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function mapScorecardSchool(raw: Record<string, unknown>): UsSchoolResult {
  const programsRaw = (raw["latest.programs.cip_4_digit"] as ScorecardProgram[] | undefined) || [];
  const seen = new Set<string>();
  const programs: UsProgram[] = [];

  for (const p of programsRaw) {
    const title = (p.title || "").trim().replace(/\.$/, "");
    const level = p.credential?.level ?? 0;
    if (!title) continue;
    const key = `${title}|${level}`;
    if (seen.has(key)) continue;
    seen.add(key);
    programs.push({
      title,
      credential: p.credential?.title || CREDENTIAL_LEVELS[level] || "Degree",
      degreeLevel: CREDENTIAL_LEVELS[level] || p.credential?.title || "",
    });
  }

  // Graduate degrees first (most users of this app are going abroad for postgrad), then A-Z
  const levelRank = (d: string) => (d === "Master's" ? 0 : d === "PhD" ? 1 : d === "Bachelor's" ? 2 : 3);
  programs.sort((a, b) => levelRank(a.degreeLevel) - levelRank(b.degreeLevel) || a.title.localeCompare(b.title));

  return {
    id: Number(raw["id"]),
    name: String(raw["school.name"] || "Unknown school"),
    city: (raw["school.city"] as string) || null,
    state: (raw["school.state"] as string) || null,
    website: normalizeWebsite(raw["school.school_url"] as string | undefined),
    programs,
  };
}

export function filterPrograms(programs: UsProgram[], programQuery?: string, degreeLevel?: string): UsProgram[] {
  const words = (programQuery || "").toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
  return programs.filter((p) => {
    if (degreeLevel && p.degreeLevel !== degreeLevel) return false;
    const t = p.title.toLowerCase();
    return words.every((w) => t.includes(w));
  });
}

export async function searchUsSchools(schoolName: string): Promise<UsSchoolResult[]> {
  const name = schoolName.trim();
  if (name.length < 2) return [];

  const apiKey = process.env.COLLEGE_SCORECARD_API_KEY || "DEMO_KEY";
  const fields = [
    "id",
    "school.name",
    "school.city",
    "school.state",
    "school.school_url",
    "latest.programs.cip_4_digit.title",
    "latest.programs.cip_4_digit.credential.level",
    "latest.programs.cip_4_digit.credential.title",
  ].join(",");

  const url =
    `${SCORECARD_ENDPOINT}?api_key=${encodeURIComponent(apiKey)}` +
    `&school.name=${encodeURIComponent(name)}&school.operating=1&fields=${fields}&per_page=5`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 60 * 60 * 24 },
  });

  if (res.status === 429) {
    throw new Error(
      "The US program search hit its rate limit. Add a free COLLEGE_SCORECARD_API_KEY from api.data.gov to raise it."
    );
  }
  if (!res.ok) {
    throw new Error(`US program search is unavailable right now (College Scorecard returned ${res.status}).`);
  }

  const data = (await res.json()) as { results?: Record<string, unknown>[] };
  return (data.results || []).map(mapScorecardSchool);
}
