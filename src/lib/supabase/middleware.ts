import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Request headers that middleware uses to forward the Supabase-verified user
 * to Server Components without making them repeat the `auth.getUser()` RTT.
 *
 * The headers are ALWAYS stripped off the incoming request and then set
 * exclusively by middleware based on the verified user. A client cannot
 * forge them on any route covered by the middleware matcher
 * (`src/proxy.ts`). On routes NOT covered by the matcher, Server
 * Components must not trust these headers; `getSessionUser()` falls back
 * to calling `auth.getUser()` itself in that case. See
 * `src/lib/supabase/auth-cache.ts` for the matching invariant.
 */
export const AUTH_HEADER_USER_ID = "x-mercer-user-id";
export const AUTH_HEADER_USER_EMAIL = "x-mercer-user-email";
export const AUTH_HEADER_USER_NAME = "x-mercer-user-name";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/auth/callback",
  "/opengraph-image",
  "/twitter-image",
];
const PUBLIC_ROUTE_PREFIXES = ["/p/"];

export async function updateSession(request: NextRequest) {
  /**
   * Captured cookie mutations from Supabase's session-refresh path. We
   * mirror them onto the incoming `request.cookies` (so anything Supabase
   * reads later in this middleware invocation sees fresh tokens) AND we
   * replay them onto the outgoing response at the end of the function so
   * rotated tokens reach the browser.
   */
  let refreshedCookies: Array<{
    name: string;
    value: string;
    // The Supabase SSR adapter types this as a generic cookie-options bag;
    // we only pass it straight back through to `cookies.set`.
    options?: Parameters<
      ReturnType<typeof NextResponse.next>["cookies"]["set"]
    >[2];
  }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          refreshedCookies = cookiesToSet;
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  /**
   * Build forwarded request headers AFTER the `getUser()` call (and any
   * cookie-refresh it triggered) so the snapshot includes the rotated
   * Cookie header.
   *
   * Forgery guard: always `delete` the auth headers before setting, so a
   * client-sent `x-mercer-user-id` can never flow through to Server
   * Components on routes covered by the middleware matcher.
   */
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.delete(AUTH_HEADER_USER_ID);
  forwardedHeaders.delete(AUTH_HEADER_USER_EMAIL);
  forwardedHeaders.delete(AUTH_HEADER_USER_NAME);
  if (user) {
    forwardedHeaders.set(AUTH_HEADER_USER_ID, user.id);
    if (user.email) forwardedHeaders.set(AUTH_HEADER_USER_EMAIL, user.email);
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const name =
      typeof meta.full_name === "string" && meta.full_name.trim()
        ? meta.full_name.trim()
        : typeof meta.name === "string" && meta.name.trim()
          ? meta.name.trim()
          : "";
    if (name) forwardedHeaders.set(AUTH_HEADER_USER_NAME, name);
  }

  const response = NextResponse.next({
    request: { headers: forwardedHeaders },
  });
  refreshedCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  return response;
}
