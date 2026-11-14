import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchAndExtractAdmissionsMetadata,
  POPULAR_SCHOLARSHIP_PRESETS,
} from "@/lib/ingestion/metadataExtractor";

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

  try {
    const metadata = await fetchAndExtractAdmissionsMetadata(urlParam);
    return NextResponse.json({ success: true, data: metadata });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to fetch or extract metadata from URL.",
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

    const metadata = await fetchAndExtractAdmissionsMetadata(url);
    return NextResponse.json({ success: true, data: metadata });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to process admissions URL.",
      },
      { status: 400 }
    );
  }
}
