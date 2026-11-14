import { describe, it, expect } from "vitest";
import {
  SCHOLARSHIP_CATALOG,
  searchCatalog,
  nextOpeningDate,
  getCatalogEntry,
} from "@/lib/catalog/scholarships";
import { POPULAR_SCHOLARSHIP_PRESETS } from "@/lib/admissions/presets";
import { mapRorOrganization } from "@/lib/catalog/universities";
import { mapScorecardSchool, filterPrograms, normalizeWebsite } from "@/lib/catalog/usPrograms";

describe("Curated scholarship catalog", () => {
  it("has unique ids and https official URLs", () => {
    const ids = SCHOLARSHIP_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of SCHOLARSHIP_CATALOG) {
      expect(e.officialUrl, e.id).toMatch(/^https:\/\//);
      expect(e.degreeLevels.length, e.id).toBeGreaterThan(0);
      if (e.typicalOpenMonth !== null) {
        expect(e.typicalOpenMonth).toBeGreaterThanOrEqual(1);
        expect(e.typicalOpenMonth).toBeLessThanOrEqual(12);
      }
    }
  });

  it("is the single source for the new-application presets", () => {
    expect(POPULAR_SCHOLARSHIP_PRESETS.length).toBe(SCHOLARSHIP_CATALOG.length);
    expect(POPULAR_SCHOLARSHIP_PRESETS.find((p) => p.id === "gks")?.title).toBe(getCatalogEntry("gks")?.title);
  });

  it("returns everything for an empty search", () => {
    expect(searchCatalog().length).toBe(SCHOLARSHIP_CATALOG.length);
  });

  it("requires every query word to match and ranks title matches first", () => {
    const results = searchCatalog({ query: "korea" });
    expect(results[0].id).toBe("gks");
    expect(searchCatalog({ query: "korea zzzz-nonexistent" })).toHaveLength(0);
  });

  it("filters by country and degree level", () => {
    const uk = searchCatalog({ country: "United Kingdom" });
    expect(uk.length).toBeGreaterThan(0);
    expect(uk.every((e) => e.country === "United Kingdom")).toBe(true);

    const bachelors = searchCatalog({ degreeLevel: "Bachelor's" });
    expect(bachelors.every((e) => e.degreeLevels.includes("Bachelor's"))).toBe(true);
    expect(bachelors.find((e) => e.id === "chevening")).toBeUndefined();
  });
});

describe("nextOpeningDate", () => {
  const nov14 = new Date(2026, 10, 14); // 14 Nov 2026 (local)

  it("uses this year when the month is still ahead", () => {
    expect(nextOpeningDate(12, nov14)).toBe("2026-12-01");
  });

  it("rolls over to next year when the month has passed", () => {
    expect(nextOpeningDate(8, nov14)).toBe("2027-08-01");
  });

  it("is due today when the call usually opens this month", () => {
    expect(nextOpeningDate(11, nov14)).toBe("2026-11-14");
  });
});

describe("ROR university mapping", () => {
  it("uses the display name, country, city and website", () => {
    const mapped = mapRorOrganization({
      id: "https://ror.org/04h9pn542",
      names: [
        { value: "SNU", types: ["acronym"] },
        { value: "Seoul National University", types: ["ror_display", "label"] },
      ],
      links: [
        { type: "wikipedia", value: "http://en.wikipedia.org/wiki/Seoul_National_University" },
        { type: "website", value: "https://www.snu.ac.kr" },
      ],
      locations: [{ geonames_details: { country_name: "South Korea", country_code: "KR", name: "Seoul" } }],
    });
    expect(mapped).toEqual({
      rorId: "https://ror.org/04h9pn542",
      name: "Seoul National University",
      country: "South Korea",
      countryCode: "KR",
      city: "Seoul",
      website: "https://www.snu.ac.kr",
    });
  });
});

describe("College Scorecard mapping", () => {
  const school = mapScorecardSchool({
    id: 211440,
    "school.name": "Carnegie Mellon University",
    "school.city": "Pittsburgh",
    "school.state": "PA",
    "school.school_url": "www.cmu.edu/",
    "latest.programs.cip_4_digit": [
      { title: "Architecture.", credential: { level: 3, title: "Bachelor's Degree" } },
      { title: "Computer Science.", credential: { level: 5, title: "Master's Degree" } },
      { title: "Computer Science.", credential: { level: 5, title: "Master's Degree" } },
      { title: "Computer Science.", credential: { level: 6, title: "Doctoral Degree" } },
    ],
  });

  it("normalizes titles, de-duplicates, and lists graduate programs first", () => {
    expect(school.website).toBe("https://www.cmu.edu/");
    expect(school.programs.map((p) => `${p.title}|${p.degreeLevel}`)).toEqual([
      "Computer Science|Master's",
      "Computer Science|PhD",
      "Architecture|Bachelor's",
    ]);
  });

  it("filters programs by keyword and level", () => {
    expect(filterPrograms(school.programs, "computer", "PhD")).toHaveLength(1);
    expect(filterPrograms(school.programs, "architecture")).toHaveLength(1);
    expect(filterPrograms(school.programs, "biology")).toHaveLength(0);
  });

  it("normalizes school websites", () => {
    expect(normalizeWebsite("www.mit.edu")).toBe("https://www.mit.edu");
    expect(normalizeWebsite("http://x.edu")).toBe("http://x.edu");
    expect(normalizeWebsite("")).toBeNull();
  });
});
