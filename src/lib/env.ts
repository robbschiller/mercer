/**
 * Base URL for server-side fetch and outward-facing share links.
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_APP_URL` — manual override, wins everywhere.
 * 2. On Vercel production, `VERCEL_PROJECT_PRODUCTION_URL` — the project's
 *    production domain (e.g. `usemercer.com`), not the `*.vercel.app` deploy URL.
 * 3. `VERCEL_URL` — the per-deployment `*.vercel.app` URL (used on preview deploys).
 * 4. Local dev fallback.
 */
export function getAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") {
    const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (prod) return prod.startsWith("http") ? prod : `https://${prod}`;
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return "http://localhost:3000";
}
