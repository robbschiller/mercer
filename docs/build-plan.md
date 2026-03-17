# Build Plan: Multifamily Exterior Bid App

This document translates the [product plan](product-plan.md) into a concrete implementation roadmap. Updated to reflect the completed MVP, planned Property Intelligence features, and the path to EagleView integration.

---

## Build Principles

- **Mobile-first, on-site use:** Contractors use it in the parking lot; fast, simple inputs, large tap targets.
- **Bid-in-real-time:** Every change (building count, sq ft, product choice) updates the bid immediately.
- **Flexible, not rigid:** Real properties don't fit templates perfectly. The app should suggest, not constrain.
- **Automate what's tedious:** Use satellite imagery, building footprints, and AI to reduce manual data entry.
- **Output that wins work:** Proposal PDF with per-building breakdown is the primary deliverable.

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
| **Maps** | Google Places API, Google Maps Static API *(planned)* |
| **Building data** | OpenStreetMap Overpass API *(planned)* |
| **AI Vision** | OpenAI GPT-4o or Google Gemini *(planned)* |

---

## Data Model

### Core entities

- **User** — contractor/company (Supabase Auth).
- **Bid** — one property/job. Fields: property name, address, client name, notes, status (draft / sent / won / lost), pricing inputs (coverage sqft/gallon, price/gallon, labor rate/sqft, margin %), latitude, longitude, satellite image URL.
- **Building** — one logical building (or structure) in a bid. Fields: label (free text, e.g. "Six unit 3-story", "Parking covers"), count (how many identical, e.g. 25), sort order.
- **Surface** — one paintable surface on a building. Fields: name (free text, e.g. "Front", "Porch Ceilings", "Posts"), dimensions (jsonb array of factor groups), computed total sq ft. Stored as rows per building, not fixed columns — because every property has a different surface mix.
- **Line Item** — custom add-on cost on a bid (e.g. pressure washing, dumpster rental, scaffolding). Fields: name, amount.
- **User Defaults** — single row per user storing default pricing inputs (coverage, price/gallon, labor rate, margin). Populated bidirectionally: seeded from the first bid's pricing, carried forward to new bids.
- **Proposal** — frozen snapshot of bid + buildings + surfaces + pricing at time of PDF generation. Stored alongside a link to the PDF in Supabase Storage. Client-facing: shows property info, per-building sqft breakdown, scope, and total price without exposing cost structure.

### Why flexible surfaces instead of fixed templates

Rob's field notes show the surface mix varies significantly between properties:
- **Jessups Reserve:** Front, Back, Side A, Side B, Posts, Porch Ceilings, Porch Walls, Porch Side Bands, Porch Floors, Porch Steps, Above Soffit
- **Lancaster Villas:** Front, Back, Sides, Platforms, Middle Ceilings, Stairs, Divider Fences
- **Fountains At Pershing:** Named facades (leasing office side, circle side), Catwalks, Cat Walk Ceilings, Elevator Area, Stairwell Walls, Tunnel Walls, Tunnel Ceiling

A rigid template that says "garden-style = these 8 surfaces" would break on most real properties. Instead: offer **surface presets** (a suggested list of common surfaces) that pre-populate the form, but let the contractor add, remove, or rename any surface freely. The presets speed up input without constraining it.

### Key relationships

- Bid → many Buildings → many Surfaces.
- Bid → many Line Items.
- User → one User Defaults row.
- Pricing inputs (coverage, price/gallon, labor rate, margin) live directly on each bid. No separate Spec table for MVP — keeps things simple. Per-surface specs can be added later.

### Dimension input model

Contractors write measurements as multiplied factors: "Posts 2×10×27" means 2ft × 10ft × 27 posts = 540 sq ft. "Porch Ceilings (8×3×2) + (17×8×9)" means two groups added together.

Each surface supports:
- **Dimension groups** — one or more sets of factors (e.g. [90, 33] = 2,970 sq ft)
- **Multiple groups per surface** — added together (e.g. group 1 + group 2)
- **Or raw square footage** — for flat entries like "Above soffit square footage 1000"
- The app computes and displays the total. The contractor enters numbers the way they already think.

---

## Feature Breakdown & Implementation Order

### 1. Bid and address — COMPLETE ✅

- [x] Auth: sign up / sign in (email + OAuth via Supabase).
- [x] Bids list: create bid, enter address + client name, list/view bids.
- [x] Bid status tracking: draft / sent / won / lost.
- [x] Edit and delete bids.
- [x] Zod validation on all server actions.
- [x] Loading skeletons, error boundaries, not-found pages.
- [x] Form pending states (useFormStatus).
- [x] Client-side navigation (next/link).
- [x] Vercel Web Analytics.
- [x] Collapsible summary cards for all bid detail sections (buildings, pricing, proposals, bid info).
- [x] Bid list cards show building count, total sqft, grand total, and last proposal date.
- [x] Auto-set bid status to "Sent" on first proposal generation.

