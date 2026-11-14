/**
 * Worldwide university search backed by the Research Organization Registry
 * (ROR) API: free, no key, HTTPS, CC0 data. https://ror.readme.io/
 */

const ROR_ENDPOINT = "https://api.ror.org/v2/organizations";

export interface UniversityResult {
  rorId: string;
  name: string;
  country: string;
  countryCode: string;
  city: string | null;
  website: string | null;
}

/** Common study destinations for the country filter (ISO 3166-1 alpha-2). */
export const STUDY_DESTINATIONS: { code: string; name: string }[] = [
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "CA", name: "Canada" },
  { code: "CN", name: "China" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IE", name: "Ireland" },
  { code: "IT", name: "Italy" },
  { code: "JP", name: "Japan" },
  { code: "MY", name: "Malaysia" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NO", name: "Norway" },
  { code: "PL", name: "Poland" },
  { code: "SG", name: "Singapore" },
  { code: "KR", name: "South Korea" },
  { code: "ES", name: "Spain" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TW", name: "Taiwan" },
  { code: "TR", name: "Turkey" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
];

interface RorName {
  value: string;
  types: string[];
  lang?: string | null;
}

interface RorOrganization {
  id: string;
  names: RorName[];
  links?: { type: string; value: string }[];
  locations?: { geonames_details?: { country_name?: string; country_code?: string; name?: string } }[];
  status?: string;
}

export function mapRorOrganization(org: RorOrganization): UniversityResult {
  const display =
    org.names.find((n) => n.types.includes("ror_display")) ||
    org.names.find((n) => n.types.includes("label")) ||
    org.names[0];
  const geo = org.locations?.[0]?.geonames_details || {};
  const website = org.links?.find((l) => l.type === "website")?.value || null;

  return {
    rorId: org.id,
    name: display?.value || "Unknown institution",
    country: geo.country_name || "",
    countryCode: geo.country_code || "",
    city: geo.name || null,
    website,
  };
}

export async function searchUniversities(query: string, countryCode?: string): Promise<UniversityResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const filters = ["types:education", "status:active"];
  if (countryCode && /^[A-Z]{2}$/.test(countryCode)) {
    filters.push(`locations.geonames_details.country_code:${countryCode}`);
  }

  const url = `${ROR_ENDPOINT}?query=${encodeURIComponent(q)}&filter=${filters.join(",")}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!res.ok) {
    throw new Error(`University search is unavailable right now (ROR returned ${res.status}).`);
  }

  const data = (await res.json()) as { items?: RorOrganization[] };
  return (data.items || []).map(mapRorOrganization);
}
