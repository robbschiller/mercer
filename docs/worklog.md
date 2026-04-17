# Worklog

Running log of in-flight work on the lead-to-close MVP (docs/plan.md). Chronological, newest at top. For per-feature detail, see `docs/build-plans/`.

---

## 2026-04-17 — Phase B2 manual override shipped + plan.md promoted to single source of truth

**Goal:** Close the top open item from `docs/plan.md` → Active Work: a manual override for when Places resolved the wrong building. Also: reconcile AGENTS.md and plan.md so status lives in one place.

### Shipped

- `LeadPropertyOverrideForm` ([src/components/lead-property-override-form.tsx](../src/components/lead-property-override-form.tsx)) — client component wrapping the existing `AddressAutocomplete`. Exposed on the Property card via `?edit=property` query flag on the lead detail page.
- `overrideLeadProperty` store function ([src/lib/store.ts](../src/lib/store.ts)) — updates `resolved_address / latitude / longitude / google_place_id`, rebuilds `satellite_image_url` via `buildSatelliteProxyPath`, sets `enrichment_status = 'success'`, clears `enrichment_error`.
- `overrideLeadPropertyAction` ([src/lib/actions.ts](../src/lib/actions.ts)) — redirects back to `/leads/[id]` on success so the edit flag clears; validation errors redirect back with `?edit=property&error=...`.
- `overrideLeadPropertySchema` ([src/lib/validations.ts](../src/lib/validations.ts)) — reuses `formLatLng` + `formPlaceId`, so the same hidden fields that AddressAutocomplete emits elsewhere flow through.
- Lead detail page ([src/app/(app)/leads/[id]/page.tsx](<../src/app/(app)/leads/[id]/page.tsx>)) — Property card now has an "Override address" button; in edit mode swaps to the form with an explanatory copy line.

### Verification

1. Navigated to a lead with an existing resolved address (Jennifer Park / Post Alexander).
2. Opened `?edit=property` — form rendered with the current address preloaded.
3. Typed a new address ("520 W 5th St, Charlotte, NC"). Google Places blocked autocomplete with `PERMISSION_DENIED: Requests from referer http://localhost:59810/ are blocked.` — the dev key is restricted to `http://localhost:3000/*`. This is a dev-environment artifact, not a code issue; autocomplete works when the key's referer list matches the port, and `AddressAutocomplete` is already used in the bid wizard in production.
4. Submitted the form anyway to exercise the degraded path (address-only, no suggestion). Redirect went to `/leads/[id]` without the edit flag — action succeeded.
5. Verified in Postgres: `resolved_address` updated to the new value, `enrichment_status = 'success'`, `latitude / longitude / satellite_image_url` nulled (correct — no coords from Places without a picked suggestion). Restored the row to its original state so the demo data stays clean.

### Plan / docs reconciliation

AGENTS.md had its own "What Is Shipped" / "What Is Still Open" lists that duplicated the checkboxes in plan.md, already drifting. Consolidated:

- plan.md gained a top-level **Active Work — Single Source of Truth** section (Open now / Paused / Decisions needed / Shipped).
- AGENTS.md's duplicate status lists replaced with a pointer to the Active Work section and a rule that checkbox flips land in the same PR.
- B1 footprint/sqft items flipped from `[ ]` to `[~]` Paused with a pointer to the 2026-04-16 OSM tuning entry — they're decided-against, not pending.
- Tech-stack row fixed: CSV parsing is a custom parser in `src/lib/leads/csv.ts`, not Papa Parse.

### Next

Next candidate in "Open now" is **Phase E — /pipeline funnel page**. Phase F demo polish and Phase D2 mailto: are smaller follow-ups.

---

## 2026-04-16 — Phase A shipped (CSV import + Places enrichment)

**Goal:** Plan Phase A from docs/plan.md — `leads` table + `/leads/import` + enrichment + lead detail — with OSM hidden per the tuning decision.

### Deliverables

