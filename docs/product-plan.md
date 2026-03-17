# Product Plan: Multifamily Exterior Bid App

**The core concept:** An app specifically for exterior renovation contractors bidding multifamily properties. Enter an address, get a bid-ready proposal.

---

## Current State

The MVP is complete. The full bid-to-proposal workflow works end-to-end:

- Create a bid with property name, address, client name, and notes
- Add building types with counts and paintable surfaces with dimension-factor input
- Price the bid with coverage rates, labor, margin, and custom line items
- Generate a client-facing proposal PDF with per-building breakdowns
- Track bid status (draft / sent / won / lost) with automatic status updates

The app is deployed on Vercel, uses Supabase for auth, database, and file storage, and is built with Next.js 15, React 19, and Tailwind CSS 4. See the [build plan](build-plan.md) for full technical details.

---

## The Market Landscape

**The "measure from blueprints" category** is crowded. STACK, PlanSwift, Groundplan, The EDGE, Buildxact — they all let you upload a PDF floor plan or elevation drawing and do digital takeoffs. The problem for Rob is he almost never has blueprints. The transcript confirmed that 75–80% of his jobs start with a phone call, not a document.

**The "measure from photos on-site" category** is dominated by Hover. Hover is trained on over 10 million homes and creates precise measurements for roofing, siding, and interiors from a phone scan or blueprint upload. It's genuinely good — but it's built primarily for single-family residential. For multifamily, Hover only generates measurements for the specific unit you captured, not adjacent units — each one must be scanned separately. A 49-building complex like the one in the transcript would be a nightmare workflow.

**The "fully remote aerial measurement" category** is dominated by EagleView, and this is the most important competitive signal. Just weeks ago, EagleView launched 3D property intelligence with high-accuracy walls, windows, and door measurements for both residential and commercial properties — reducing or eliminating the need for site visits entirely. They specifically offer multifamily property reports and guarantee accuracy on roof measurements for multi-family and low-slope buildings. EagleView is a massive, well-funded enterprise player with 300+ patents and imagery covering 94% of the U.S. population. **This is important — the big dog just moved into the space Rob needs most.**

---

## Where the Gap Is (Your Niche)

Here's what none of these tools do well, and what the transcript makes crystal clear:

**None of them close the loop from measurement to bid for exterior renovation on multifamily.** EagleView gives you measurements. STACK lets you do takeoffs from plans. But Rob's workflow isn't "measure → done." It's:

1. Measure exterior square footage per building type
2. Apply paint specs (Sherwin-Williams product system, coverage rate, price per gallon)
3. Calculate materials by substrate (stucco vs. wood vs. metal)
4. Add caulking, bleach, patching, lifts, tape/paper
5. Calculate labor by unit count at a per-unit rate
6. Add margin
7. Output a proposal PDF with building breakdowns that "shows we did our homework"

That full chain — from property address to bid-ready proposal — doesn't exist in one tool for this specific trade and property type. EagleView gets you step 1. The estimating tools handle steps 2–6 if you already have plans. Nobody connects them, and nobody speaks the language of the exterior repaint contractor working multifamily.

---

## The Product Phases

### Phase 1 — The MVP (complete)

The honest truth is you can't out-EagleView EagleView on remote aerial measurement — they have satellites, drones, and 300 patents. But you don't need to. The real insight from the transcript is that Rob *does* visit properties. The friction isn't that he has to go — it's that when he's there, he's manually measuring with a tape or pacing perimeters, then re-entering everything into a spreadsheet at home. The smarter MVP is an on-site measurement app that's purpose-built for multifamily exterior. Think: pull up the property address, log measurements for each building type as you walk it (with a simple repeater — "25 buildings like this one"), and have the bid calculate in real time before you leave the parking lot.

**What makes it specific enough to win:**

