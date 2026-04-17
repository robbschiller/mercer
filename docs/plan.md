# Plan: Mercer, from Bid Tool to Sales Platform

**The core concept:** an app specifically for exterior renovation contractors bidding multifamily properties. Upload a trade show attendee list, get enriched leads with property intelligence, build bids, send shareable proposals, close deals, all in one place.

---

## Competitive Landscape

The software around exterior renovation fragments along two axes: *what stage of the job the tool owns* and *who the tool is built for.* Mapping competitors onto those axes makes the positioning move obvious: the quadrant for **commercial renovation × pre-sale (lead → close)** is empty, and the closest analogue in an adjacent quadrant (roofing-specific CRMs) has built a durable business proving the pattern works.

### Axis 1: what stage the tool owns

**Measurement.** EagleView, Hover, STACK, PlanSwift, Groundplan, The EDGE, Buildxact. These tools turn a property into numbers.
- *STACK / PlanSwift* require blueprints. Rob almost never has them; 75–80% of his jobs start with a phone call, not a document.
- *Hover* is genuinely good at single-family residential from a phone scan, but for multifamily it only measures the specific unit you captured, not adjacent buildings. A 49-building complex is a nightmare workflow.
- *EagleView* is the enterprise incumbent for aerial measurement, including multifamily property reports. Well-funded, high-accuracy, deliberately expensive. Upstream of Mercer: an integration target, not a substitute.

**Pre-sale (lead → close).** Salesforce, HubSpot, Pipedrive, Monday: industry-agnostic. JobNimbus, AccuLynx, Roofr: trade-vertical CRMs built around roofing (residential *and* commercial). Jobber, Housecall Pro, ServiceTitan: residential service dispatch. Each of these owns some version of the pipeline; none of them own it for commercial exterior renovation beyond roofing.

**Post-sale operations.** Procore, BuilderTrend, JobTread, Knowify, Projul. These tools manage what happens after the contract is signed: schedules, subs, RFIs, punch lists, invoicing. They're downstream of Mercer, not a substitute. Most lean ground-up construction or residential remodel; none are purpose-built for occupied commercial renovation.

### Axis 2: who the tool is built for

**Industry-agnostic platforms** (Salesforce, HubSpot, Monday, Pipedrive) are configurable for anything and specialized for nothing. Jordan's Salesforce experiment worked functionally and failed operationally. Salesforce had no concept of a building, a takeoff, a surface, a coverage rate, or a multifamily property. Bolting those concepts on with custom objects turns a $150/user/month CRM into a second full-time engineering job.

**Residential service dispatch** (Jobber, Housecall Pro, ServiceTitan) is built around a homeowner, a technician, and a single-day job. Unit economics (a $900 HVAC tune-up, a $1,500 drain clear) shape every decision in the UX. They don't scale up to a $1.2M phased repaint on a 49-building multifamily asset sold to a regional property manager eleven months out.

**Trade-vertical CRMs for a single exterior trade** (JobNimbus, AccuLynx, Roofr) are the strongest pattern match for what Mercer is building: purpose-built lead-to-close pipelines that speak the native language of one exterior trade, serving that trade across both residential and commercial jobs. The catch: the trade is roofing. Bid flow, measurement model, and pricing are shaped around shingles and sloped roofs, and they don't extend to the other exterior trades (paint, siding, stucco, envelope, concrete restoration, waterproofing) that make up most of a commercial multifamily renovation.

**Ground-up construction** (Procore, Autodesk Construction Cloud) is designed for new buildings, large GCs, and multi-year schedules. Opinions about permitting, bonding, and multi-party coordination are overkill for a renovation trade and underweight on existing-conditions discovery.

**Commercial renovation beyond roofing** has no purpose-built category leader. This is the empty quadrant.

### The closest workflow analogue: roofing

