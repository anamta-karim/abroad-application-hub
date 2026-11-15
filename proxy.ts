import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 proxy (formerly middleware): refreshes the Supabase session on
 * every request and guards the /app routes. Runs on the Node.js runtime, in
 * the same region as the server functions (next to the database).
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - image files, the web app manifest and generated icons
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon/|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
