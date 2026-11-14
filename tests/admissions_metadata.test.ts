import { describe, it, expect } from "vitest";
import {
  extractMetadataFromHtml,
  POPULAR_SCHOLARSHIP_PRESETS,
} from "@/lib/ingestion/metadataExtractor";

describe("Admissions Metadata & Autofill Extractor", () => {
  it("extracts title, scholarship type, institution, and country from HTML", () => {
    const sampleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>DAAD Helmut-Schmidt Scholarship 2026 - Master's in Public Policy</title>
          <meta property="og:title" content="DAAD Helmut-Schmidt Fellowship 2026 | Study in Germany" />
          <meta name="description" content="Full scholarship covering monthly stipend of 934 Euros, travel allowance, and health insurance." />
        </head>
        <body>
          <h1>DAAD Helmut-Schmidt Fellowship 2026</h1>
          <p>The German Academic Exchange Service invites international graduates to apply for Master's programs.</p>
          <p>Application deadline: 31 July 2026 for Winter Intake 2026/2027.</p>
        </body>
      </html>
    `;

    const meta = extractMetadataFromHtml(sampleHtml, "https://www.daad.de/en/study-and-research-in-germany/");

    expect(meta.title).toContain("DAAD Helmut-Schmidt Fellowship 2026");
    expect(meta.recordType).toBe("scholarship");
    expect(meta.country).toBe("Germany");
    expect(meta.degreeLevel).toBe("Master's");
    expect(meta.deadline).toBe("2026-07-31");
    expect(meta.targetCycle).toContain("2026/2027");
    expect(meta.notes).toContain("monthly stipend");
  });

  it("extracts university degree program details with ISO deadline", () => {
    const sampleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>MSc Advanced Computer Science - University of Oxford</title>
          <meta name="description" content="A full-time, 12-month taught course designed for high-calibre computer science graduates." />
        </head>
        <body>
          <h1>MSc in Advanced Computer Science</h1>
          <p>Applications close 15 January 2026 for the 2026/2027 academic year.</p>
        </body>
      </html>
    `;

    const meta = extractMetadataFromHtml(sampleHtml, "https://www.ox.ac.uk/admissions/graduate/courses/msc-advanced-computer-science");

    expect(meta.title).toContain("MSc Advanced Computer Science");
    expect(meta.recordType).toBe("program");
    expect(meta.country).toBe("United Kingdom");
    expect(meta.degreeLevel).toBe("Master's");
    expect(meta.deadline).toBe("2026-01-15");
  });

  it("extracts PhD doctorate level correctly", () => {
    const sampleHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PhD in Quantum Computing - University of Cambridge</title>
        </head>
        <body>
          <h1>Doctoral Programme in Quantum Information</h1>
          <p>The closing date for applications is 03 December 2025.</p>
        </body>
      </html>
    `;

    const meta = extractMetadataFromHtml(sampleHtml, "https://www.cam.ac.uk/courses/phd-quantum");
    expect(meta.degreeLevel).toBe("PhD");
    expect(meta.deadline).toBe("2025-12-03");
  });

  it("provides comprehensive preset scholarships for 1-click import", () => {
    expect(POPULAR_SCHOLARSHIP_PRESETS.length).toBeGreaterThanOrEqual(8);
    const chevening = POPULAR_SCHOLARSHIP_PRESETS.find((p) => p.id === "chevening");
    expect(chevening).toBeDefined();
    expect(chevening?.country).toBe("United Kingdom");
    expect(chevening?.officialUrl).toContain("chevening.org");

    const erasmus = POPULAR_SCHOLARSHIP_PRESETS.find((p) => p.id === "erasmus-mundus");
    expect(erasmus).toBeDefined();
    expect(erasmus?.degreeLevel).toBe("Master's");
  });
});
