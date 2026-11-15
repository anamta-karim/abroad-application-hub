import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildBlueprint,
  buildBlueprintPrompt,
  resolveEvidenceMarkers,
  findLengthLimit,
  findLetterCount,
  focusAreas,
  type BlueprintChunk,
  type BlueprintInput,
} from "@/lib/rag/blueprint";
import {
  buildGeminiBody,
  readGeminiText,
  geminiModel,
  generateWithGemini,
  generateJsonWithGemini,
  DEFAULT_GEMINI_MODEL,
} from "@/lib/ai/gemini";

const chunk = (id: string, page: number, heading: string, content: string): BlueprintChunk => ({
  id,
  sourceId: "src-1",
  sourceTitle: "MSc Data Science Prospectus",
  pageNumber: page,
  sectionHeading: heading,
  content,
});

const chunks = [
  chunk("c1", 1, "Machine Learning Track", "Applications close on 15 January 2027. Applicants need a bachelor's degree with a minimum GPA of 3.0."),
  chunk(
    "c2",
    2,
    "Application Requirements",
    "Your statement of purpose must not exceed 1,000 words and should explain your research interests. Two letters of recommendation must be submitted directly by referees through the online portal. Shortlisted applicants are invited to a 20-minute interview with a faculty panel."
  ),
  chunk("c3", 3, "Curriculum", "The first year covers core modules in statistics and machine learning. The second year is dedicated to a research thesis. Professional experience is valued."),
];

const base: BlueprintInput = {
  app: {
    title: "MSc Data Science",
    record_type: "program",
    institution_or_provider: "University of Example",
    country: "Netherlands",
    degree_level: "Master's",
    field_of_study: "Data Science",
    study_period: "Fall 2027",
    deadline: "2027-01-15",
    duration_years: 2,
  },
  facts: [
    { fact_type: "eligibility", label: "Academic Entry Requirements", value: { extractedValue: "Minimum GPA of 3.0" }, review_state: "confirmed" },
  ],
  requirements: [{ document_type: "Letters of Recommendation", status: "in_progress" }],
  chunks,
  today: "2026-11-15",
};

describe("Requirement extractors", () => {
  it("finds word limits, letter counts and program focus areas", () => {
    expect(findLengthLimit(chunks, /statement|essay/i)?.limit).toBe("1,000 words");
    expect(findLetterCount(chunks)?.count).toBe(2);
    expect(focusAreas(chunks)).toEqual(["Machine Learning Track"]);
  });
});

describe("Application-specific blueprints", () => {
  it("SOP blueprint quotes this program's limits and names it throughout", () => {
    const r = buildBlueprint("sop", base);
    expect(r.isAbstention).toBe(false);
    expect(r.answer).toContain("### Statement of purpose: MSc Data Science (University of Example)");
    expect(r.answer).toContain("**Length limit: 1,000 words**");
    expect(r.answer).toContain("(MSc Data Science Prospectus, p. 2)");
    expect(r.answer).toContain("Minimum GPA of 3.0");
    expect(r.answer).toContain("*Machine Learning Track*");
    expect(r.answer).toContain("why the Netherlands");
    // Dated milestones counted back from the 15 Jan 2027 deadline
    expect(r.answer).toMatch(/First full draft by \w{3}, Dec 4\b/);
    expect(r.answer).toContain("Deadline: Fri, Jan 15, 2027");
    expect(r.answer).not.toContain("*Application Requirements*");
    expect(r.citations.some((c) => c.pageNumber === 2)).toBe(true);
  });

  it("LOR blueprint states the required count, submission method and checklist status", () => {
    const r = buildBlueprint("lor", base);
    expect(r.answer).toContain("**2 letters required**");
    expect(r.answer).toMatch(/online portal/);
    expect(r.answer).toContain("**in progress**");
    expect(r.answer).toContain("a manager who can describe your impact");
    expect(r.answer).not.toContain("Not found in your sources");
  });

  it("interview blueprint uses the sources' selection details and this application's facts", () => {
    const r = buildBlueprint("interview", base);
    expect(r.answer).toContain("20-minute interview with a faculty panel");
    expect(r.answer).toContain("Minimum GPA of 3.0");
  });

  it("study plan blueprint reflects modules, thesis and duration", () => {
    const r = buildBlueprint("study_plan", base);
    expect(r.answer).toContain("core modules in statistics");
    expect(r.answer).toContain("**Thesis or dissertation:**");
    expect(r.answer).toContain("2 years");
  });

  it("puts every heading in its own paragraph so the viewer renders it as a heading", () => {
    const r = buildBlueprint("sop", base);
    for (const para of r.answer.split("\n\n")) {
      if (para.startsWith("#")) expect(para.includes("\n")).toBe(false);
    }
    expect(r.answer).toContain("#### Eligibility your statement should make obvious\n\n• Minimum GPA of 3.0");
  });

  it("ignores program-title headings as focus areas", () => {
    const withTitle = [chunk("t1", 1, "MSc Data Science — 2027 Entry", "Welcome to the programme."), ...chunks];
    expect(focusAreas(withTitle)).toEqual(["Machine Learning Track"]);
  });

  it("lists what the sources don't say instead of inventing it", () => {
    const sparse = { ...base, chunks: [chunk("c9", 1, "Overview", "The program is taught in English over two years at the main campus.")], requirements: [] };
    const r = buildBlueprint("lor", sparse);
    expect(r.answer).toContain("#### Not found in your sources");
    expect(r.answer).toContain("How many letters are required");
    expect(r.answer).not.toMatch(/\*\*\d letters? required\*\*/);
  });

  it("abstains when the application has no sources, facts or checklist", () => {
    const r = buildBlueprint("sop", { ...base, chunks: [], facts: [], requirements: [] });
    expect(r.isAbstention).toBe(true);
    expect(r.answer).toContain("Add the program's admissions webpage or prospectus PDF");
  });

  it("two different applications get different blueprints", () => {
    const other = buildBlueprint("sop", {
      ...base,
      app: { ...base.app, title: "Chevening Scholarship", record_type: "scholarship", institution_or_provider: "FCDO", country: "United Kingdom" },
      facts: [{ fact_type: "funding", label: "Coverage", value: { extractedValue: "Full tuition and a monthly stipend" }, review_state: "confirmed" }],
    });
    const first = buildBlueprint("sop", base);
    expect(other.answer).not.toBe(first.answer);
    expect(other.answer).toContain("Chevening Scholarship (FCDO)");
    expect(other.answer).toContain("#### What this award funds");
  });
});