JobNimbus and AccuLynx are the clearest evidence that the Mercer playbook works. Both are vertical CRMs that speak the native language of a single exterior trade (roofing) and serve that trade across residential *and* commercial jobs. AccuLynx alone reportedly serves ten thousand–plus contractors. They prove that a lead-to-close pipeline purpose-built for one exterior trade beats a generic pipeline stitched to a pile of integrations.

The difference is trade surface area, not customer segment. Their bid flow, measurement model, and pricing are built for shingles and sloped roofs; the tools don't extend to paint, siding, stucco, envelope, or the other trades that make up a commercial multifamily renovation. The pattern is correct; the trade is the limit. Commercial exterior renovation beyond roofing has no equivalent category leader.

### The beachhead: commercial multifamily exterior renovation

The near-term product is a purpose-built CRM and bid tool for **commercial multifamily exterior renovation**: the work of refreshing, resurfacing, and retrofitting the outside of occupied multifamily properties. The first supported trade is exterior painting, because that's where the design partner and the validated workflow are. The beachhead is the *category*, not the trade; the lead-to-close spine underneath (CSV import → property enrichment → building-aware bid → shareable accept link → pipeline) is deliberately trade-agnostic.

The wedge matters because:

- **It's defensible.** Salesforce and HubSpot can't out-specialize Mercer without rebuilding their UX around buildings and takeoffs. JobNimbus and AccuLynx won't extend past roofing. The quadrant is genuinely empty.
- **The category has natural expansion paths.** Painting leads into the adjacent trades a property manager buys in the same capex cycle: siding, stucco, envelope retrofits, concrete restoration, waterproofing, window replacement. Each new trade surface is incremental UX on a shared pipeline, not a new product.
- **The design partner is in it.** Reno Base is a commercial exterior painting contractor on multifamily today. Painting is the proving ground; the beachhead is the broader category the product is being built to own.

The long-term product is the operating system for commercial renovation. Commercial multifamily exterior, painting first, is the way in.

### The buyer profile

The customer-of-the-customer is a property manager or regional portfolio owner, not a homeowner, not a GC. The implications shape every product decision:

- **Capex cycles.** Buying decisions are made quarters in advance against an annual budget, not reactively.
- **Approved vendor lists.** Getting onto the list matters more than winning any single bid. The game is relationship, not transaction.
- **Occupied assets.** Work is phased around leases, tenant notices, and access. Scheduling and communication look nothing like new construction.
- **Portfolio leverage.** A single win often opens five to fifty similar properties under the same management company.

None of these attributes are first-class concepts in the tools above: generic platforms, residential service CRMs, trade-vertical roofing CRMs, or ground-up construction suites. They are load-bearing for Mercer.

### Why not [the obvious choice]

- **Why not Salesforce / HubSpot?** Infinitely configurable, speaks nothing. Building count, coverage rates, $/sqft, takeoff by surface, footprint enrichment: none of it ships out of the box. Once bolted on, you've built a bad version of Mercer at ten times the maintenance cost.
- **Why not Jobber / Housecall Pro / ServiceTitan?** Residential service unit economics. A $1.2M phased repaint doesn't fit their shape, and their customers aren't property managers.
- **Why not JobNimbus / AccuLynx?** Closest analogue workflow-wise, and they serve commercial roofing contractors well. But they're roofing-specific. Bid, measurement, and pricing models are shaped around shingles and sloped roofs. They validate the pattern; they leave the rest of commercial exterior renovation wide open.
- **Why not Procore / BuilderTrend / JobTread?** Post-sale operations tools. They start *after* the contract is signed and have no opinion about how the lead got there or how the bid got built. Downstream, not competitive.
- **Why not EagleView / STACK / Hover?** Measurement only. Upstream, potential integration targets, not substitutes.

### The strategic position in one sentence

**Roofing contractors, residential or commercial, have JobNimbus and AccuLynx. Everyone else renovating the outside of an occupied commercial property has nothing. Mercer is that tool, starting with commercial multifamily exterior renovation (painting first) and widening trade-by-trade as the foundation holds.**

That's the niche. Domain expertise from a family in the trade, a design partner in Jordan at Reno Base, and a category the incumbents are structurally prevented from owning.

