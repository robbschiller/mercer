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

/**
 * Short-TTL verification cache: `auth.getUser()` is a network round-trip to
 * Supabase's auth server (~300–900ms observed) and it ran on EVERY matched
 * navigation. The same signed token re-verifying within a minute is pure
 * waste — cache the verified identity keyed by the session cookies.
 *
 * Trade-offs, deliberately accepted:
 * - Revocation lag ≤ TTL (a signed-out-elsewhere token stays valid here for
 *   up to 60s — same order as the RSC render it would have served anyway).
 * - Token refresh happens on the first request after a cache miss; access
 *   tokens live ~1h, so a 60s cache never blocks rotation.
 * - Only positive results are cached; sign-out changes the cookies and
 *   therefore the key.
 */
const AUTH_CACHE_TTL_MS = 60_000;
const AUTH_CACHE_MAX = 500;
type CachedUser = {
  id: string;
  email: string | null;
  name: string;
  expires: number;
};
const authCache = new Map<string, CachedUser>();

function authCacheKey(request: NextRequest): string | null {
  const parts = request.cookies
    .getAll()
    .filter((c) => c.name.startsWith("sb-"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => `${c.name}=${c.value}`);
  return parts.length > 0 ? parts.join(";") : null;
}

function displayName(meta: Record<string, unknown>): string {
  return typeof meta.full_name === "string" && meta.full_name.trim()
    ? meta.full_name.trim()
    : typeof meta.name === "string" && meta.name.trim()
      ? meta.name.trim()
      : "";
}

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

  const cacheKey = authCacheKey(request);
  const cached = cacheKey ? authCache.get(cacheKey) : undefined;
  let identity: { id: string; email: string | null; name: string } | null =
    null;

  if (cached && cached.expires > Date.now()) {
    identity = cached;
  } else {
    if (cached) authCache.delete(cacheKey!);
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
    if (user) {
      identity = {
        id: user.id,
        email: user.email ?? null,
        name: displayName(
          (user.user_metadata ?? {}) as Record<string, unknown>,
        ),
      };
      // Key by the POST-refresh cookies so the next request (which carries
      // the rotated token) hits the cache.
      const postRefreshKey =
        refreshedCookies.length > 0 ? authCacheKey(request) : cacheKey;
      if (postRefreshKey) {
        if (authCache.size >= AUTH_CACHE_MAX) {
          const oldest = authCache.keys().next().value;
          if (oldest) authCache.delete(oldest);
        }
        authCache.set(postRefreshKey, {
          ...identity,
          expires: Date.now() + AUTH_CACHE_TTL_MS,
        });
      }
    }
  }

  const { pathname } = request.nextUrl;

  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!identity && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (identity && (pathname === "/login" || pathname === "/signup")) {
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
  if (identity) {
    forwardedHeaders.set(AUTH_HEADER_USER_ID, identity.id);
    if (identity.email) {
      forwardedHeaders.set(AUTH_HEADER_USER_EMAIL, identity.email);
    }
    if (identity.name) {
      forwardedHeaders.set(AUTH_HEADER_USER_NAME, identity.name);
    }
  }

  const response = NextResponse.next({
    request: { headers: forwardedHeaders },
  });
  refreshedCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  return response;
}