- Flexible surface entry for any multifamily property — no rigid templates that break on real buildings
- Surface presets that speed up input without constraining it
- Per-unit labor pricing (the way Rob's crews are actually paid)
- A proposal output that includes the per-building square footage breakdown that property managers love ("shows we did our homework")
- Company defaults that carry pricing forward across bids — enter rates once, use everywhere
- Collapsible summary cards so the contractor sees the big picture at a glance and drills in to edit

### Phase 1.5 — Property Intelligence (next)

Before investing in expensive aerial measurement APIs, use freely available satellite imagery and AI to automate the most tedious part of bid setup: counting and categorizing buildings.

**Address autocomplete** — Google Places API typeahead replaces free-text address entry. Returns a validated address with lat/lng coordinates that power everything below.

**Satellite validation** — Display a Google Maps satellite image of the property on the bid detail page. The contractor immediately confirms they have the right property. The satellite view can also be embedded in the proposal PDF for visual context.

**Automated building detection** — Query OpenStreetMap building footprint data at the property coordinates to detect how many buildings exist. Combined with AI vision analysis of the satellite image, the app suggests a building list with types ("2-story garden-style x 25", "clubhouse x 1", "parking covers x 4") and counts. The contractor reviews, adjusts, and accepts — buildings are pre-created in the bid.

**What this automates:**
- Building count — no more manually counting buildings in the parking lot
- Building type identification — AI suggests labels based on visual appearance
- Similarity grouping — "25 of these, 2 of those" detected automatically
- Auxiliary structure identification — parking covers, clubhouse, pool house flagged separately

**Why this comes before EagleView:** It uses free or low-cost APIs (Google Maps free tier, OpenStreetMap, AI vision), proves the "enter address, get building data" UX pattern, and delivers immediate value without a vendor relationship or per-report costs. When EagleView is integrated later, it slots into the same UX — just with more accurate measurement data.

### Phase 1.5 — Workflow Efficiency (parallel)

Alongside Property Intelligence, add workflow features that make power users faster:

- **Duplicate building** — copy a building with all its surfaces
- **Bid cloning** — clone an entire bid for a similar property
- **Surface set templates** — save and reuse a building's surface list across bids
- **Share proposals** — send proposal PDF via email or shareable link

### Phase 2 — Bid Intelligence (future)

Once you have real projects in the system, you start accumulating something no one else has: actual bid data on exterior repaints of multifamily properties — what properties cost per square foot by region, building age, substrate type, and product system. That benchmarking data becomes the intelligence layer that makes sanity-checking a bid instant. "You're at $0.42/sq ft for a stucco property in Florida — typical range is $0.38–0.51." That's genuinely useful and genuinely defensible.

Additional Phase 2 features:
- Bid analytics dashboard (win rate, average $/sqft, pipeline value)
- Substrate-aware material calculation (stucco vs. wood trim vs. metal railings as different line items)
- Sherwin-Williams and PPG spec integration — pick the product system, it knows the coverage rate

### Phase 3 — EagleView Integration (future)

Once the product has traction and the workflow is proven, you integrate EagleView's API for the measurement step. Now it's truly remote — enter an address, aerial data populates the building measurements with accurate wall areas, window/door counts, and trim measurements. The contractor confirms or adjusts anything the aerial data can't see (breezeways, covered walkways, interior courtyards), and the bid is done. EagleView becomes a data supplier rather than a competitor because you own the bid workflow they don't touch.

Property Intelligence (Phase 1.5) is the stepping stone — same UX, same "enter address and get building data" flow, but EagleView provides higher-accuracy measurements that can pre-fill surface dimensions, not just building counts.

See [docs/eagleview-integration-plan.md](eagleview-integration-plan.md) for the full technical plan.

---

## The Strategic Position in One Sentence

**EagleView owns aerial measurement. STACK owns blueprint takeoff. Nobody owns the bid workflow for the exterior renovation contractor standing in a multifamily parking lot.**

That's the niche. You have family in it, domain expertise from day one, and a clear beachhead customer in Rob's company.