---

## Current State

The bid-to-proposal workflow is complete and live at mercer-bids.vercel.app. The app covers:

- Create a bid via a short flow: address first (Places autocomplete), confirm with satellite + suggested name, then property name, client, and notes. Satellite imagery via Maps Static API, `satellite_image_url` stored on the bid.
- Add building types with counts and paintable surfaces with dimension-factor input.
- Price the bid with coverage rates, labor, margin, and custom line items.
- Generate a client-facing proposal PDF with per-building breakdowns and optional satellite imagery.
- Track bid status (draft / sent / won / lost) with automatic status updates.
- OpenStreetMap footprints on bid detail when coordinates are available.
- Lead ingestion (`/leads/import`) with CSV parsing, source tags, enrichment status, and lead detail views.
- Lead-to-bid conversion with prefilled `/bids/new?leadId=...` and bid-to-lead linkage.
- Shareable proposal pages at `/p/[slug]` with accept/decline actions and status propagation.
- App dashboard (`/dashboard`) with lead and bid summary metrics.

The app is deployed on Vercel, uses Supabase for auth, database, and file storage, and is built with Next.js 16, React 19, and Tailwind CSS 4.

---

## The Shift: From Bid Tool to Sales Platform

Jordan's walkthrough of AQP's full workflow surfaced something important: the bid tool is the middle of a longer funnel. Upstream, Jordan and his team struggle with trade show attendee lists: hundreds of contacts with no phone numbers, no property addresses, no prioritization. Downstream, proposals sent as PandaDoc PDFs disappear into inboxes with no visibility into whether they've been opened, approved, or ignored.

Mercer already has the unique ingredient to solve the upstream problem: **property intelligence**. The same Google Places + OSM pipeline that powers Phase 1.5 can be pointed at a raw CSV and turn a list of names into enriched, prioritized, bid-ready leads. That's something no generic CRM can do.

The downstream problem is equally solvable. Replacing the PDF-in-email pattern with a hosted, shareable proposal URL that the customer can accept directly converts Mercer from a document generator into a closing tool.

**This reframes Mercer's positioning.** It's no longer "a better bid tool for painting contractors." It's "the sales platform for exterior renovation, from trade show list to signed deal." The bid engine is the heart; the lead ingestion and deal closure are the arteries.

---

## Build Principles

- **Mobile-first, on-site use:** Contractors use it in the parking lot; fast, simple inputs, large tap targets.
- **Bid-in-real-time:** Every change updates the bid immediately.
- **Flexible, not rigid:** Real properties don't fit templates perfectly. The app should suggest, not constrain.
- **Automate what's tedious:** Use satellite imagery, building footprints, and CSV enrichment to reduce manual data entry.
- **Close the loop:** From lead acquired to deal closed, everything lives in one system with a clear audit trail.
- **Output that wins work:** Proposals should be easier to share, review, and sign than the status quo.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| **Frontend** | Next.js 16 (App Router), React 19 |
| **Backend** | Next.js (Server Components, Server Actions) |
| **Data** | Postgres via Supabase, Drizzle ORM |
| **Auth** | Supabase Auth |
| **UI** | shadcn/ui (Radix primitives + Tailwind 4) |
| **Validation** | Zod |
| **PDF** | @react-pdf/renderer |
| **Hosting** | Vercel |
| **Analytics** | Vercel Web Analytics |
| **Maps** | Places API (New) for address autocomplete and server-side lead enrichment; Maps Static API for satellite thumbnails |
| **Building data** | OpenStreetMap Overpass API (currently hidden from UI; see Active Work → Paused) |
| **CSV parsing** | Custom RFC-4180-ish parser in `src/lib/leads/csv.ts` (server-side on import) |

---

## Two-Week MVP: Lead-to-Close Proof of Concept

**Goal:** Deliver a working end-to-end flow to Jordan within two weeks that demonstrates:
**CSV upload → enriched leads → bid creation → shareable proposal URL → customer acceptance → deal closed.**

