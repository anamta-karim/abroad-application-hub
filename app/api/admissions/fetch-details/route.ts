import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeUsage, limitReachedMessage } from "@/lib/usage";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import {
  fetchAndExtractAdmissionsMetadata,
  POPULAR_SCHOLARSHIP_PRESETS,
} from "@/lib/ingestion/metadataExtractor";
import { errorMessage } from "@/lib/errors";

/**
 * Only signed-in users may use this route: it makes the server fetch an
 * arbitrary public URL, so leaving it open would turn it into a free proxy.
 */
async function requireUser(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required." },
      { status: 401 }
    );
  }
  return null;
}

/**
 * Counts one web fetch against the user's daily limit (and one AI use if the
 * model will refine the result). Returns an error response when over the limit.
 */
async function claimFetch(): Promise<{ error: NextResponse } | { useAi: boolean }> {
  const supabase = await createClient();
  const fetchUsage = await consumeUsage(supabase, "fetch");
  if (!fetchUsage.allowed) {
    return {
      error: NextResponse.json({ success: false, error: limitReachedMessage("fetch", fetchUsage.limit) }, { status: 429 }),
    };
  }
  const useAi = isGeminiConfigured() ? (await consumeUsage(supabase, "ai")).allowed : false;
  return { useAi };
}

export async function GET(request: NextRequest) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get("url");
  const presetParam = searchParams.get("preset");

  // If requesting preset list
  if (presetParam === "list") {
    return NextResponse.json({
      success: true,
      data: POPULAR_SCHOLARSHIP_PRESETS,
    });
  }

  if (!urlParam) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required parameter 'url'. Example: /api/admissions/fetch-details?url=https://...",
      },
      { status: 400 }
    );
  }

  const claim = await claimFetch();
  if ("error" in claim) return claim.error;

  try {
    const metadata = await fetchAndExtractAdmissionsMetadata(urlParam, { useAi: claim.useAi });
    return NextResponse.json({ success: true, data: metadata });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: errorMessage(err) || "Failed to fetch or extract metadata from URL.",
      },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireUser();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const url = body?.url?.trim();

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid 'url' in the request body." },
        { status: 400 }
      );
    }

    const claim = await claimFetch();
    if ("error" in claim) return claim.error;

    const metadata = await fetchAndExtractAdmissionsMetadata(url, { useAi: claim.useAi });
    return NextResponse.json({ success: true, data: metadata });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: errorMessage(err) || "Failed to process admissions URL.",
      },
      { status: 400 }
    );
  }
}
