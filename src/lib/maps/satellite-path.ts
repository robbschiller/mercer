/** Relative URL to `/api/maps/satellite` proxy (matches Static API route limits). */

export const SATELLITE_UI_DEFAULTS = { w: 600, h: 360, zoom: 18 } as const;
export const SATELLITE_PDF_DEFAULTS = { w: 640, h: 400, zoom: 18 } as const;

function isFiniteCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function buildSatelliteProxyPath(
  lat: number | null | undefined,
  lng: number | null | undefined,
  options?: { w?: number; h?: number; zoom?: number }
): string | null {
  if (lat == null || lng == null) return null;
  const la = Number(lat);
  const ln = Number(lng);
  if (!isFiniteCoord(la, ln)) return null;

  const w = options?.w ?? SATELLITE_UI_DEFAULTS.w;
  const h = options?.h ?? SATELLITE_UI_DEFAULTS.h;
  const zoom = options?.zoom ?? SATELLITE_UI_DEFAULTS.zoom;

  const params = new URLSearchParams({
    lat: String(la),
    lng: String(ln),
    w: String(w),
    h: String(h),
    zoom: String(zoom),
  });

  return `/api/maps/satellite?${params.toString()}`;
}