This is a proof of concept, not a production release. It proves the strategic thesis (that Mercer can expand beyond bidding into full sales platform territory) without committing to the full ERP scope Jordan described (contracts, schedules, expense tracking, sub management, punch lists). Those remain future work.

## Active Work — Single Source of Truth

This is the live to-do list for the MVP. When a checkbox below flips in this section or in the phase breakdowns further down, update in the same PR (per `AGENTS.md` → Definition Of Done). The phase sections are retained as build context; the authoritative live status is here.

### Open now (ordered by priority)

1. [ ] **Phase B2 — manual override UX on enriched fields.** When Places returns a wrong or zip-level match, the user needs a way to edit address / lat / lng on the lead detail page. Load-bearing because Day-0 validation (see `docs/worklog.md` 2026-04-16) showed Places resolution is 100% but not always the *right* building.
2. [ ] **Phase E — `/pipeline` funnel page.** Five counts (Leads / Quoted / Won / Lost / Total Pipeline $), source_tag filter, simple Leads → Quoted → Won funnel with conversion rates, each count links to a filtered list. `/dashboard` is the interim surface.
3. [ ] **Phase F — demo polish**
   - [ ] Onboarding blurb on `/leads/import`
   - [ ] Empty states and error messages on the new views
   - [ ] Seed a clean sample import in Jordan's account
   - [ ] End-to-end test with a real attendee CSV
   - [ ] Record a backup 3-minute demo video
4. [ ] **Phase D2 — `mailto:` Email Proposal shortcut** on bid detail.
5. [ ] **Phase A2 — sort leads by Est. Bid desc.** Gated on B1 shipping `est_bid_amount`; moot while B1 is paused (see below). If we stay Places-only, replace with sort-by-created-at-desc (already the default).

### Paused / deferred by decision

