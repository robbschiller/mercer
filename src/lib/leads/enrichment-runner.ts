/**
 * Phase A enrichment runner — Places-only.
 *
 * Wraps the pure `resolveLeadViaPlaces` helper, persists results back onto
 * the lead row, and catches errors so the caller can fan out across a batch
 * without aborting on the first failure.
 *
 * OSM footprints are intentionally omitted in Phase A (see docs/worklog.md
 * 2026-04-16 OSM tuning). Re-introduce when we have a private Overpass and
 * a tighter query strategy.
 */

import { resolveLeadViaPlaces } from "@/lib/enrichment/enrich-lead";
import { updateLeadEnrichment, type Lead } from "@/lib/store";

export async function runEnrichmentForLead(lead: Lead): Promise<void> {
  const company = lead.company ?? "";
  const propertyName = lead.propertyName ?? undefined;
  // Prefer the CSV-derived address (seeded into resolvedAddress at import)
  // as the Places query — it's the authoritative physical location for
  // this contact. Fall back to property+company string matching only when
  // the CSV didn't provide an address.
  const csvAddress = lead.resolvedAddress?.trim() || null;

  if (!csvAddress && !company && !propertyName) {
    await updateLeadEnrichment(lead.id, {
      enrichmentStatus: "skipped",
      enrichmentError: "No address, company, or property name to resolve",
    });
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    await updateLeadEnrichment(lead.id, {
      enrichmentStatus: "skipped",
      enrichmentError: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set",
    });
    return;
  }

  try {
    const place = csvAddress
      ? await resolveLeadViaPlaces(
          { company: csvAddress, propertyName: null },
          apiKey,
          { referer: "http://localhost:3000/" }
        )
      : await resolveLeadViaPlaces(
          { company, propertyName },
          apiKey,
          { referer: "http://localhost:3000/" }
        );

    if (!place) {
      // Don't wipe the CSV-derived resolvedAddress just because Places
      // couldn't geocode it — keep the text, mark enrichment failed.
      await updateLeadEnrichment(lead.id, {
        enrichmentStatus: "failed",
        enrichmentError: "No Places result for query",
      });
      return;
    }

    await updateLeadEnrichment(lead.id, {
      enrichmentStatus: "success",
      // CSV address wins as the stored string; Places gives us lat/lng/id.
      resolvedAddress: csvAddress ?? place.formattedAddress,
      latitude: place.latitude,
      longitude: place.longitude,
      googlePlaceId: place.placeId,
      enrichmentError: null,
    });
  } catch (e) {
    await updateLeadEnrichment(lead.id, {
      enrichmentStatus: "failed",
      enrichmentError: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Enrich a batch of leads in parallel (but capped concurrency so we don't
 * torch the Places rate limit). Silently settles — individual lead errors
 * are persisted onto the lead row via runEnrichmentForLead.
 */
export async function runEnrichmentForBatch(
  leadsToEnrich: Lead[],
  concurrency = 3
): Promise<void> {
  const queue = [...leadsToEnrich];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) return;
      await runEnrichmentForLead(next);
    }
  });
  await Promise.all(workers);
}
