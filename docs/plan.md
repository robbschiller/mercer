# Mercer — Work plan

This document is the **live execution tracker**: what is shipped, what is next, what is paused, and what decisions block progress.

**Strategy, positioning, personas, full product scope, AI principles, data-model vision, and milestone roadmap philosophy** live in **[`docs/prd.md`](prd.md)**. Read the PRD for *why*; read this file for *what we are doing now*.

Session-by-session implementation notes: [`docs/worklog.md`](worklog.md). Contributor workflow: [`AGENTS.md`](../AGENTS.md).

---

## Product snapshot (today)

The deployed app is **Phase 0**: a proof of the data model and the non-AI surfaces for **lead → bid → shareable proposal → accept/decline → pipeline visibility**, with Places-based lead enrichment, manual overrides, and dashboard funnel metrics. PRD §1 reframes the product as an **AI-native workflow engine with record-keeping** (not a system of record with AI bolted on). **None of the AI-native operations in PRD §5 ship yet**: no qualification agent, no capture/takeoff agent, no scope reconciliation, no negotiation agent, no NL reporting. Phase 1 starts from here. See **PRD §8** for the authoritative shipped list.

---

## PRD alignment — where engineering should focus next

These rows connect **near-term repo work** to **PRD sections**. “Next” is suggestive ordering; adjust in *Open now* below when priorities change.

| PRD area | § | Shipped (high level) | Gap / next |
|----------|---|----------------------|------------|
| Lead capture & qualification | 5.1 | CSV import, mapping, source tags, manual single-lead entry, Places lookup for office address, lead list/detail, statuses | PRD wants a **qualification agent**: portfolio resolution, public-data pull, paint-timing score, generated brief, confidence-scored ranking (`qualification_score`, `qualification_brief`, `agent_run_id`). Today the lead layer is basic contact + office-address enrichment; satellite and property-address capture belong to the bid layer. |
| Capture & takeoff | 5.2 | Manual bid flow: buildings, surfaces, pricing, PDF proposal | PRD **Milestone 1**: mobile capture + vision-based takeoff agent with confidence-scored draft, form as edit surface, graceful fallback to manual. Not started. |
| Scope reconciliation | 5.3 | — | PRD **Milestone 2**: structured scope object with `source_type`/`source_ref`, spec-PDF parsing, customer-request ingestion, `scope_flag` UI, reconciliation agent. Not started. |
| Proposal as live surface | 5.4 | Public `/p/[slug]`, accept/decline, share link, status propagation | PRD **Milestone 4**: hover-to-source, structured comments, scope-change requests handled by a **negotiation agent**, property-manager-facing status page post-acceptance. Property Manager (PRD §3) is the load-bearing customer-of-the-customer. |
| Project layer | 5.5 / 6.3 | **Slice 1** — `projects` table, atomic create-on-accept transaction, "Project created" signal on bid detail. **Slice 2** — `/projects/[id]` detail page with status state machine UI (auto-stamps `actual_start_date` / `actual_end_date`, reopen from `complete` clears `actual_end_date`), target-date / assigned-sub / crew-lead / notes editing. **Slice 3** — `/projects` list view with status filters; `project_updates` table + feed UI on the project detail page; `/p/[slug]` pivots to a status-page render post-acceptance with `visible_on_public_url` filter for what the property manager sees. | Ops-layer agents (expense reconciliation, change orders, punch-lists, paint guides) remain Milestone 5. Future polish: project-level dashboard rollup (timeline / overdue), automatic update authoring from agents (`crew_auto`, `agent` author types reserved in schema). |
| Pipeline & reporting | 5.6 | Dashboard funnel, drill-downs, proposal-based $ | NL query surface deferred. **Qualified** stage naming vs app’s lead statuses: reconcile when qualification agent ships. |

---

## Roadmap milestones (PRD §9) — status at a glance

Capability milestones from the PRD — **not calendar sprints**. Update this table when a milestone materially advances.

| Milestone | PRD §9 | Focus | Status |
|-----------|--------|-------|--------|
| M1 Capture-first bidding | §9 | Mobile capture, vision takeoff draft, ground-truth evals, fallback to manual | Not started. Gates everything downstream per PRD. |
| M2 Scope reconciliation | §9 | Structured scope object, spec/capture/request ingestion, gap agent | Not started |
| M3 Lead qualification agent | §9 | Portfolio resolution, paint-timing score, briefs, ranked pipeline | Not started |
| M4 Proposal live surface (full) | §9 | Hover-to-source, comments, scope-change negotiation agent, post-accept status page | Partially (basic public proposal + accept/decline shipped) |
| M5 AI-native ops, first slice | §9 | Candidate: **expense reconciliation agent** (Sherwin-Williams invoices → takeoff buckets → grounded overrun answers for Jordan) | Not started; exit criteria defined during the milestone, gated on M1–M4 |
| M6 Voice-first contractor interface | §9 | Benny’s capstone: voice-driven quote flow that collapses the upstream agents | Not committed in shape until M1–M5 land |

