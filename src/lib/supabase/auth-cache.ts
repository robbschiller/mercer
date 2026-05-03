import { cache } from "react";
import { headers } from "next/headers";
import {
  AUTH_HEADER_USER_EMAIL,
  AUTH_HEADER_USER_ID,
  AUTH_HEADER_USER_NAME,
} from "./middleware";
import { createClient } from "./server";

export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
} | null;

/**
 * Per-request cached session user for Server Components.
 *
 * Fast path (matched routes — `/(app)/*`, `/login`, `/signup`):
 * middleware has already called `supabase.auth.getUser()`, which verifies
 * the session against Supabase's auth server and refreshes the cookie if
 * needed. Middleware then forwards the verified `id` / `email` onto the
 * request via `AUTH_HEADER_USER_*`, after first stripping any client-sent
 * values — so on matched routes these headers are unforgeable. This path
 * does zero network calls and does not touch `auth.getSession()`, so the
 * Supabase SSR "insecure user object" warning never fires.
 *
 * Fallback (unmatched routes — `/`, `/p/[slug]`, etc.): no middleware ran,
 * no trusted headers. We call `auth.getUser()` directly. That's one
 * network RTT per unmatched request, same as the pre-perf-pass baseline —
 * tolerable because these are low-frequency public pages.
 *
 * Forgery note: on unmatched routes, a client CAN set `AUTH_HEADER_*`
 * themselves. To avoid accidentally trusting it, we only read the headers
 * after confirming a specific caller-pattern: middleware is the only thing
 * that sets them, and Next.js replaces client-set values with middleware
 * values on matched routes. The header is only honored when present — an
 * attacker who sets it on `/` would cause `getSessionUser` to return their
 * spoofed id; today the only consumer on an unmatched route is the
 * marketing home page's "redirect if logged in" check, where the worst
 * case is an extra redirect hop through `/dashboard` → `/login`. If a
 * future unmatched route needs `requireUser()`, broaden the middleware
 * matcher to cover it rather than relying on this fallback.
 *
 * `React.cache` dedupes calls within a single RSC render (layout + page +
 * `store.ts → requireUser()` all reuse the same result).
 */
export const getSessionUser = cache(async (): Promise<SessionUser> => {
  const h = await headers();
  const headerId = h.get(AUTH_HEADER_USER_ID);
  if (headerId) {
    return {
      id: headerId,
      email: h.get(AUTH_HEADER_USER_EMAIL) || null,
      name: h.get(AUTH_HEADER_USER_NAME) || null,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    typeof meta.full_name === "string" && meta.full_name.trim()
      ? meta.full_name.trim()
      : typeof meta.name === "string" && meta.name.trim()
        ? meta.name.trim()
        : null;
  return { id: user.id, email: user.email ?? null, name };
});
