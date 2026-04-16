# Plan: Mercer — From Bid Tool to Sales Platform

**The core concept:** An app specifically for exterior renovation contractors bidding multifamily properties. Upload a trade show attendee list, get enriched leads with property intelligence, build bids, send shareable proposals, close deals — all in one place.

---

## Market & Niche

**The "measure from blueprints" category** is crowded. STACK, PlanSwift, Groundplan, The EDGE, Buildxact — they all let you upload a PDF floor plan or elevation drawing and do digital takeoffs. The problem for Rob is he almost never has blueprints. The transcript confirmed that 75–80% of his jobs start with a phone call, not a document.

**The "measure from photos on-site" category** is dominated by Hover. Hover is trained on over 10 million homes and creates precise measurements for roofing, siding, and interiors from a phone scan or blueprint upload. It's genuinely good — but it's built primarily for single-family residential. For multifamily, Hover only generates measurements for the specific unit you captured, not adjacent units — each one must be scanned separately. A 49-building complex like the one in the transcript would be a nightmare workflow.

**The "fully remote aerial measurement" category** is dominated by EagleView. They recently launched 3D property intelligence with high-accuracy walls, windows, and door measurements for both residential and commercial properties, and they specifically offer multifamily property reports. EagleView is a massive, well-funded enterprise player. **This is important — the big dog is in the measurement space.**

**The "construction CRM" category** is dominated by Procore, but Procore is oriented toward new construction and large general contractors, not renovation trades. Jordan's Salesforce experiment worked functionally but failed operationally because it was too generic — it didn't understand bids, takeoffs, or multifamily workflows. There is no CRM purpose-built for exterior renovation contractors.

### Where the gap is

None of these tools close the loop from **lead acquisition → measurement → bid → proposal → close** for exterior renovation on multifamily. EagleView gives you measurements. STACK lets you do takeoffs from plans. Salesforce and Procore give you pipelines. Nobody connects them, and nobody speaks the language of the exterior repaint contractor.

That full chain doesn't exist in one tool for this specific trade and property type.

### The strategic position in one sentence

**EagleView owns aerial measurement. STACK owns blueprint takeoff. Salesforce owns the generic pipeline. Nobody owns the full lead-to-close workflow for the exterior renovation contractor working multifamily.**

That's the niche. You have family in it, domain expertise from day one, a clear beachhead customer in Rob's company, and a committed design partner in Jordan.

---

## Current State

The bid-to-proposal workflow is complete and live at mercer-bids.vercel.app. The app covers:

- Create a bid via a short flow: address first (Places autocomplete), confirm with satellite + suggested name, then property name, client, and notes. Satellite imagery via Maps Static API, `satellite_image_url` stored on the bid.
- Add building types with counts and paintable surfaces with dimension-factor input.
- Price the bid with coverage rates, labor, margin, and custom line items.
- Generate a client-facing proposal PDF with per-building breakdowns and optional satellite imagery.
- Track bid status (draft / sent / won / lost) with automatic status updates.
- OpenStreetMap footprints on bid detail when coordinates are available.

The app is deployed on Vercel, uses Supabase for auth, database, and file storage, and is built with Next.js 15, React 19, and Tailwind CSS 4.

---

## The Shift: From Bid Tool to Sales Platform

Jordan's walkthrough of AQP's full workflow surfaced something important: the bid tool is the middle of a longer funnel. Upstream, Jordan and his team struggle with trade show attendee lists — hundreds of contacts with no phone numbers, no property addresses, no prioritization. Downstream, proposals sent as PandaDoc PDFs disappear into inboxes with no visibility into whether they've been opened, approved, or ignored.

Mercer already has the unique ingredient to solve the upstream problem: **property intelligence**. The same Google Places + OSM pipeline that powers Phase 1.5 can be pointed at a raw CSV and turn a list of names into enriched, prioritized, bid-ready leads. That's something no generic CRM can do.

The downstream problem is equally solvable. Replacing the PDF-in-email pattern with a hosted, shareable proposal URL that the customer can accept directly converts Mercer from a document generator into a closing tool.

**This reframes Mercer's positioning.** It's no longer "a better bid tool for painting contractors." It's "the sales platform for exterior renovation — from trade show list to signed deal." The bid engine is the heart; the lead ingestion and deal closure are the arteries.

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
| **Frontend** | Next.js 15 (App Router), React 19 |
| **Backend** | Next.js (Server Components, Server Actions) |
| **Data** | Postgres via Supabase, Drizzle ORM |
| **Auth** | Supabase Auth |
| **UI** | shadcn/ui (Radix primitives + Tailwind 4) |
| **Validation** | Zod |
| **PDF** | @react-pdf/renderer |
| **Hosting** | Vercel |
| **Analytics** | Vercel Web Analytics |
| **Maps** | Places API (New) — address autocomplete; Maps Static API — satellite thumbnails |
| **Building data** | OpenStreetMap Overpass API |
| **CSV parsing** | Papa Parse (client-side) |

---

## Two-Week MVP: Lead-to-Close Proof of Concept