**Out of scope indefinitely (PRD §9):** accounting/tax/payroll, new construction, residential service dispatch, roofing-specific workflows, configurability outside commercial multifamily exterior.

---

## Active work — single source of truth

Update this section in the same PR when status changes ([`AGENTS.md`](../AGENTS.md) → Definition of Done).

### Open now (priority order)

1. [ ] **Phase F — demo polish**
   - [ ] Onboarding blurb on `/leads/import`
   - [ ] Empty states and error messages on key views
   - [ ] Seed a clean sample import for Jordan’s account
   - [ ] End-to-end test with a real attendee CSV
   - [ ] Record a backup 3-minute demo video
2. [ ] **Phase A2 — sort leads by estimated bid** — gated on footprint/estimate fields (Phase B1). While B1 is paused, optional: explicit **sort by created date** control if product wants sort without estimates.

### Paused / deferred by decision

- **Phase B1 — footprint-based sqft + preliminary bid estimate** (`footprint_sqft`, `est_total_sqft`, `est_bid_amount`, `needs_review`). OSM tuning failed Day-0 plausibility targets; UI hidden until private Overpass (`OVERPASS_API_URL`) + containment strategy. Details: [`docs/worklog.md`](worklog.md) (2026-04-16 OSM tuning).
- **Photos in proposals (Rob’s ask)** — multi-day; post-demo / PRD deferred bucket.
- **XLSX import** — cancelled; CSV-only.

### Decisions needed (near-term / demo)

- [ ] **Production server-side Places API key** for `enrichLead` (vs dev referrer-restricted key). PRD §10 Q9.
- [ ] **Real trade-show CSV from Jordan** vs [`scripts/fixtures/trade-show-sample.csv`](../scripts/fixtures/trade-show-sample.csv).
- [ ] **Supabase email confirmation** — on vs off vs pre-seeded demo account for frictionless demos. PRD §10 Q10.

### Decisions blocking Milestone 1 / Phase 1 (PRD §10)

Tracked here so the plan is honest about what must resolve before the AI-native milestones start. These are **not** demo blockers, but they gate real execution.

- [ ] **Vision model selection** (PRD §10 Q1): pick Claude / GPT-4o / Gemini via evals against Rob’s ground-truth set. Gates M1.
- [ ] **Evals platform** (PRD §10 Q4): custom vs. Braintrust vs. LangSmith. Ground-truth dataset is the hard part.
- [ ] **Ground-truth dataset scale** (PRD §10 Q8): ~30 complete bids with captures, takeoffs, final numbers. Rob has bids, not captures: a dedicated capture pass on existing properties may be required before M1 formally starts.
- [ ] **Building-footprint provider** (PRD §10 Q6): Microsoft GlobalMLBuildingFootprints, ATTOM, EagleView low tier, or defer entirely and rely on capture-derived dimensions. Related to the paused Phase B1.
- [ ] **Business model** (PRD §10 Q11): Reno Base internal tool vs first customer of a new business. Changes multi-tenancy, billing, onboarding. Needed before M5.
- [ ] **Unit economics target** (PRD §10 Q12): compute cost per bid vs subscription tier. Sensitivity analysis with real M1 numbers.
- [ ] **Co-founder split** (PRD §10 Q13): working agreement with brother on decision-making, code review, release cadence, agent/eval stack ownership. In writing before M2.
- [ ] **Agent framework vs direct calls** (PRD §10 Q3): start direct; revisit at M2 scope-reconciliation complexity.
- [ ] **Confidence-score calibration** (PRD §10 Q5): thresholds → UI states (show / flag / suppress). Needs real M1 data to tune.
- [ ] **Where contractors edit agent output: inline vs dedicated review view** (PRD §10 Q16). Biggest UX decision in M1; gate on prototyping.

### Pre-work checklist

- [x] Validate enrichment on sample multifamily properties (Places 10/10; OSM poor — Places-only path).
- [ ] **Get real attendee CSV from Jordan.**

### Shipped (summary)