**Milestone:** Full bid lifecycle from creation to status tracking, with rich summary cards.

### 2. Buildings and surfaces — COMPLETE ✅

- [x] `buildings` table: bid_id, label (text), count (integer, default 1), sort_order, created/updated timestamps.
- [x] `surfaces` table: building_id, name (text), dimensions (jsonb — array of dimension groups), total_sqft (numeric, computed), sort_order.
- [x] Add building to bid: label + count. "Add building" button on bid detail page.
- [x] Building card on bid detail: shows label, count, total sq ft, expand/collapse for surfaces.
- [x] Add surface to building: name input + dimension input (factor multiplication and raw sq ft).
- [x] Surface presets: "Common surfaces" dropdown that pre-populates typical surface names.
- [x] Running total: sum sq ft per building (× count), sum across all buildings on the bid.
- [x] Delete building, delete surface.
- [ ] Reorder buildings and surfaces (drag or up/down arrows). *(deferred)*

**Milestone:** Contractor can walk a property, add buildings with counts, enter surfaces with dimensions, and see total square footage per building and for the whole bid.

### 3. Specs and pricing engine — COMPLETE ✅

- [x] Pricing columns on bids: coverage_sqft_per_gallon, price_per_gallon, labor_rate_per_unit, margin_percent.
- [x] Material calculation: total sq ft ÷ coverage = gallons needed; gallons × price = material cost.
- [x] Labor model: labor rate × total sq ft.
- [x] Margin: percentage markup on materials + labor + line items.
- [x] Custom line items: per-bid add-on costs (e.g. pressure washing, dumpster rental).
- [x] Live bid total: materials + labor + line items + margin; updates in real time as inputs change.
- [x] Company defaults: bidirectional — pricing saved on any bid writes back to user defaults; new bids auto-populate from defaults.
- [x] Settings page: optional page to view/adjust defaults directly.

**Milestone:** Bid detail page shows a dollar amount. Changing any measurement, count, rate, or line item updates the total in real time.

### 4. Proposal PDF — COMPLETE ✅

- [x] `proposals` table: bid_id, snapshot (jsonb — frozen copy of bid + buildings + surfaces + pricing), pdf_url, created_at.
- [x] Client-facing layout: property info, per-building table (label, count, surfaces with dimensions and sqft), total area, scope section (auto-generated from surface names), additional items (line item names only), total price. Does NOT expose material costs, labor rates, or margin.
- [x] Server-side PDF generation via `@react-pdf/renderer` (`renderToBuffer`). Dynamic import to avoid bundling the library on every page.
- [x] PDF stored in Supabase Storage (`proposals` bucket). Public download URL.
- [x] "Generate Proposal" button on bid detail page (disabled when pricing is incomplete).
- [x] Proposal history list with date and download link for each previously generated proposal.
- [ ] Share via email or link. *(deferred to §7)*

**Milestone:** Contractor generates a professional PDF with per-building breakdowns that "shows we did our homework."

### 5. Property Intelligence

Use address autocomplete, satellite imagery, building footprint data, and AI vision to automate building detection and reduce manual data entry.

#### 5a. Address autocomplete (Google Places API)

- [ ] Add Google Places API typeahead to the address field on bid create and bid edit forms.
- [ ] Return structured address + latitude/longitude coordinates.
- [ ] Add `latitude` and `longitude` columns to `bids` table (nullable, populated on address selection).
- [ ] Coordinates feed satellite image and building detection in subsequent steps.

#### 5b. Satellite image + building footprints

- [ ] **Satellite image:** Use Google Maps Static API (`maptype=satellite`, zoom 17–18) centered on the bid's coordinates. Display on the bid detail page. Optionally embed in the proposal PDF for visual context.
- [ ] **Building footprints:** Query OpenStreetMap Overpass API for building polygons within a radius of the coordinates. Extract building count, individual footprint areas (sq meters), and rough shape/grouping data. Free, no API key required.
- [ ] **Google Maps link:** Deep link from the bid detail page to the property on Google Maps.
- [ ] Store `satellite_image_url` on the bid for reuse (avoid re-fetching).

#### 5c. AI vision analysis

- [ ] Send the satellite image to an AI vision model (GPT-4o or Gemini) with a structured prompt.
- [ ] Model returns: suggested building count, building type descriptions (e.g. "2-story garden-style", "3-story stacked flat"), similarity grouping ("buildings A–F appear identical"), auxiliary structures (parking covers, pool house, clubhouse), estimated story count per type.
- [ ] Parse response into a structured building suggestion list.

#### 5d. Pre-populated building list UX

