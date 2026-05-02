import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

/**
 * Narrow matcher: only run auth middleware on routes that need it.
 *
 * Previously this was a catch-all (everything except static assets), which
 * meant every request — including `/` and `/p/[slug]` — paid one
 * `supabase.auth.getUser()` network round-trip (~450ms). By restricting to
 * the protected app routes plus the two auth entry points, public pages and
 * static-ish routes skip the middleware entirely. `/login` and `/signup`
 * stay in scope so the "already logged in → /dashboard" redirect still
 * works.
 *
 * The middleware is the one place we call `auth.getUser()` — it verifies
 * the cookie against Supabase's auth server, refreshes rotated tokens, and
 * forwards the verified user id/email to downstream Server Components via
 * `AUTH_HEADER_USER_*` request headers. Server Components on matched
 * routes read those headers instead of making a second RTT; see
 * `src/lib/supabase/auth-cache.ts` for the matching invariant and the
 * forgery guard.
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leads/:path*",
    "/bids/:path*",
    "/projects/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
    "/login",
    "/signup",
  ],
};
