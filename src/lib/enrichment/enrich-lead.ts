/**
 * Pure enrichment pipeline for a single lead.
 *
 * Given a company name (and optionally a property name), resolves the property
 * via Google Places Text Search, then queries OpenStreetMap via Overpass for
 * building footprints. Returns a structured result that can feed the `leads`
 * enrichment worker from docs/plan.md Phase B, and is also used by
 * scripts/validate-enrichment.ts for the Day-0 pipeline validation.
 *
 * Two tuning choices in this pipeline (learned from Day-0 validation):
 *
 *  1. OSM query area comes from the Places viewport when available (a
 *     per-property bbox Google has already scoped), rather than a fixed
 *     radius circle. Falls back to a 75m radius around the point if no
 *     viewport is returned.
 *  2. Overpass filters buildings by type — apartments, residential,
 *     dormitory, generic 'yes' — and excludes garages, sheds, retail,
 *     commercial, house, school, industrial. This rejects adjacent
 *     non-multifamily buildings that used to inflate urban footprint totals.
 *
 * No I/O side effects (no DB writes, no caching) — just network calls to
 * Places + Overpass. The caller decides what to persist.
 */

import { area, polygon } from "@turf/turf";

const PLACES_TEXT_SEARCH_URL =
  "https://places.googleapis.com/v1/places:searchText";

/** 1 square meter -> square feet. */
const SQM_TO_SQFT = 10.7639;

/** Fallback radius when Places doesn't return a usable viewport. */
const FALLBACK_RADIUS_M = 75;

/**
 * Overpass building tag whitelist. Tested against a 10-property validation
 * set (Day-0 tuning, 2026-04-16):
 *   - baseline (no filter, 75m):          10% plausible
 *   - whitelist (this config, 75m):       20% plausible  ← best
 *   - Places-viewport bbox + whitelist:    0% plausible
 *   - exclude-list (75m, exclude garage/shed/...): 10% plausible
 * None cleared the 60% plausibility bar. Conclusion: OSM footprint is
 * order-of-magnitude signal only. See docs/worklog.md for full analysis.
 */
const INCLUDED_BUILDING_TAGS = ["apartments", "residential", "dormitory", "yes"];

export type EnrichLeadInput = {
  company: string;
  propertyName?: string | null;
};

export type PlacesViewport = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type PlacesResolution = {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  viewport?: PlacesViewport;
};

export type EnrichLeadResult = {
  /**
   * ok               — Places resolved AND Overpass returned footprints
   * no_places_result — Places could not find anything for the query
   * no_footprints    — Places resolved but Overpass had no buildings in area
   * error            — Network / API error (see `error`)
   */
  status: "ok" | "no_places_result" | "no_footprints" | "error";
  query: string;
  places?: PlacesResolution;
  footprintCount?: number;
  totalFootprintSqm?: number;
  totalFootprintSqft?: number;
  /** Describes which OSM query strategy was used (for debugging / logs). */
  osmQueryArea?: string;
  error?: string;
};

export type EnrichLeadOptions = {
  /** Optional Referer header — useful when apiKey is restricted to HTTP referrers. */
  referer?: string;
};

export function buildPlacesQuery(input: EnrichLeadInput): string {
  const prop = input.propertyName?.trim();
  const co = input.company.trim();
  if (prop && co) return `${prop} ${co}`;
  if (prop) return prop;
  return co;
}

export async function resolveLeadViaPlaces(
  input: EnrichLeadInput,
  apiKey: string,
  options: EnrichLeadOptions = {}
): Promise<PlacesResolution | null> {
  const query = buildPlacesQuery(input);
  if (!query) return null;
  return placesTextSearch(query, apiKey, options.referer);
}

async function placesTextSearch(
  query: string,
  apiKey: string,
  referer?: string
): Promise<PlacesResolution | null> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask":
      "places.id,places.displayName,places.formattedAddress,places.location,places.viewport",
  };
  if (referer) headers["Referer"] = referer;

  const res = await fetch(PLACES_TEXT_SEARCH_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 1,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      viewport?: {
        low?: { latitude?: number; longitude?: number };
        high?: { latitude?: number; longitude?: number };
      };
    }>;
  };

  const p = json.places?.[0];
  if (!p?.id || p.location?.latitude == null || p.location?.longitude == null) {
    return null;
  }

  let viewport: PlacesViewport | undefined;
  const lo = p.viewport?.low;
  const hi = p.viewport?.high;
  if (
    lo?.latitude != null &&
    lo?.longitude != null &&
    hi?.latitude != null &&
    hi?.longitude != null
  ) {
    viewport = {
      south: lo.latitude,
      west: lo.longitude,
      north: hi.latitude,
      east: hi.longitude,
    };
  }

  return {
    placeId: p.id,
    displayName: p.displayName?.text ?? "",
    formattedAddress: p.formattedAddress ?? "",
    latitude: p.location.latitude,
    longitude: p.location.longitude,
    viewport,
  };
}

function getOverpassUrl(): string {
  return (
    process.env.OVERPASS_API_URL?.trim() ||
    "https://overpass-api.de/api/interpreter"
  );
}

