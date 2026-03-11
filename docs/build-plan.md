# Build Plan: Multifamily Exterior Bid App

This document translates the [product plan](product-plan.md) into a concrete implementation roadmap for Phase 1 (MVP).

---

## Build Principles

- **Mobile-first, on-site use:** Contractors use it in the parking lot; fast, offline-capable, simple inputs.
- **Bid-in-real-time:** Every change (building count, sq ft, product choice) updates the bid immediately.
- **Output that wins work:** Proposal PDF with per-building breakdown is the primary deliverable.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| **Frontend** | Next.js (App Router) |
| **Backend** | Next.js (API routes, Server Components, Server Actions) |
| **Data** | Postgres via Supabase |
| **Auth** | Supabase Auth |
| **UI** | shadcn/ui (Radix primitives + Tailwind) |
| **PDF** | React-PDF, Puppeteer, or server-side template (e.g. PDFKit) — TBD |
| **Hosting** | Vercel (native Next.js support) |

Single stack: Next.js handles both UI and API; Supabase provides Postgres and auth; shadcn/ui supplies accessible, customizable components. Add offline/PWA later if needed.

---

## Data Model (MVP)

### Core entities

- **User** — contractor/company (auth provider).
- **Project** — one property/job. Fields: address, client name, optional notes, status (draft / sent / won / lost).
- **Building** — one logical building in a project. Fields: building type (template id), label (e.g. "A", "Building 1"), count (e.g. 25 "like this one"), measurements (see below).
- **BuildingType (template)** — e.g. garden-style, stacked flat, townhome, breezeway. Defines which surfaces/inputs to show (stucco sq ft, wood trim, metal railings, doors, windows, etc.).
- **MeasurementSet** — per building (or per building × count): surface areas, linear feet, counts. Stored as flexible key-value or a structured JSON/columns so new surface types can be added.
- **Spec** — product system (e.g. Sherwin-Williams product line), coverage rate, price per gallon; optionally substrate-specific.
- **Proposal** — snapshot of project + buildings + pricing at time of generation; links to generated PDF.

### Key relationships

- Project → many Buildings. Building → one BuildingType, one MeasurementSet (or inline).
- Project → one active Spec (or spec per surface type).
- Labor: stored as per-unit rate and unit count (e.g. doors, units); formula in app logic.

---

## Feature Breakdown & Implementation Order

### 1. Project and address (Week 1)

- [ ] Auth: sign up / sign in (email or Google).
- [ ] Projects list: create project, enter address + client name, list/view projects.
- [ ] No buildings yet; just CRUD for projects.

### 2. Building types and measurements (Weeks 2–3)

- [ ] Seed or admin: define 2–3 building type templates (e.g. garden-style, breezeway) with surface fields (stucco sq ft, wood trim sq ft, door count, etc.).
- [ ] Add building to project: choose building type, optional label, **count** (e.g. 25).
- [ ] Measurement form: inputs for each surface type from template; save to MeasurementSet.
- [ ] Repeat for multiple building types per project (e.g. 25 garden-style + 3 breezeways).

### 3. Specs and pricing engine (Weeks 3–4)

- [ ] Spec model: product system name, coverage (sq ft/gallon), price per gallon; optional substrate overrides.
- [ ] Project uses one spec (or one per surface) for material cost.
- [ ] Labor: per-unit rate × unit count (from building types); store rate on project or in app config.
- [ ] Compute in real time: materials (gallons, cost) + labor + margin; show running total and per-building breakdown.

### 4. Scope flags (Week 4)

- [ ] Per building type: optional scope questions (e.g. "Catwalks/breezeways in scope?", "Patio ceilings?").
- [ ] Store answers; surface in proposal as “Assumptions” or “Scope” so property managers see them.

### 5. Proposal PDF (Weeks 5–6)

- [ ] Proposal snapshot: save project + buildings + measurements + pricing at generate time.
- [ ] Layout: cover (address, client, date), per-building table (type, count, sq ft, key surfaces), material/labor/margin summary, assumptions/scope.
- [ ] Generate PDF (React-PDF or server-side); store file and link from Proposal.
- [ ] Download / share (email or link).

### 6. Polish and launch prep (Week 7)

- [ ] Offline: optional PWA or cache project/building types so form works with spotty signal.
- [ ] Validation: required fields, sane ranges, “confirm before leaving” if unsaved.
- [ ] Onboarding: one-time tips for “count” and building types.

---

## UI/UX Priorities

- **Single-project flow:** Open project → add/edit buildings → see bid total update live → generate proposal. Minimize steps.
- **Repeater pattern:** “25 buildings like this one” is first-class (count field prominent).
- **Defaults:** Prefill coverage and labor from last project or company defaults.
- **Mobile:** Large tap targets, minimal typing; consider dropdowns and steppers for numbers.

---

## Out of Scope for MVP

- EagleView or any aerial/satellite integration (Phase 3).
- Benchmarking / “typical range” sanity checks (Phase 2).
- Multi-user/team or company hierarchy (can add after first customer).
- Invoicing or scheduling (stay focused on bid → proposal).

---

## Success Criteria for MVP

1. Contractor can create a project, add 2+ building types with counts and measurements, and see a live bid total.
2. Proposal PDF generates with per-building square footage (and key surfaces) so it “shows we did our homework.”
3. Scope assumptions (e.g. breezeways, patio ceilings) are visible on the proposal.
4. Usable on a phone in a parking lot (responsive or PWA).

---

## Next Step

Initialize the repo with the chosen stack (e.g. `npx create-next-app` + Supabase project), define the schema in migrations, and implement **§1 Project and address** first.
