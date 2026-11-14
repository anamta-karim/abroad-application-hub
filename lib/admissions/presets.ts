import { SCHOLARSHIP_CATALOG } from "@/lib/catalog/scholarships";

export interface AdmissionsMetadata {
  title: string;
  recordType: "program" | "scholarship";
  institution: string;
  country: string;
  degreeLevel: string;
  deadline: string | null;
  targetCycle: string | null;
  officialUrl: string;
  notes: string;
}

export interface ScholarshipPreset {
  id: string;
  title: string;
  institution: string;
  country: string;
  degreeLevel: string;
  recordType: "scholarship" | "program";
  officialUrl: string;
  targetCycle: string;
  notes: string;
}

/**
 * Presets for the "browse scholarships" list in the new-application form.
 * Derived from the curated catalog so there is a single source of truth.
 */
export const POPULAR_SCHOLARSHIP_PRESETS: ScholarshipPreset[] = SCHOLARSHIP_CATALOG.map((entry) => ({
  id: entry.id,
  title: entry.title,
  institution: entry.provider,
  country: entry.country,
  degreeLevel: entry.degreeLevels.join(" / "),
  recordType: entry.recordType,
  officialUrl: entry.officialUrl,
  targetCycle: "",
  notes: `${entry.funding} Typical window (past cycles): ${entry.typicalWindow} Confirm current dates on the official page.`,
}));
