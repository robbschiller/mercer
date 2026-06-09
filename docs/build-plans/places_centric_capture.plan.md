# Build plan — Places-centric capture (Maps-grade place finding)

**Status:** Queued (captured 2026-06-09). Not started.
**Relates to:** PRD §5.1 (lead capture), the property-rooted re-model (property = root), enrichment runner, and the open *Decisions needed* item "Production server-side Places API key."

## The idea

Make the **Google Places API central** to how records are created, and make **finding/adding a place as easy as it is in Google Maps** — type-ahead search, map + satellite preview, one-tap confirm — everywhere an address or property is entered. Today Places is used reactively (background enrichment of imported leads, the bid wizard's address step, the satellite route); the goal is to make a **Maps-quality place picker the front door** for capture, so the property (the root object) is created clean and de-duplicated from the start.

## Where it plugs in

A single reusable **`<PlacePicker>`** (Autocomplete → resolve → map/satellite preview → confirm) used by:

- `/leads/new` and the dashboard **create-lead** sheet (replace the free-text "Property address").
- `/bids/new` wizard address step and the dashboard **start-draft-bid** flow.
- A new first-class **add-property** flow (the property-rooted model has no direct property create today — flagged in [`data-model-and-entry-points`](../../) memory).
- Anywhere else an address is typed.

On confirm, capture `placeId`, formatted address, lat/lng, and (optionally) name/satellite — the fields `properties`/`leads`/`bids` already carry (`googlePlaceId`, `latitude`, `longitude`, `satelliteImageUrl`).

## Why it matters

- **Clean root object.** Properties created from a resolved Place are geocoded and consistently named — better dedup, better enrichment, better maps everywhere downstream.
- **Dedup on `googlePlaceId`.** Matching new captures against existing properties by `placeId` prevents the duplicate-property problem the CSV import path is prone to.
- **Speed.** Maps-grade autocomplete beats free-text + async enrichment for the common "add this property now" case.

## Existing building blocks

- `@googlemaps/js-api-loader` is already a dependency.
- `src/lib/leads/enrichment-runner.ts` / `resolveLeadViaPlaces` (server-side Places resolution) — reuse the resolution logic; the new picker is the *interactive* front end to the same data.
- `src/app/api/maps/satellite/route.ts` for satellite imagery.

## Phasing

- **P1 — `<PlacePicker>` component** (Autocomplete + session tokens for billing + map/satellite preview), wired into `/leads/new` and the dashboard create-lead/start-bid sheets.
- **P2 — first-class add-property flow** + dedup-on-`placeId` against existing properties.
- **P3 — backfill/centralize:** route the bid wizard and any remaining address inputs through the picker; consider making Places the authoritative source over CSV addresses where they conflict (ties into the "Enrichment rethink" section in `plan.md`).

## Open questions / dependencies

- **Production server-side Places key** (already an open *Decisions needed* item in `plan.md`, PRD §10 Q9) — gating for non-dev use.
- Autocomplete **session tokens** to control billing.
- Which Places fields to persist beyond the current set; whether to store a richer `raw_source` for properties.
- Interaction with the paused footprint/B1 work (placeId could seed footprint lookups later).