**Goal:** Deliver a working end-to-end flow to Jordan within two weeks that demonstrates:
**CSV upload → enriched leads → bid creation → shareable proposal URL → customer acceptance → deal closed.**

This is a proof of concept, not a production release. It proves the strategic thesis (that Mercer can expand beyond bidding into full sales platform territory) without committing to the full ERP scope Jordan described (contracts, schedules, expense tracking, sub management, punch lists). Those remain future work.

### Pre-Work (Day 0, before the two-week clock starts)

- [ ] **Validate enrichment pipeline on 10 known multifamily properties.** Run company name + property name through Google Places, pull OSM footprints, compare to known sqft. If resolution rate is below ~60% or footprint accuracy is off by more than ~25%, the enrichment pitch needs to be softened in the demo.
- [ ] **Get a real trade show attendee CSV from Jordan.** Confirm what columns actually show up and what's missing (phone, address, etc.). This shapes the column mapping logic and sets realistic expectations.

### Phase A — Lead Ingestion (Days 1–2)

#### A1. CSV upload

- [ ] `leads` table: id, user_id, source_tag (text), name, company, email, property_name, raw_row (jsonb), status (enum: new / quoted / won / lost), created_at.
- [ ] Upload page at `/leads/import` with a file picker accepting `.csv`.
- [ ] Parse CSV client-side with Papa Parse, show a preview of the first 10 rows before committing the import.
- [ ] Hardcoded column mapping UI: map detected columns to Name, Email, Company, Property Name. Unmapped columns are stored on `raw_row` for later.
- [ ] Source tag input: single text field ("NAA Orlando 2026") applied to every row in the import.
- [ ] Bulk insert to `leads` table on confirm. No deduplication in MVP.

#### A2. Lead list view

- [ ] `/leads` page with a table: Name, Company, Property, Est. Sqft, Est. Bid, Status, Actions.
- [ ] Sort by Est. Bid descending by default so biggest opportunities surface first.
- [ ] Filter by source_tag.
- [ ] Status dropdown (inline edit): New / Quoted / Won / Lost.

**Milestone:** Jordan uploads a real attendee list and sees it as a structured table in the app.

### Phase B — Property Intelligence Enrichment (Days 3–6)

#### B1. Enrichment worker

- [ ] Server action `enrichLead(leadId)` that:
  - Builds a Places query from company + property name (fall back to company alone if property is empty).
  - Fetches one Google Places result; stores the formatted address, lat/lng, and place_id on the lead.
  - If coordinates resolve, queries Overpass for building footprints within ~75m.
  - Computes rough exterior sqft using footprint × default story count (2) × perimeter-to-height multiplier (1.3 — use whatever Phase 1.5 validation produced).
  - Applies user's default $/sqft to generate a preliminary bid estimate.
  - Writes back to the lead row: `resolved_address`, `latitude`, `longitude`, `place_id`, `footprint_sqft`, `est_total_sqft`, `est_bid_amount`, `enrichment_status` (pending / success / needs_review / failed).
- [ ] Trigger enrichment on import: fire off enrichment for all rows in the batch, update the UI as rows complete.
- [ ] Display enrichment status in the lead list: a spinner while pending, a badge when complete, a "needs review" flag if resolution failed.

#### B2. Lead detail view

- [ ] `/leads/[id]` page showing: contact info, resolved address, satellite thumbnail (reuse existing satellite proxy), footprint count and total sqft, est. bid amount, notes field.
- [ ] "Create Bid" button that takes the user into the existing bid creation flow.
- [ ] Manual override on enriched fields in case the auto-resolved address is wrong.

**Milestone:** Every imported lead is either enriched with property data and a preliminary bid estimate, or clearly flagged as needing manual review.

### Phase C — Lead-to-Bid Conversion (Day 7)

- [ ] Add `lead_id` (nullable) to the `bids` table.
- [ ] "Create Bid" from a lead pre-populates: property name, address, lat/lng, place_id, and seeds the satellite image URL.
- [ ] The bid carries `lead_id` so conversion can be tracked.
- [ ] Back-reference on the lead detail page: "This lead has a bid in progress → [Bid #]".
- [ ] Auto-update lead status to "Quoted" when a proposal is generated from that bid.

**Milestone:** A user can go from a single row in the lead table to the existing bid creation flow in one click, with all the property data pre-filled.

### Phase D — Shareable Proposal URL (Days 8–10)

#### D1. Public proposal page

- [ ] New table `proposal_shares`: id (uuid, used as the public slug), proposal_id, created_at, accepted_at, accepted_by_name, declined_at, decline_reason.
- [ ] Public route at `/p/[slug]` — no auth required. Renders the proposal in HTML (not PDF).
- [ ] Reuse the existing proposal snapshot data. Render property info, per-building breakdown, scope, total price, and satellite image.
- [ ] Add a prominent Accept / Decline button pair at the bottom of the page.
- [ ] On Accept: show a lightweight form (customer name, title, optional note), confirm, set `accepted_at` and `accepted_by_name`.
- [ ] On Decline: show a form (optional reason dropdown: Price / Timing / Chose Another Vendor / Other + note field), confirm, set `declined_at` and `decline_reason`.
- [ ] Post-acceptance screen: "Thanks, {salesperson name} will be in touch to schedule next steps."

