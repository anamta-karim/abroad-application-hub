import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "@/lib/env";
import { buildIcs, type FeedEvent, type FeedEventKind } from "@/lib/ics";

/**
 * Private iCalendar feed: GET /api/calendar/<token>.ics
 *
 * Calendar apps poll this without a login session, so access is by the secret
 * token alone. The database function only returns the token owner's dates.
 */

const TOKEN_RE = /^[A-Za-z0-9_-]{32,64}$/;
const KINDS = new Set<FeedEventKind>(["deadline", "task", "document", "opening"]);

interface FeedRow {
  kind: string;
  item_id: string;
  event_date: string;
  title: string;
  detail: string | null;
  application_id: string | null;
}

function publicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  return forwardedHost ? `${proto}://${forwardedHost}` : new URL(request.url).origin;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const token = rawToken.replace(/\.ics$/i, "");

  if (!TOKEN_RE.test(token)) {
    return new NextResponse("Calendar feed not found.", { status: 404 });
  }

  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !anonKey) {
    return new NextResponse("Calendar feed is not configured.", { status: 503 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("calendar_feed_events", { feed_token: token });

  if (error) {
    const notFound = error.code === "P0002" || /invalid_feed/.test(error.message || "");
    return new NextResponse(notFound ? "Calendar feed not found." : "Calendar feed is temporarily unavailable.", {
      status: notFound ? 404 : 503,
    });
  }

  const origin = publicOrigin(request);
  const events: FeedEvent[] = ((data || []) as FeedRow[])
    .filter((r) => KINDS.has(r.kind as FeedEventKind) && r.event_date)
    .map((r) => ({
      kind: r.kind as FeedEventKind,
      itemId: r.item_id,
      date: r.event_date,
      title: r.title,
      detail: r.detail,
      url: r.application_id ? `${origin}/app/applications/${r.application_id}` : `${origin}/app`,
    }));

  const ics = buildIcs(events, { calendarName: "AbroadAtlas deadlines", host: new URL(origin).hostname });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="deadlines.ics"',
      "Cache-Control": "private, max-age=900",
      "X-Robots-Tag": "noindex",
    },
  });
}