type OverpassElement = {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
};

type OverpassResponse = { elements?: OverpassElement[] };

type OsmBuilding = {
  osmWayId: number;
  buildingTag: string;
  areaSqm: number;
};

function ringToAreaSqm(geom: Array<{ lat: number; lon: number }>): number | null {
  if (geom.length < 3) return null;
  const coords: [number, number][] = geom.map((g) => [g.lon, g.lat]);
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push([first[0], first[1]]);
  if (coords.length < 4) return null;
  try {
    const sqm = area(polygon([coords]));
    return Number.isFinite(sqm) && sqm > 0 ? sqm : null;
  } catch {
    return null;
  }
}

function buildOverpassQuery(
  _viewport: PlacesViewport | undefined,
  lat: number,
  lng: number
): { query: string; area: string } {
  // NOTE on viewport: tested and rejected. Places viewports are
  // zoom-hint-sized (often multi-block) rather than property-sized. Using
  // them as Overpass bboxes pulled in MORE adjacent buildings than the fixed
  // 75m circle. Kept the field in the type so future tuning can use it with
  // other signals (Place.type, Place.addressComponents).
  const tagFilter = `"building"~"^(${INCLUDED_BUILDING_TAGS.join("|")})$"`;
  return {
    query: `
[out:json][timeout:55];
(
  way[${tagFilter}](around:${FALLBACK_RADIUS_M},${lat},${lng});
);
out geom;
`.trim(),
    area: `around(${FALLBACK_RADIUS_M}m) + multifamilyFilter`,
  };
}

const FETCH_ATTEMPTS = 3;
const FETCH_TIMEOUT_MS = 85_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchEnrichmentBuildings(
  viewport: PlacesViewport | undefined,
  lat: number,
  lng: number
): Promise<
  | { status: "ok"; buildings: OsmBuilding[]; totalSqm: number; area: string }
  | { status: "empty"; area: string }
  | { status: "error"; message: string; area: string }
> {
  const { query, area: areaDesc } = buildOverpassQuery(viewport, lat, lng);
  const url = getOverpassUrl();

  let res: Response | null = null;
  for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(t);
      if (e instanceof Error && e.name === "AbortError") {
        return { status: "error", area: areaDesc, message: "Overpass timeout" };
      }
      return {
        status: "error",
        area: areaDesc,
        message: e instanceof Error ? e.message : String(e),
      };
    }
    clearTimeout(t);

    if (res.status === 429) {
      return {
        status: "error",
        area: areaDesc,
        message: "Overpass rate limited (429)",
      };
    }
    if (res.ok) break;
    if (
      (res.status === 502 || res.status === 503 || res.status === 504) &&
      attempt < FETCH_ATTEMPTS - 1
    ) {
      await sleep(1200 * (attempt + 1));
      continue;
    }
    return {
      status: "error",
      area: areaDesc,
      message: `Overpass ${res.status}`,
    };
  }

  if (!res?.ok) {
    return { status: "error", area: areaDesc, message: "Overpass unreachable" };
  }

  const json = (await res.json()) as OverpassResponse;
  const elements = json.elements ?? [];
  const buildings: OsmBuilding[] = [];

  for (const el of elements) {
    if (el.type !== "way" || !el.tags?.building) continue;
    const sqm = ringToAreaSqm(el.geometry ?? []);
    if (sqm == null) continue;
    buildings.push({
      osmWayId: el.id,
      buildingTag: el.tags.building,
      areaSqm: sqm,
    });
  }

  buildings.sort((a, b) => b.areaSqm - a.areaSqm);

  if (buildings.length === 0) {
    return { status: "empty", area: areaDesc };
  }

  const totalSqm = buildings.reduce((s, b) => s + b.areaSqm, 0);
  return { status: "ok", buildings, totalSqm, area: areaDesc };
}

export async function enrichLead(
  input: EnrichLeadInput,
  apiKey: string,
  options: EnrichLeadOptions = {}
): Promise<EnrichLeadResult> {
  const query = buildPlacesQuery(input);
  if (!query) {
    return { status: "error", query, error: "Empty query (no company/property)" };
  }

  let place: PlacesResolution | null;
  try {
    place = await placesTextSearch(query, apiKey, options.referer);
  } catch (e) {
    return {
      status: "error",
      query,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  if (!place) {
    return { status: "no_places_result", query };
  }

  const osm = await fetchEnrichmentBuildings(
    place.viewport,
    place.latitude,
    place.longitude
  );

  if (osm.status === "error") {
    return {
      status: "error",
      query,
      places: place,
      osmQueryArea: osm.area,
      error: osm.message,
    };
  }

  if (osm.status === "empty") {
    return {
      status: "no_footprints",
      query,
      places: place,
      osmQueryArea: osm.area,
      footprintCount: 0,
      totalFootprintSqm: 0,
      totalFootprintSqft: 0,
    };
  }

  return {
    status: "ok",
    query,
    places: place,
    osmQueryArea: osm.area,
    footprintCount: osm.buildings.length,
    totalFootprintSqm: osm.totalSqm,
    totalFootprintSqft: osm.totalSqm * SQM_TO_SQFT,
  };
}
