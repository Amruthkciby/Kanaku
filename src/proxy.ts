import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // /sw.js must never be redirected -- a service worker script fetched via a 3xx response
    // fails registration outright, regardless of auth state. /api/* handles its own auth and
    // must return JSON on failure, not an HTML login page (a redirect there would silently
    // resolve as res.ok on the client, since fetch follows redirects to the 200 login page).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sw.js|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
