import { unstable_cache } from "next/cache";
import { area } from "@turf/area";
import { polygon } from "@turf/helpers";

/** Search radius around bid center (meters). Smaller = faster Overpass responses. */
export const OSM_AROUND_RADIUS_M = 75;

export type OsmBuildingRow = {
  osmWayId: number;
  areaSqm: number;
  buildingTag: string | null;
};

export type OsmFootprintResult =
  | {
      status: "ok";
      radiusM: number;
      buildings: OsmBuildingRow[];
      totalAreaSqm: number;
    }
  | { status: "empty"; radiusM: number; message: string }
  | { status: "error"; message: string };

type OverpassElement = {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
  remark?: string;
};

function getOverpassUrl(): string {
  return (
    process.env.OVERPASS_API_URL?.trim() ||
    "https://overpass-api.de/api/interpreter"
  );
}

function buildQuery(lat: number, lng: number, radiusM: number): string {
  /* Server-side max time (seconds). Public instances can be slow on first hit. */
  return `
[out:json][timeout:55];
(
  way["building"](around:${radiusM},${lat},${lng});
);
out geom;
`.trim();
}

const FETCH_ATTEMPTS = 3;
const FETCH_TIMEOUT_MS = 85_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function shouldRetryHttpStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

function ringToPolygonAreaSqm(
  geometry: Array<{ lat: number; lon: number }>
): number | null {
  if (geometry.length < 3) return null;

  const coords: [number, number][] = geometry.map((g) => [g.lon, g.lat]);

  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push([first[0], first[1]]);
  }

  if (coords.length < 4) return null;

  try {
    const poly = polygon([coords]);
    const sqm = area(poly);
    if (!Number.isFinite(sqm) || sqm <= 0) return null;
    return sqm;
  } catch {
    return null;
  }
}

export async function fetchOverpassBuildings(
  lat: number,
  lng: number,
  radiusM: number = OSM_AROUND_RADIUS_M
): Promise<OsmFootprintResult> {
  const query = buildQuery(lat, lng, radiusM);
  const url = getOverpassUrl();

  try {
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
          next: { revalidate: 0 },
        });
      } finally {
        clearTimeout(t);
      }

      if (res.status === 429) {
        return {
          status: "error",
          message:
            "OpenStreetMap service is busy. Try again in a few minutes.",
        };
      }

      if (res.ok) {
        break;
      }

      if (
        shouldRetryHttpStatus(res.status) &&
        attempt < FETCH_ATTEMPTS - 1
      ) {
        await sleep(1200 * (attempt + 1));
        continue;
      }

      const hint =
        res.status === 504
          ? " The public map server timed out — try again, or set OVERPASS_API_URL to another Overpass instance."
          : "";

      return {
        status: "error",
        message: `Could not load map data (${res.status}).${hint}`,
      };
    }

    if (!res?.ok) {
      return {
        status: "error",
        message: "Could not load OpenStreetMap data.",
      };
    }

    const json = (await res.json()) as OverpassResponse;
    const elements = json.elements ?? [];

    const rows: OsmBuildingRow[] = [];

    for (const el of elements) {
      if (el.type !== "way" || !el.tags?.building) continue;
      const geom = el.geometry;
      if (!geom?.length) continue;

      const areaSqm = ringToPolygonAreaSqm(geom);
      if (areaSqm == null) continue;

      rows.push({
        osmWayId: el.id,
        areaSqm,
        buildingTag: el.tags.building ?? null,
      });
    }

    rows.sort((a, b) => b.areaSqm - a.areaSqm);

    if (rows.length === 0) {
      return {
        status: "empty",
        radiusM,
        message:
          "No building polygons found in OpenStreetMap for this area. Coverage varies by region.",
      };
    }

    const totalAreaSqm = rows.reduce((s, r) => s + r.areaSqm, 0);

    return {
      status: "ok",
      radiusM,
      buildings: rows,
      totalAreaSqm,
    };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return {
        status: "error",
        message: "OpenStreetMap request timed out. Try again later.",
      };
    }
    return {
      status: "error",
      message: "Could not load OpenStreetMap data.",
    };
  }
}


/**
 * Cached successful OSM reads only — failures are not cached so retries work
 * after transient 504s from public Overpass instances.
 */
export async function getCachedOsmFootprints(
  lat: number,
  lng: number
): Promise<OsmFootprintResult> {
  try {
    return await unstable_cache(
      async () => {
        const result = await fetchOverpassBuildings(lat, lng);
        if (result.status === "error") {
          throw new Error(`OSM_FETCH:${result.message}`);
        }
        return result;
      },
      ["osm-footprints", lat.toFixed(5), lng.toFixed(5)],
      { revalidate: 86400 }
    )();
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("OSM_FETCH:")) {
      return { status: "error", message: e.message.slice("OSM_FETCH:".length) };
    }
    throw e;
  }
}