- [ ] "We detected N buildings at this property" review card on bid detail.
- [ ] Suggested buildings list with label, count, and type — contractor can accept all, accept individually, adjust, or dismiss.
- [ ] Accepted suggestions create building rows in the database.
- [ ] Manual building entry still works alongside — suggestions don't block the existing workflow.

**Milestone:** Contractor types an address, sees the property from above, and gets a pre-populated building list before leaving the truck.

### 6. Workflow Efficiency

- [ ] **Duplicate building:** Copy a building with all its surfaces to speed up similar entries.
- [ ] **Bid cloning:** Clone an entire bid (buildings, surfaces, pricing, line items) as a starting point for a similar property.
- [ ] **Surface set templates:** Save a building's surface list as a reusable template that can be applied to new buildings across bids.
- [ ] **Reorder buildings and surfaces:** Drag-to-reorder or up/down arrows.

**Milestone:** Returning users can set up new bids significantly faster using templates, cloning, and duplication.

### 7. Polish and Launch Prep

- [ ] **Mobile responsiveness audit:** Large tap targets, sensible stacking on small screens. The app must work well in a parking lot on a phone.
- [ ] **Confirm-before-delete dialogs:** Prevent accidental deletion of bids, buildings, and surfaces.
- [ ] **Numeric validation:** Sane ranges on pricing inputs (no negatives, no absurd values), clear error messages.
- [ ] **Onboarding hints:** Brief explanation of building count ("25 buildings like this one") and surface presets on first use.
- [ ] **Performance:** Check load times on 3G, optimize data fetching and bundle size if needed.
- [ ] **Share proposals:** Send proposal PDF via email or shareable public link (no auth required to view).
- [ ] **Offline / PWA:** Optional local cache so the form works with spotty cell signal. *(stretch goal)*

---

## Scope Handling

The original plan had scope flags as a separate feature (§4). After reviewing the real data, scope is better handled implicitly through the surface list itself. Each surface the contractor adds is a scope decision — "Porch ceilings: yes, I measured them, they're in scope." Surfaces not added are not in scope.

For the proposal, a "Scope" or "Assumptions" section can be generated from what's present and what's absent — e.g. "Includes: exterior walls, porch ceilings, posts. Does not include: parking structures, interior hallways." This can be a text field on the bid or auto-generated from the surface list.

---

## UI/UX Priorities

- **Single-bid flow:** Open bid → add/edit buildings → enter surfaces → see total update live → generate proposal. Minimize navigation.
- **Collapsible cards:** Each section (bid info, buildings, pricing, proposals) collapses to a read-only summary. Click to expand and edit. All sections can be open simultaneously.
- **Repeater pattern:** "25 buildings like this one" is first-class — count field is prominent, total sq ft multiplies automatically.
- **Dimension input matches field notes:** Enter "90 × 33" and see "2,970 sq ft." Enter "2 × 10 × 27" and see "540 sq ft." Multiple groups add together.
- **Surface presets, not rigid templates:** Suggest common surfaces, let the contractor customize freely.
- **Defaults:** Prefill spec and labor rate from last bid or saved company defaults.
- **Mobile:** Large tap targets, minimal typing, numeric keyboards for dimensions.

---

## Future Phases (Out of Scope for Current Roadmap)

### Phase 2 — Bid Intelligence

- Bid analytics dashboard (win rate, average $/sqft, pipeline value).
- Benchmarking: "typical range for this property type in this region."
- Requires accumulating real bid data first — gated on user adoption.

### Phase 3 — EagleView Integration

- Replace or augment satellite + AI building detection with EagleView's aerial measurement API for accurate wall areas, window/door counts, and trim measurements.
- Property Intelligence (§5) is the stepping stone — same "enter address, get building data" UX, but EagleView provides more accurate data.
- Gated on business prerequisites: developer account, API access, per-report pricing model.
- See [docs/eagleview-integration-plan.md](eagleview-integration-plan.md) for full technical plan.

### Other future items

- Multi-user/team or company hierarchy.
- Invoicing or scheduling.
- Substrate-specific pricing (per-surface specs instead of one spec per bid).

---

## Success Criteria

### MVP (complete)

1. Contractor can create a bid, add multiple building types with counts and surface measurements, and see a live bid total in dollars.
2. Dimension input matches how contractors already think — enter factors, see computed sq ft.
3. Proposal PDF generates with per-building square footage breakdown.
4. Usable on a phone in a parking lot.
5. A real bid (e.g. Jessups Reserve) can be fully entered and produces a reasonable proposal.

### Property Intelligence (next)

6. Contractor types an address, sees a satellite view, and gets a suggested building count and types — reducing manual setup time by 50%+.
7. AI-suggested building list is accurate enough that the contractor accepts most suggestions with minor adjustments.