describe("AI prompt and evidence markers", () => {
  it("gives the model numbered evidence and strict grounding rules", () => {
    const built = buildBlueprint("sop", base);
    const { system, prompt } = buildBlueprintPrompt("sop", base, built.evidence);
    expect(system).toContain("Never invent requirements");
    expect(prompt).toContain("Title: MSc Data Science");
    expect(prompt).toMatch(/\[E1\] \(MSc Data Science Prospectus, p\. \d/);
    expect(prompt).toContain("[eligibility, confirmed] Academic Entry Requirements: Minimum GPA of 3.0");
  });

  it("turns (E1) markers into readable source and page labels", () => {
    const built = buildBlueprint("sop", base);
    const text = resolveEvidenceMarkers("Keep it under the limit (E1). See also (E1, E2).", built.evidence);
    expect(text).not.toMatch(/\(E\d/);
    expect(text).toContain("(MSc Data Science Prospectus, p. 2)");
  });
});

describe("Gemini client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("defaults to a current model and validates overrides", () => {
    expect(DEFAULT_GEMINI_MODEL).not.toContain("1.5");
    vi.stubEnv("GEMINI_MODEL", "gemini-3.6-flash");
    expect(geminiModel()).toBe("gemini-3.6-flash");
    vi.stubEnv("GEMINI_MODEL", "bad model/../x");
    expect(geminiModel()).toBe(DEFAULT_GEMINI_MODEL);
  });

  it("builds a request with system instruction and JSON mode", () => {
    const body: any = buildGeminiBody({ system: "S", prompt: "P", json: true, temperature: 0.1 });
    expect(body.systemInstruction.parts[0].text).toBe("S");
    expect(body.contents[0].parts[0].text).toBe("P");
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });

  it("reads multi-part responses", () => {
    expect(readGeminiText({ candidates: [{ content: { parts: [{ text: "Hello " }, { text: "world" }] } }] })).toBe("Hello world");
    expect(readGeminiText({ candidates: [] })).toBeNull();
  });

  it("sends the key in a header (not the URL) and returns null without a key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(await generateWithGemini({ prompt: "x" })).toBeNull();

    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "");
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '```json\n{"title":"MSc"}\n```' }] } }] }))
    );
    vi.stubGlobal("fetch", fetchMock);

    const parsed = await generateJsonWithGemini<{ title: string }>({ prompt: "x" });
    expect(parsed).toEqual({ title: "MSc" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(`/models/${DEFAULT_GEMINI_MODEL}:generateContent`);
    expect(url).not.toContain("test-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
  });

  it("returns null (and logs) on HTTP errors", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("model not found", { status: 404 })));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await generateWithGemini({ prompt: "x" })).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("HTTP 404"));
    warn.mockRestore();
  });
});