#### D2. Send proposal flow

- [ ] "Share Proposal" button on the bid detail page creates a `proposal_shares` row and shows the resulting URL.
- [ ] "Copy Link" button puts the URL on the clipboard.
- [ ] "Email Proposal" button opens a `mailto:` link with the customer email (from the originating lead), a pre-filled subject, and a body that includes the proposal URL. No SMTP infrastructure needed for MVP — Jordan sends through his own mail client.
- [ ] Bid detail page shows the share status: sent date, view count (optional — add only if trivial), accepted/declined status.

#### D3. Status propagation

- [ ] When a proposal is accepted, the bid status flips to "Won" and the originating lead status flips to "Won."
- [ ] When declined, bid status flips to "Lost" and lead status flips to "Lost."
- [ ] Confirmation email out of scope for MVP — the status change in the dashboard is enough for the demo.

**Milestone:** A customer receives an email with a URL, opens the proposal in their browser, clicks Accept, and the deal shows as Won in Jordan's pipeline without anyone else touching the system.

### Phase E — Pipeline View (Days 11–12)

- [ ] `/pipeline` page with five counts: Leads, Quoted, Won, Lost, and Total Pipeline $ Value (sum of est_bid_amount + actual bid amounts).
- [ ] Filter by source_tag to see the NAA Orlando funnel specifically.
- [ ] Simple funnel visual: Leads → Quoted → Won, with conversion rates between each stage.
- [ ] Link each count to a filtered view of the underlying records.

**Milestone:** Jordan sees a single dashboard that tells the story "we imported 247 leads from NAA Orlando, enriched 198 of them, quoted 34, and have closed 8 for $1.2M."

### Phase F — Demo Prep & Polish (Days 13–14)

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

2. **Does this become the first customer of a new business?** Jordan raised the idea of Reno Base being the first customer of something larger — an AI-enabled CRM for renovation contractors. The demo is the artifact that makes that conversation concrete. A working proof of concept is far more persuasive than a pitch deck.

3. **What's the right next slice?** Likely candidates after the two-week MVP:
   - Proposal photos (Rob's existing request, carryover from Phase 1.5 roadmap)
   - Real email sending + open tracking
   - Customer accounts with historical proposals and colors
   - The first piece of Jordan's ERP scope — probably a simple "Jobs" view where a won deal becomes a trackable project

Don't commit to the next slice before seeing how Jordan actually uses the MVP.

---

## Longer-Term Roadmap (Post-MVP)

These remain on the horizon but are gated on learnings from the two-week MVP.

### Property Intelligence (resumes after MVP)

AI vision analysis on satellite imagery to suggest building count, type, and grouping. Pre-populated building list UX on bid creation. Originally §5c–§5d of the Phase 1.5 plan.

### EagleView Integration

Once the product has traction and the workflow is proven, integrate EagleView's API for higher-accuracy measurement data. Property Intelligence is the stepping stone — same UX, same "enter address and get building data" flow, but with higher-accuracy measurements that pre-fill surface dimensions, not just building counts.

### Bid Intelligence

Once real project data accumulates, build benchmarking: "typical $/sqft range for this property type in this region." Substrate-aware material calculation. Sherwin-Williams and PPG spec integration.

### Jordan's ERP Layer

The full downstream workflow — contracts, schedules, expense buckets by takeoff category, sub tracker, punch lists, paint guides, NPS. This is where Mercer could become the operating system for Reno Base (and eventually sell to other renovation contractors). Each piece is its own multi-week scope and should only be tackled after MVP validation and a clear ownership/business-model decision with Jordan.

---

## Data Model Changes for the Two-Week MVP

### New tables

- **`leads`** — id, user_id, source_tag, name, email, company, property_name, raw_row (jsonb), resolved_address, latitude, longitude, place_id, footprint_sqft, est_total_sqft, est_bid_amount, enrichment_status, status, notes, created_at, updated_at.
- **`proposal_shares`** — id (uuid, public slug), proposal_id, created_at, accessed_at (nullable), accepted_at, accepted_by_name, accepted_by_title, declined_at, decline_reason.

### Modified tables

- **`bids`** — add nullable `lead_id` FK to `leads`.

### Unchanged tables

- `buildings`, `surfaces`, `line_items`, `user_defaults`, `proposals` stay as-is. The existing bid-and-proposal engine is the heart of the MVP; the new work sits on top.

---

## Success Criteria for the Two-Week MVP

1. Jordan uploads a real trade show attendee CSV and sees the rows enriched with property data and preliminary bid estimates.
2. Jordan clicks from a lead into the existing bid flow with the property data pre-filled, and can generate a proposal end-to-end.
3. Jordan sends a proposal URL (via `mailto:`) to a test customer; the customer opens the URL and clicks Accept without logging in.
4. Jordan opens the pipeline view and sees the funnel: imported → quoted → won.
5. The demo can be walked through in under five minutes.
6. Jordan says one of two things after the demo: "yes, let's keep building this" or "no, here's what's actually the priority" — either answer is a win.