# Build Plan: Multifamily Exterior Bid App

This document translates the [product plan](product-plan.md) into a concrete implementation roadmap for Phase 1 (MVP). Updated to reflect what's built, real field data from [Rob's measurement notes](property-measurement-rawdata.md), and lessons from [interview 2](interview002.md).

---

## Build Principles

- **Mobile-first, on-site use:** Contractors use it in the parking lot; fast, simple inputs, large tap targets.
- **Bid-in-real-time:** Every change (building count, sq ft, product choice) updates the bid immediately.
- **Flexible, not rigid:** Real properties don't fit templates perfectly. The app should suggest, not constrain.
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
| **PDF** | TBD — React-PDF, Puppeteer, or PDFKit |
| **Hosting** | Vercel |
| **Analytics** | Vercel Web Analytics |

---

## Data Model (MVP)

### Core entities

- **User** — contractor/company (Supabase Auth).
- **Bid** — one property/job. Fields: address, client name, notes, status (draft / sent / won / lost).
- **Building** — one logical building (or structure) in a bid. Fields: label (free text, e.g. "Six unit 3-story", "Parking covers"), count (how many identical, e.g. 25), sort order.
- **Surface** — one paintable surface on a building. Fields: name (free text, e.g. "Front", "Porch Ceilings", "Posts"), dimensions or raw square footage, computed total sq ft. Stored as rows per building, not fixed columns — because every property has a different surface mix.
- **Spec** — product system (e.g. Sherwin-Williams line), coverage rate (sq ft/gallon), price per gallon; optionally substrate-specific.
- **Proposal** — snapshot of bid + buildings + surfaces + pricing at time of generation; links to PDF.

### Why flexible surfaces instead of fixed templates

Rob's field notes show the surface mix varies significantly between properties:
- **Jessups Reserve:** Front, Back, Side A, Side B, Posts, Porch Ceilings, Porch Walls, Porch Side Bands, Porch Floors, Porch Steps, Above Soffit
- **Lancaster Villas:** Front, Back, Sides, Platforms, Middle Ceilings, Stairs, Divider Fences
- **Fountains At Pershing:** Named facades (leasing office side, circle side), Catwalks, Cat Walk Ceilings, Elevator Area, Stairwell Walls, Tunnel Walls, Tunnel Ceiling

A rigid template that says "garden-style = these 8 surfaces" would break on most real properties. Instead: offer **surface presets** (a suggested list of common surfaces) that pre-populate the form, but let the contractor add, remove, or rename any surface freely. The presets speed up input without constraining it.

### Key relationships

- Bid → many Buildings → many Surfaces.
- Bid → one active Spec (or spec per surface type, later).
- Labor: per-unit rate × unit count; formula in app logic, stored on bid or as company defaults.

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

**Milestone:** Contractor can walk a property, add buildings with counts, enter surfaces with dimensions, and see total square footage per building and for the whole bid — matching the format of Rob's phone notes but computed automatically.

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

### 4. Proposal PDF

- [ ] `proposals` table: bid_id, snapshot (jsonb — frozen copy of bid + buildings + surfaces + pricing), pdf_url, created_at.
- [ ] Layout: cover page (address, client, date, contractor), per-building table (label, count, surfaces with sq ft, cost), totals summary (materials, labor, margin, grand total), scope notes.
- [ ] Generate PDF server-side; store in Supabase Storage or similar.
- [ ] Download button on bid detail page.
- [ ] Optional: share via email or link.

**Milestone:** Contractor generates a professional PDF with per-building breakdowns that "shows we did our homework."

### 5. Polish and launch prep

- [ ] Mobile responsiveness audit: large tap targets, sensible stacking on small screens.
- [ ] Validation: required fields, sane numeric ranges, confirm before delete.
- [ ] Onboarding: brief explanation of count ("25 buildings like this one") and surface presets.
- [ ] Performance: check load times on 3G, optimize if needed.
- [ ] Offline: optional PWA or local cache so the form works with spotty signal (stretch goal).

---

## Scope Handling

The original plan had scope flags as a separate feature (§4). After reviewing the real data, scope is better handled implicitly through the surface list itself. Each surface the contractor adds is a scope decision — "Porch ceilings: yes, I measured them, they're in scope." Surfaces not added are not in scope.

For the proposal, a "Scope" or "Assumptions" section can be generated from what's present and what's absent — e.g. "Includes: exterior walls, porch ceilings, posts. Does not include: parking structures, interior hallways." This can be a text field on the bid or auto-generated from the surface list.

---

## UI/UX Priorities

- **Single-bid flow:** Open bid → add/edit buildings → enter surfaces → see total update live → generate proposal. Minimize navigation.
- **Repeater pattern:** "25 buildings like this one" is first-class — count field is prominent, total sq ft multiplies automatically.
- **Dimension input matches field notes:** Enter "90 × 33" and see "2,970 sq ft." Enter "2 × 10 × 27" and see "540 sq ft." Multiple groups add together.
- **Surface presets, not rigid templates:** Suggest common surfaces, let the contractor customize freely.
- **Defaults:** Prefill spec and labor rate from last bid or saved company defaults.
- **Mobile:** Large tap targets, minimal typing, numeric keyboards for dimensions.

---

## Out of Scope for MVP

- EagleView or any aerial/satellite integration (Phase 3).
- Benchmarking / "typical range" sanity checks (Phase 2).
- Multi-user/team or company hierarchy.
- Invoicing or scheduling.
- Substrate-specific pricing (simplify to one spec per bid for MVP; per-surface specs later).

---

## Success Criteria for MVP

1. Contractor can create a bid, add multiple building types with counts and surface measurements, and see a live bid total in dollars.
2. Dimension input matches how contractors already think — enter factors, see computed sq ft.
3. Proposal PDF generates with per-building square footage breakdown.
4. Usable on a phone in a parking lot.
5. A real bid (e.g. Jessups Reserve) can be fully entered and produces a reasonable proposal.