- **Schema** — extended `leads` table with `resolved_address`, `latitude`, `longitude`, `google_place_id`, `satellite_image_url`, `enrichment_status`, `enrichment_error`, `raw_row`. Migration at [drizzle/manual/004_leads_enrichment.sql](../drizzle/manual/004_leads_enrichment.sql). Applied cleanly on first run.
- **CSV parser** — minimal RFC-4180-ish parser + column auto-mapper at [src/lib/leads/csv.ts](../src/lib/leads/csv.ts). Supports quoted fields with embedded commas and newlines. Column aliases cover the common trade-show shapes: `name / full name / contact`, `email`, `phone / mobile / cell / tel`, `company / organization / management`, `property / community`.
- **Places-only enrichment runner** — [src/lib/leads/enrichment-runner.ts](../src/lib/leads/enrichment-runner.ts) wraps the pure `resolveLeadViaPlaces` helper (exposed as a separate export in [src/lib/enrichment/enrich-lead.ts](../src/lib/enrichment/enrich-lead.ts) to avoid paying the Overpass call we don't need). Concurrency 3, writes `enrichment_status` back onto each lead.
- **Store** — `createLeadsBatch`, `getLead`, `updateLeadEnrichment`, `updateLeadStatus`, `getLeadSourceTags` in [src/lib/store.ts](../src/lib/store.ts).
- **Actions** — `importLeadsAction`, `enrichLeadAction`, `updateLeadStatusAction` in [src/lib/actions.ts](../src/lib/actions.ts). Enrichment runs inline inside the import action so the redirect lands on a fully-populated list view.
- **Pages** —
  - [src/app/(app)/leads/page.tsx](<../src/app/(app)/leads/page.tsx>) — list with Import CSV button, success banner, source-tag filter chips, enrichment status per card.
  - [src/app/(app)/leads/import/page.tsx](<../src/app/(app)/leads/import/page.tsx>) — file picker + source tag input.
  - [src/app/(app)/leads/[id]/page.tsx](<../src/app/(app)/leads/[id]/page.tsx>) — contact/property cards, re-run enrichment form, satellite preview, inline status dropdown, Create Bid link.
- **Test fixture** — [scripts/fixtures/trade-show-sample.csv](../scripts/fixtures/trade-show-sample.csv). 20 rows covering the real mess: missing phones/emails, quoted names with commas, apostrophes, one nameless row (should be skipped), multiple companies across Camden / AMLI / Cortland / AvalonBay / Greystar.

### End-to-end verification

1. Created dev user `claude-test+phase-a@mercer.dev`, marked confirmed directly in `auth.users` (see the turn above).
2. Uploaded the fixture CSV via `/leads/import` with source tag `NAA Orlando 2026`.
3. `POST /leads/import` returned `303` in 6055ms, redirected to `/leads?imported=19` — 20 rows read, 1 nameless row correctly skipped.
4. List view rendered all 19 leads with resolved addresses, phone/email, and green "Enriched" indicators. Source chip filter working.
5. Lead detail for Jennifer Park resolved to `600 Phipps Blvd NE, Atlanta, GA 30326` and rendered a live Google Static satellite preview. "Resolved via Google Places — confirm on-site." copy shows as expected.

### Notes / open items

- **React warning** on the import form (encType applied alongside a server-action function) — fixed by removing `encType="multipart/form-data"`; React supplies it automatically.
- **Enrichment runs inline.** 19 rows took ~6s. For larger imports (>100 rows) we'll want `waitUntil()` on Vercel or a background job. Not urgent for the MVP demo scale.
- **Prod Places key still TODO.** Dev uses the Referer-spoof workaround on the existing key; production `enrichLead` needs a separate IP-restricted key.
- **Create Bid from lead is not wired yet.** Link goes to `/bids/new?leadId=...` but the bid creation flow doesn't read the `leadId` param and pre-fill. That's Phase C.

### Next

Phase C — lead → bid pre-fill + `lead_id` FK on bids + lead-status auto-update on proposal generation. Or if demo priorities shift: Phase D (public shareable proposal URL) is the bigger unlock for closing deals.

---

## 2026-04-16 — OSM tuning experiment

**Context:** Day-0 validation showed OSM footprint plausibility at 10% (1/10). Spent this session trying to improve it with pipeline tweaks before starting Phase A.

### Variants tested

Implemented in [src/lib/enrichment/enrich-lead.ts](../src/lib/enrichment/enrich-lead.ts). Each ran against the same 10-property set.

| # | Variant | OSM returned | Plausible (±2x expected footprint) |
| --- | --- | --- | --- |
| 1 | **Baseline** — 75m circle, no building tag filter | 6/10 (60%) | 1/10 (10%) |
| 2 | Places viewport bbox + tag whitelist | 7/10 (70%) | 0/10 (0%) |
| 3 | 75m circle + tag whitelist (`apartments\|residential\|dormitory\|yes`) | 8/10 (80%) | **2/10 (20%)** |
| 4 | 75m circle + exclude-list (`garage\|shed\|carport\|...`) | 6/10 (60%) | 1/10 (10%) |

Winner: **variant 3**. Shipped as final config in [src/lib/enrichment/enrich-lead.ts](../src/lib/enrichment/enrich-lead.ts).

### Why viewport (variant 2) lost

Places viewports are zoom-hint-sized, not property-sized. For most addresses the viewport is a multi-block bbox, which pulled in *more* adjacent buildings than the fixed 75m circle. The viewport field is still captured in the pipeline for future use (e.g. paired with `Place.types` or `addressComponents`), but it does not drive the Overpass query.

### Why exclude-list (variant 4) lost

OSM multifamily buildings are often tagged as generic `yes` or even `commercial` (for mixed-use ground floors). Exclude-list keeps those but also keeps lots of true neighbors. Whitelist drops some real buildings but drops even more noise — net positive.

### Why plausibility still fails

- **Urban mid-rises** (AMLI Midtown, Camden Phipps, Camden Cotton Mills, Post Biltmore): 75m radius includes adjacent apartment buildings on the same block that aren't part of the property.
- **Suburban garden-style** (Avalon Arundel, Avalon Morristown): OSM has incomplete coverage — only 2–8 buildings mapped where there are 20+ on the ground.
- **Fuzzy Places resolution** (Avalon Morristown → zip-level match) puts the OSM lookup in the wrong spot entirely.
- **Public Overpass rate limits**: 2–4 of 10 requests still 429 even with 4s spacing. Production needs `OVERPASS_API_URL` → private instance.

No radius / filter combination fixes both urban overcapture AND suburban undercoverage simultaneously with one config. This is a **data quality ceiling**, not a tuning ceiling.

### Conclusion

**Stop tuning. Accept that OSM footprint is an order-of-magnitude signal, not an accurate sqft source.** Reframe the product:

- Lead list shows footprint *count* and *approximate* sqft with a "confirm on-site" label.
- Preliminary bid $ estimate uses a wide confidence band (±50% or more) rather than a precise number.
- Manual sqft override is the primary UI, not an escape hatch.
- Private Overpass instance is still a production requirement.

### Next

Start Phase A — `leads` table, `/leads/import`, `/leads` list — with the above reframing baked into the UI copy from day one.

---

## 2026-04-16 — Day-0 enrichment pipeline validation

**Goal:** Before building any Phase A/B UI, prove or disprove the plan's core enrichment premise — *"given a trade-show CSV row with `{company, propertyName}` and no address, we can enrich it with property data and a preliminary bid estimate."*

### Scope of this session

- Picked 10 real multifamily properties (Camden, AMLI, Cortland, AvalonBay).
- Built a pure enrichment function independent of the app shell so we could test the pipeline without UI.
- Built a validation runner that reports resolution rate and footprint plausibility against the plan's thresholds (≥60% resolution, ≤25% off on accuracy).

### Deliverables

- [src/lib/enrichment/enrich-lead.ts](../src/lib/enrichment/enrich-lead.ts) — `enrichLead({company, propertyName}, apiKey, opts)` pure function. Places Text Search (New) + Overpass footprint lookup. No I/O side effects. Ready to be wrapped as the Phase B1 `enrichLead(leadId)` server action.
- [scripts/validate-enrichment.ts](../scripts/validate-enrichment.ts) — runnable with `bun run scripts/validate-enrichment.ts`. Prints per-property detail, summary tallies, and a PASS/FAIL verdict.

### Result

| Metric | Result | Threshold | Status |
| --- | --- | --- | --- |
| Places resolution | 10/10 (100%) | ≥ 60% | ✅ strong |
| OSM footprints returned | 6/10 (60%) | — | ⚠️ rate-limited |
| Footprint plausibility (±2x) | 1/10 (10%) | ≥ 60% | ❌ weak |

**Verdict:** Mixed. Places lookup is reliable; OSM footprint as an accurate sqft source is not.

### Failure modes identified

1. **Urban overcapture** — 75m radius in [src/lib/osm/overpass.ts:5](../src/lib/osm/overpass.ts:5) includes neighboring buildings for mid-rise / dense urban properties (e.g. AMLI Midtown: 4× expected).
2. **Suburban coverage gaps** — some properties (Avalon Arundel Crossing) only have 1–2 building polygons in OSM even though they have dozens on-site.
3. **Public Overpass rate limits** — even with 4s pacing, 4/10 requests returned "service is busy." Production deployment will require a private Overpass (env var `OVERPASS_API_URL` already wired).
4. **Fuzzy Places resolution** — for one property (Avalon Morristown Station) Places returned only a zip-level match, not a street address. Coords still usable but footprint lookup lands in the wrong spot.

### Implementation note — Google key restrictions

The existing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is restricted to HTTP referrers (browser calls only). Server-side Places Text Search requires either (a) a separate server-restricted key, or (b) a whitelisted Referer header. The script passes `Referer: http://localhost:3000/` for local dev. Production will need approach (a).

### Decisions

- **Ship Places-first enrichment in Phase B; treat OSM footprints as optional enhancement.** The "find-the-property-from-a-name" pitch is strong enough to justify the feature. Treating OSM sqft as authoritative would mislead the user on 9/10 properties today.
- **Manual sqft override promoted from escape-hatch to primary UI.** The contractor is the ground truth; enrichment seeds their work rather than replacing it.
- **Private Overpass instance is a production blocker** for any OSM-dependent UI in the demo.

### Next step

Phase A from [docs/plan.md](plan.md) — CSV upload + leads table + list view — is unblocked. See "Open questions" below before starting.

### Open questions for Tim

1. **Separate server-side Places key?** Ok to create a second Google Maps API key with IP-based restriction for server-side Places calls (production `enrichLead` action), or prefer another approach?
2. **CSV from Jordan** — plan's other Day-0 item. Do we have one yet, or should we build Phase A against a synthetic CSV and swap later?
3. **OSM in the MVP demo** — show it behind a "approximate / confirm on-site" label, or hide it entirely until we have a private Overpass?
