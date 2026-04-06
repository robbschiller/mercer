import { getAppOrigin } from "@/lib/env";
import type { Bid } from "@/lib/store";
import {
  buildSatelliteProxyPath,
  SATELLITE_PDF_DEFAULTS,
} from "./satellite-path";

/**
 * Loads the proxied satellite image for server-side PDF generation.
 * Returns a data URI for @react-pdf/renderer Image, or null if unavailable.
 */
export async function fetchSatelliteImageDataUriForPdf(
  bid: Pick<Bid, "latitude" | "longitude" | "satelliteImageUrl">
): Promise<string | null> {
  if (!process.env.GOOGLE_MAPS_STATIC_API_KEY?.trim()) return null;

  const relativePath =
    buildSatelliteProxyPath(
      bid.latitude,
      bid.longitude,
      SATELLITE_PDF_DEFAULTS
    ) ?? bid.satelliteImageUrl;
  if (!relativePath) return null;

  try {
    const origin = getAppOrigin();
    const res = await fetch(new URL(relativePath, origin));
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = ct.split(";")[0].trim();
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
