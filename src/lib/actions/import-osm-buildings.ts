"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getCachedOsmFootprints } from "@/lib/osm/overpass";
import { createBuilding, createSurface, getBid } from "@/lib/store";

const SQFT_PER_SQM = 10.7639;
/** Two-story walk-up default; the reviewer corrects height per type. */
const DEFAULT_WALL_HEIGHT_FT = 22;

/**
 * Aerial takeoff assist: turn OSM footprints into buildings + wall-surface
 * estimates in one tap. Footprints cluster by similar area into "types"
 * (Type 1 ×3 — exactly how estimators annotate aerials); each type gets a
 * building row with a perimeter×height wall surface the reviewer refines.
 *
 * Perimeter is estimated from footprint area assuming an elongated
 * multifamily plan (~2.5:1): A = 2.5w², P = 7w. Explicitly an estimate —
 * every generated surface is named as one.
 */
export async function importOsmBuildingsAction(data: {
  bidId: string;
}): Promise<{ created: number; error: string | null }> {
  const bid = await getBid(data.bidId);
  if (!bid) return { created: 0, error: "Opportunity not found." };
  if (bid.latitude == null || bid.longitude == null) {
    return { created: 0, error: "This opportunity has no map coordinates." };
  }

  const result = await getCachedOsmFootprints(
    Number(bid.latitude),
    Number(bid.longitude),
  );
  if (result.status !== "ok") {
    return {
      created: 0,
      error:
        result.status === "empty"
          ? "No footprints found near the pin."
          : result.message,
    };
  }

  // Cluster by area (±15%) into building types, largest types first.
  const sorted = [...result.buildings].sort((a, b) => b.areaSqm - a.areaSqm);
  const clusters: { areaSqm: number; count: number }[] = [];
  for (const b of sorted) {
    const hit = clusters.find(
      (c) => Math.abs(c.areaSqm - b.areaSqm) / c.areaSqm <= 0.15,
    );
    if (hit) {
      // Running average keeps the cluster centered.
      hit.areaSqm = (hit.areaSqm * hit.count + b.areaSqm) / (hit.count + 1);
      hit.count += 1;
    } else {
      clusters.push({ areaSqm: b.areaSqm, count: 1 });
    }
  }

  let created = 0;
  for (const [i, c] of clusters.slice(0, 8).entries()) {
    const areaSqft = c.areaSqm * SQFT_PER_SQM;
    const w = Math.sqrt(areaSqft / 2.5);
    const perimeterFt = Math.round(7 * w);
    const building = await createBuilding(data.bidId, {
      label: `Type ${i + 1} — ~${Math.round(areaSqft).toLocaleString()} sqft footprint (OSM)`,
      count: c.count,
    });
    await createSurface(building.id, {
      name: "Exterior walls (aerial estimate — verify)",
      dimensions: [[perimeterFt, DEFAULT_WALL_HEIGHT_FT]],
    });
    created += 1;
  }

  revalidatePath(`/opportunities/${data.bidId}`);
  return { created, error: null };
}