- **Phase B1 footprint-based sqft + preliminary bid estimate** (`footprint_sqft`, `est_total_sqft`, `est_bid_amount`, `needs_review` state). Day-0 validation showed OSM footprint plausibility ≤ 20% across four tuning variants. OSM is hidden from the UI until we have a private Overpass (env var `OVERPASS_API_URL`) plus a containment-based query strategy. Full analysis: `docs/worklog.md` 2026-04-16 "OSM tuning experiment."
- **"Photos in proposals"** (Rob's ask). Multi-day feature, stays out of MVP per `docs/plan.md` → What's Deliberately Out; flowchart shows this is load-bearing for the post-demo slice.

### Decisions needed from Tim before proceeding

- [ ] **Production server-side Places API key.** Dev runs on the existing HTTP-referrer-restricted key via a Referer spoof; production `enrichLead` needs a separate IP-restricted key.
- [ ] **Real trade-show CSV from Jordan** vs. continuing against `scripts/fixtures/trade-show-sample.csv`.
- [ ] **Supabase email confirmation** — currently on; blocks friction-free demo sign-ups. Keep on, turn off for demo, or pre-create Jordan's account?

### Shipped (summary — authoritative checkboxes live in the phase sections)

- **Phase A** — CSV import with auto-column-mapping, leads list (card + table views), lead detail, enrichment status badges, source-tag filter.
- **Phase B Places-only slice** — `enrichLead` resolves address + lat/lng + place_id, satellite thumbnail on lead detail.
- **Phase C** — `bids.lead_id` FK, lead → bid pre-fill, auto lead status `quoted` on proposal, auto `won` / `lost` on public proposal share response.
- **Phase D** — `/p/[slug]` public proposal page, accept/decline with capture, status propagation to bid and lead, share link + copy-to-clipboard.
- **Phase E (partial)** — `/dashboard` summary counts.
- **Infra** — Next.js 16 migration (proxy.ts), AGENTS.md operating guide.

### Pre-Work (Day 0, before the two-week clock starts)

- [x] **Validate enrichment pipeline on 10 known multifamily properties.** Completed 2026-04-16. Places resolution 10/10 (100%); OSM footprint plausibility 1–2 / 10 across four tuning variants. Decision: ship Places-only, hide OSM. Full report: `docs/worklog.md`.
- [ ] **Get a real trade show attendee CSV from Jordan.** Still open; built Phase A against `scripts/fixtures/trade-show-sample.csv` in the meantime.

### Phase A: Lead Ingestion (Days 1–2)

#### A1. CSV upload

- [x] `leads` table: id, user_id, source_tag (text), name, company, email, property_name, raw_row (jsonb), status (enum: new / quoted / won / lost), created_at.
- [x] Upload page at `/leads/import` with a file picker accepting `.csv`.
- [x] Parse CSV client-side with Papa Parse and preview imported rows before commit.
- [x] Column auto-mapping for Name, Email, Company, Property Name. Unmapped columns are stored on `raw_row`.
- [x] Source tag input applied to imported rows.
- [x] Bulk insert to `leads` table on confirm. No deduplication in MVP.

#### A2. Lead list view

- [x] `/leads` page with table/card views including Name, Company, Property, source, enrichment, and status.
- [ ] Sort by Est. Bid descending by default so biggest opportunities surface first.
- [x] Filter by source_tag.
- [x] Status dropdown/edit flow: New / Quoted / Won / Lost.

**Milestone:** Jordan uploads a real attendee list and sees it as a structured table in the app.

### Phase B: Property Intelligence Enrichment (Days 3–6)

#### B1. Enrichment worker

- [x] Server action `enrichLead(leadId)` that:
  - Builds a Places query from company + property name (fall back to company alone if property is empty).
  - [x] Fetches one Google Places result; stores formatted address, lat/lng, and place_id on the lead.
  - [~] If coordinates resolve, queries Overpass for building footprints within ~75m. *Paused — OSM hidden from UI, see Active Work → Paused.*
  - [~] Computes rough exterior sqft using footprint × default story count × multiplier. *Paused — same reason.*
  - [~] Applies user's default $/sqft to generate a preliminary bid estimate. *Paused — same reason.*
  - [~] Writes `footprint_sqft`, `est_total_sqft`, `est_bid_amount`, and `needs_review` state. *Paused — same reason.*
- [x] Trigger enrichment on import for inserted rows.
- [x] Display enrichment status in the lead list/detail (pending/success/failed/skipped).

#### B2. Lead detail view

- [x] `/leads/[id]` page showing contact info, resolved address, satellite thumbnail, notes, and enrichment state.
- [x] "Create Bid" button that takes the user into the existing bid creation flow.
- [ ] Manual override on enriched fields in case the auto-resolved address is wrong. *Top of Active Work; load-bearing per Day-0 findings.*

**Milestone:** Every imported lead is either enriched with property data and a preliminary bid estimate, or clearly flagged as needing manual review.

### Phase C: Lead-to-Bid Conversion (Day 7)

- [x] Add `lead_id` (nullable) to the `bids` table.
- [x] "Create Bid" from a lead pre-populates: property name, address, lat/lng, place_id, and notes/client defaults.
- [x] The bid carries `lead_id` so conversion can be tracked.
- [x] Back-reference on the lead detail page: linked bid action.
- [x] Auto-update lead status to "Quoted" when a proposal is generated from that bid.

**Milestone:** A user can go from a single row in the lead table to the existing bid creation flow in one click, with all the property data pre-filled.

### Phase D: Shareable Proposal URL (Days 8–10)

#### D1. Public proposal page

- [x] New table `proposal_shares`: id (uuid, public slug), proposal_id, created_at, accepted_at, accepted_by_name, declined_at, decline_reason (plus accessed_at/accepted_by_title).
- [x] Public route at `/p/[slug]`, no auth required. Renders proposal summary in HTML.
- [x] Reuse proposal snapshot data and render key pricing/scope details.
- [x] Add Accept / Decline actions on the public page.
- [x] On Accept: capture customer name/title and persist acceptance.
- [x] On Decline: capture optional reason and persist decline.
- [x] Post-response state shown in-page.

#### D2. Send proposal flow

- [x] Share action on bid detail creates a `proposal_shares` row and shows URL.
- [x] Copy-to-clipboard behavior for share URL.
- [ ] "Email Proposal" `mailto:` shortcut.
- [x] Bid detail shows share status (open/accepted/declined) and URL.

#### D3. Status propagation

- [x] When accepted, bid status flips to "Won" and originating lead status flips to "Won."
- [x] When declined, bid status flips to "Lost" and originating lead status flips to "Lost."
- [ ] Confirmation email out of scope for MVP; the status change in the dashboard is enough for the demo.

**Milestone:** A customer receives an email with a URL, opens the proposal in their browser, clicks Accept, and the deal shows as Won in Jordan's pipeline without anyone else touching the system.

### Phase E: Pipeline View (Days 11–12)

- [ ] `/pipeline` page with five counts: Leads, Quoted, Won, Lost, and Total Pipeline $ Value (sum of est_bid_amount + actual bid amounts).
- [ ] Filter by source_tag to see the NAA Orlando funnel specifically.
- [ ] Simple funnel visual: Leads → Quoted → Won, with conversion rates between each stage.
- [ ] Link each count to a filtered view of the underlying records.
- [x] Lightweight dashboard at `/dashboard` with lead and bid summary counts shipped as an interim step.

**Milestone:** Jordan sees a single dashboard that tells the story "we imported 247 leads from NAA Orlando, enriched 198 of them, quoted 34, and have closed 8 for $1.2M."

### Phase F: Demo Prep & Polish (Days 13–14)

- [ ] End-to-end test with a real attendee CSV and real property addresses. Fix whatever breaks.
- [ ] Seed Jordan's account with a clean sample import so the demo has real-looking data.
- [ ] Onboarding blurb on `/leads/import`: "Upload a trade show attendee list, we'll enrich each row with property data and a preliminary bid estimate."
- [ ] Basic empty states and error messages on the new views.
- [ ] Record a 3-minute demo video walking through the end-to-end flow as a backup in case the live demo has issues.

---

## What's Deliberately Out of the Two-Week MVP

These are all things Jordan asked for or that showed up in the conversation. They are explicitly deferred, not forgotten:

- **Deduplication, portfolio grouping, lead assignment, per-salesperson attribution.** Single-user demo works fine without them.
- **PDF export of the new shareable proposal.** The live URL is the upgrade; PDF parity can follow.
- **Photos in proposals.** Rob cares about this a lot, and it's a multi-day feature on its own. Acknowledge it explicitly when demoing.
- **Signature capture, proposal versioning, access logging.** Nice-to-haves that don't change the accept/decline outcome.
- **Real email sending (SendGrid/Postmark).** `mailto:` gets 80% of the value for 5% of the work.
- **Retention / no-response nudges.** Belongs in v2.
- **Account system for customers to log back in and see past proposals and colors.** Big feature, deferred.
- **AI vision analysis for building suggestions (§5c, §5d).** Originally Phase 1.5; paused to ship the lead funnel.
- **All of Jordan's ERP scope:** contracts, scope-of-work packets, schedules, expense tracking by budget bucket, sub tracker, pre-con/post-con walks, punch lists, paint guides, NPS, damage tracking, invoicing, draw schedules.

---

## Risks to the Two-Week Timeline

**Enrichment accuracy.** If Google Places + OSM doesn't resolve multifamily properties well from company + contact name, the enrichment headline weakens. Mitigation: validate on Day 0 before building the UI around it. If validation fails, reframe the MVP pitch from "AI-enriched lead intelligence" to "bid workflow with a nicer front door" and still ship the CSV upload + shareable proposal pieces.

**Attendee list data quality.** Trade show CSVs often have a property management company and a contact name but no specific property address. If most rows can't be resolved to a building, the demo feels sparse. Mitigation: get a real CSV from Jordan on Day 0. Be ready to show graceful handling of unresolved rows (manual address entry on the lead detail page).

**Scope creep from Jordan.** Jordan is enthusiastic and will likely ask for "just one more thing" during the build. Mitigation: show this plan to Jordan up front so the two-week scope is mutually agreed. Park every new ask in a "Phase G" list to revisit after the demo.

---

## After the Demo: Decision Points

The two-week MVP is a forcing function for three decisions:

1. **Does Jordan actually use it?** If he runs a real trade show list through the enrichment pipeline and creates bids from it, the lead-to-close thesis is validated. If the enrichment isn't good enough or the workflow doesn't match his reality, the demo exposes that before more is built.

2. **Does this become the first customer of a new business?** Jordan raised the idea of Reno Base being the first customer of something larger: an AI-enabled CRM for renovation contractors. The demo is the artifact that makes that conversation concrete. A working proof of concept is far more persuasive than a pitch deck.

3. **What's the right next slice?** Likely candidates after the two-week MVP:
   - Proposal photos (Rob's existing request, carryover from Phase 1.5 roadmap)
   - Real email sending + open tracking
   - Customer accounts with historical proposals and colors
   - The first piece of Jordan's ERP scope, probably a simple "Jobs" view where a won deal becomes a trackable project

Don't commit to the next slice before seeing how Jordan actually uses the MVP.

---

## Longer-Term Roadmap (Post-MVP)

These remain on the horizon but are gated on learnings from the two-week MVP.

### Property Intelligence (resumes after MVP)

AI vision analysis on satellite imagery to suggest building count, type, and grouping. Pre-populated building list UX on bid creation. Originally §5c–§5d of the Phase 1.5 plan.

### EagleView Integration

Once the product has traction and the workflow is proven, integrate EagleView's API for higher-accuracy measurement data. Property Intelligence is the stepping stone: same UX, same "enter address and get building data" flow, but with higher-accuracy measurements that pre-fill surface dimensions, not just building counts.

### Bid Intelligence

Once real project data accumulates, build benchmarking: "typical $/sqft range for this property type in this region." Substrate-aware material calculation. Sherwin-Williams and PPG spec integration.

### Jordan's ERP Layer

The full downstream workflow: contracts, schedules, expense buckets by takeoff category, sub tracker, punch lists, paint guides, NPS. This is where Mercer could become the operating system for Reno Base (and eventually sell to other renovation contractors). Each piece is its own multi-week scope and should only be tackled after MVP validation and a clear ownership/business-model decision with Jordan.

---

## Data Model Changes for the Two-Week MVP

### New tables

- **`leads`**: id, user_id, source_tag, name, email, company, property_name, raw_row (jsonb), resolved_address, latitude, longitude, place_id, footprint_sqft, est_total_sqft, est_bid_amount, enrichment_status, status, notes, created_at, updated_at.
- **`proposal_shares`**: id (uuid, public slug), proposal_id, created_at, accessed_at (nullable), accepted_at, accepted_by_name, accepted_by_title, declined_at, decline_reason.

### Modified tables

- **`bids`**: add nullable `lead_id` FK to `leads`.

### Unchanged tables

- `buildings`, `surfaces`, `line_items`, `user_defaults`, `proposals` stay as-is. The existing bid-and-proposal engine is the heart of the MVP; the new work sits on top.

---

## Success Criteria for the Two-Week MVP

1. Jordan uploads a real trade show attendee CSV and sees the rows enriched with property data and preliminary bid estimates.
2. Jordan clicks from a lead into the existing bid flow with the property data pre-filled, and can generate a proposal end-to-end.
3. Jordan sends a proposal URL (via `mailto:`) to a test customer; the customer opens the URL and clicks Accept without logging in.
4. Jordan opens the pipeline view and sees the funnel: imported → quoted → won.
5. The demo can be walked through in under five minutes.
6. Jordan says one of two things after the demo: "yes, let's keep building this" or "no, here's what's actually the priority". Either answer is a win.