- **Phase A** — CSV import, auto-mapping, leads list (cards + table), filters, lead detail, source tags.
- **Phase B (Places-only)** — `enrichLead`, resolved address + lat/lng + place id, satellite on lead detail, manual property override (`?edit=property`).
- **Phase C** — `bids.lead_id`, lead → bid pre-fill, lead **quoted** on proposal generate, **won/lost** from public share response.
- **Phase D** — `/p/[slug]`, proposal shares, accept/decline, bid/lead status propagation, share + copy link on bid detail.
- **Phase E** — Pipeline on **`/dashboard`** (funnel, source filter, `/leads` drill-down with `?status=` / `?source=`), proposal-based open vs won dollars.
- **Phase F** — (nothing checked yet — see Open now.)
- **Project layer Slice 1** — `projects` table + `008_projects.sql` migration, `PROJECT_STATUSES` + helpers, atomic create-on-accept inside `respondToProposalShare` (`ON CONFLICT DO NOTHING` on `bid_id`), `getProjectByBidId`, "Project created" badge on the bid detail page.
- **Project layer Slice 2** — `/projects/[id]` route, status state-machine UI with `actual_*` auto-stamping (and `complete → punch_out / in_progress` reopen that clears `actual_end_date`), target-date / assigned-sub / crew-lead / notes editing, "Open project" link from the bid detail page.
- **Project layer Slice 3** — `/projects` list view with status filters + sidebar nav entry, `project_updates` table + `009_project_updates.sql` migration, append-only feed on the project detail page with per-entry `visible_on_public_url` opt-in, `/p/[slug]` pivots to a status-page render post-acceptance (status, schedule, on-site, public updates, original-proposal summary).
- **Infra** — Next.js 16, `src/proxy.ts`, [`AGENTS.md`](../AGENTS.md).

---

## MVP demo checklist (Jordan / two-week POC)

Historical phases **A–F** below are folded into checkboxes here and in *Open now* so we do not maintain two competing lists.

**Goal (still useful as a demo bar):** CSV → enriched leads → bid → shareable URL → customer accept → visible in pipeline.

1. [ ] Jordan (or proxy) runs a **real** attendee CSV through import.
2. [x] Lead → bid → proposal → share link → accept/decline updates bid + lead.
3. [x] Dashboard shows funnel / pipeline story (scoped version on `/dashboard`).
4. [ ] Walkthrough **under five minutes** with polish items in Phase F done.
5. Phase F artifacts: onboarding copy, empty states, seeded demo data, backup video.

---

## Archived: phase breakdown (two-week POC)

The following tracked the original **lead-to-close POC** build. Items are **historical**; authoritative status is *Active work* and *Shipped* above.

### Phase A — Lead ingestion

- [x] `leads` table, CSV upload, **server-side** parse ([`src/lib/leads/csv.ts`](../src/lib/leads/csv.ts)), auto-mapping, source tag, bulk insert.
- [x] `/leads` views, source filter, status editing.
- [ ] Sort by est. bid (blocked on B1) — see Open now.

### Phase B — Enrichment

- [x] Places enrichment path + statuses + lead detail + manual override.
- [~] OSM footprint + est. sqft + est. bid — **paused** (see Paused).

### Phase C — Lead → bid

- [x] All items (FK, pre-fill, linkage, quoted on proposal).

### Phase D — Shareable proposal

- [x] Public page, snapshot UI, accept/decline, propagation, share UI.

### Phase E — Pipeline

- [x] Delivered on `/dashboard` (no separate `/pipeline` route).

### Phase F — Demo prep

- [ ] See **Open now → Phase F**.

---

## Risks & demo notes (short)

- **Enrichment**: Places-only path validated; OSM paused, so demo story is “resolved address + satellite,” not footprint-accurate sqft estimates.
- **Data quality**: sparse CSVs still need manual address override on lead detail, keep that visible in demo.
- **Scope creep**: park non-PRD asks in backlog. PRD §5 (product scope), §9 (roadmap), and §12 (build principles) define the north star; §9 "Out of scope indefinitely" is the explicit no-list.
- **Architectural-stance risk**: the PRD is explicit that bolting AI onto a system of record is the wrong product. As Phase 1 work lands, check each feature against PRD §1 and §12: if it looks like human data entry is the origination point, it is probably the wrong shape.

For longer narrative (personas incl. the Property Manager customer-of-the-customer, competitive landscape, AI architecture principles, open questions), see **PRD §3, §4, §6, §10**.

---

## Success criteria (demo)

1. [ ] Real CSV import demo path confident.
2. [x] End-to-end proposal URL + accept path works.
3. [x] Pipeline visible on dashboard.
4. [ ] Five-minute narrated walkthrough + Phase F polish complete.
