/**
 * Minimal Google Gemini client (REST, no SDK).
 *
 * Optional: everything in the app works without GEMINI_API_KEY; when the key
 * is set, Q&A, blueprints and URL autofill use the model for better wording.
 * The model is configurable because Google retires model versions regularly
 * (gemini-1.5-flash, which this app used before, no longer exists).
 * https://ai.google.dev/gemini-api/docs/deprecations
 */

/** Stable, cost-effective model recommended by Google for new projects (Nov 2026). */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function geminiModel(): string {
  const configured = (process.env.GEMINI_MODEL || "").trim();
  return /^[a-z0-9.\-]+$/i.test(configured) ? configured : DEFAULT_GEMINI_MODEL;
}

export function isGeminiConfigured(): boolean {
  return Boolean((process.env.GEMINI_API_KEY || "").trim());
}

export interface GeminiRequest {
  system?: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Ask for a JSON response (application/json). */
  json?: boolean;
  timeoutMs?: number;
}

/** Builds the generateContent request body (exported for tests). */
export function buildGeminiBody(req: GeminiRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: req.prompt }] }],
    generationConfig: {
      temperature: req.temperature ?? 0.2,
      maxOutputTokens: req.maxOutputTokens ?? 1200,
      ...(req.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (req.system) {
    body.systemInstruction = { parts: [{ text: req.system }] };
  }
  return body;
}

/** Joins the text parts of the first candidate (exported for tests). */
export function readGeminiText(data: unknown): string | null {
  const parts = (data as any)?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts
    .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
    .join("")
    .trim();
  return text || null;
}

/**
 * Calls Gemini and returns the generated text, or null on any failure
 * (no key, HTTP error, safety block, timeout). Failures are logged
 * server-side so a bad key or retired model shows up in deployment logs.
 */
export async function generateWithGemini(req: GeminiRequest): Promise<string | null> {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;

  const model = geminiModel();
  try {
    const res = await fetch(`${API_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(buildGeminiBody(req)),
      signal: AbortSignal.timeout(req.timeoutMs ?? 20000),
    });

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      console.warn(`[gemini] ${model} returned HTTP ${res.status}: ${detail}`);
      return null;
    }

    const text = readGeminiText(await res.json());
    if (!text) console.warn(`[gemini] ${model} returned no text (possibly blocked by safety filters)`);
    return text;
  } catch (err: any) {
    console.warn(`[gemini] ${model} request failed: ${err?.name || "Error"} ${err?.message || ""}`);
    return null;
  }
}

/** Like generateWithGemini but parses a JSON response; null if missing or invalid. */
export async function generateJsonWithGemini<T>(req: Omit<GeminiRequest, "json">): Promise<T | null> {
  const text = await generateWithGemini({ ...req, json: true });
  if (!text) return null;
  try {
    // Models occasionally wrap JSON in a ```json fence despite the mime type
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")) as T;
  } catch {
    console.warn("[gemini] response was not valid JSON");
    return null;
  }
}
