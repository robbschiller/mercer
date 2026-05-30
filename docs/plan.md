# Mercer — Work plan

This document is the **live execution tracker**: what is shipped, what is next, what is paused, and what decisions block progress.

**Strategy, positioning, personas, full product scope, AI principles, data-model vision, and milestone roadmap philosophy** live in **[`docs/prd.md`](prd.md)**. Read the PRD for *why*; read this file for *what we are doing now*.

Session-by-session implementation notes: [`docs/worklog.md`](worklog.md). Contributor workflow: [`AGENTS.md`](../AGENTS.md).

---

## Product snapshot (today)

The deployed app is **Phase 0**: a proof of the data model and the non-AI surfaces for **lead → bid → shareable proposal → accept/decline → pipeline visibility**, with Places-based lead enrichment, manual overrides, and dashboard funnel metrics. The two-week Jordan POC demo shipped 2026-04-24 against a real BAAA 2026 attendee CSV. Since the demo: normalized lead-domain model with routed detail pages per property/account/contact, account autocomplete on manual lead entry, onboarding wizard with Anthropic Haiku website enrichment (Phase G slices 1-2), and multi-user organizations with email-keyed invites. PRD §1 reframes the product as an **AI-native workflow engine with record-keeping** (not a system of record with AI bolted on). **None of the AI-native operations in PRD §5 ship yet**: no qualification agent, no capture/takeoff agent, no scope reconciliation, no negotiation agent, no NL reporting. Phase 1 starts from here, gated on the decisions in *Decisions blocking Milestone 1 / Phase 1*. See **PRD §8** for the authoritative shipped list.

---

## PRD alignment — where engineering should focus next

These rows connect **near-term repo work** to **PRD sections**. “Next” is suggestive ordering; adjust in *Open now* below when priorities change.

| PRD area | § | Shipped (high level) | Gap / next |
|----------|---|----------------------|------------|
| Lead capture & qualification | 5.1 | CSV import, mapping, source tags, manual single-contact entry at `/contacts/new`, Places resolve of the CSV property address, **first-class `/contacts` database** backed by durable `contacts` rows, contact detail at `/contacts/[id]`, property/detail routes for accounts and properties (`/leads/properties/[id]`, `/leads/accounts/[id]`) with cross-links between accounts ↔ properties ↔ contacts ↔ leads, **property-first Niko table** on `/leads` (one row per property with embedded contacts, account/company, pipeline mix, portfolio count, follow-up rollup, Niko search/filter/sort/pagination), **account autocomplete** on `/leads/new`, **per-lead outreach state** (`last_contacted_at` / `follow_up_at` / `contact_attempts`) with log-contact + follow-up controls on lead detail, **additive normalized lead domain model** (`accounts`, `properties`, `contacts`, `property_contacts`, `lead_contacts`, `activity_events`, `audit_log`) with compatibility backfill from flat leads | PRD wants a **qualification agent**: portfolio resolution, public-data pull, paint-timing score, generated brief, confidence-scored ranking (`qualification_score`, `qualification_brief`, `agent_run_id`). Product distinction now: trade-show CSV rows are **contacts/property context**; a contact becomes a **lead** only when they ask for work against a property. Remaining cleanup: create an explicit lead-promotion/work-request action instead of relying on imported `new` rows. |
| Capture & takeoff | 5.2 | Manual bid flow: buildings, surfaces, pricing, PDF proposal | PRD **Milestone 1**: mobile capture + vision-based takeoff agent with confidence-scored draft, form as edit surface, graceful fallback to manual. Not started. |
| Scope reconciliation | 5.3 | — | PRD **Milestone 2**: structured scope object with `source_type`/`source_ref`, spec-PDF parsing, customer-request ingestion, `scope_flag` UI, reconciliation agent. Not started. |
| Proposal as live surface | 5.4 | Public `/p/[slug]`, accept/decline, share link, status propagation, and post-acceptance status-page pivot on the same URL | PRD **Milestone 4**: hover-to-source, structured comments, scope-change requests handled by a **negotiation agent**. Property Manager (PRD §3) is the load-bearing customer-of-the-customer. |
| Project layer | 5.5 / 6.3 | The bid row **is** the project after the property-rooted re-model: acceptance sets `delivery_status` and `accepted_*` on `bids`; `/projects` and `/projects/[id]` read through `ProjectView`; `project_updates` is keyed by `bid_id`; `/p/[slug]` pivots to a status-page render post-acceptance with `visible_on_public_url` filter for what the property manager sees. The project UI has status filters/counts, state-machine transitions, actual-date auto-stamping, target-date / assigned-sub / crew-lead / notes editing, append-only updates, and the pre-start NTO gate. | Ops-layer agents (expense reconciliation, change orders, punch-lists, paint guides) remain Milestone 5. Future polish: automatic update authoring from agents (`crew_auto`, `agent` author types reserved in schema). |
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

1. [ ] **Dashboard prompt command bar + prompt-bidding boundary (pre-M2 design).** Add a narrow LLM-supported prompt input at the bottom of `/dashboard` so users can initiate basic app actions from natural language without turning Mercer into a generic chatbot. V1 scope: navigation/filtering, basic dashboard answers from existing aggregates, create lead shell, log contact, set follow-up, and start a draft project/bid shell behind review. Jordan's prompt-bidding ask ("here are photos, we need swing stage, 150k paintable sf, 40% GP, done") stays behind the same boundary: the **LLM is the front door** that parses the sentence into structured inputs (paintable sf, access method, GP target); a **deterministic engine multiplies those against stored-config rates** to produce the number. "AI knows the rate" = rates are **saved config the engine reads, never numbers the model invents**. Implementation plan: [`docs/build-plans/dashboard_prompt_command_bar.plan.md`](build-plans/dashboard_prompt_command_bar.plan.md).
2. [~] **Phase G — Onboarding wizard + branded bid surfaces** — **slices 1-2 shipped 2026-05-02**, see Shipped below. Remaining: logo upload + brand fields flowing into `ProposalSnapshot.brand` + PDF / `/p/[slug]` themed render + `/settings` branding card + dismissible banner for existing users. Original scope: replace the silent post-signup redirect with a 3-step wizard at `/onboarding?step=website|confirm|theme`: capture website URL, run an Anthropic Haiku extraction over the homepage HTML (Zod-typed: company name, address, phone, logo URL, primary color), confirm/edit the result, preview the themed bid. Persist to two new tables (`company_profiles` keyed by `user_id` mirroring the `userDefaults` pattern, `onboardings` for per-step timestamps) via `drizzle/manual/012_company_profiles.sql`; logos live in a new public `brand-assets` Supabase Storage bucket. Brand fields flow into bid renders by adding a `brand` block to `ProposalSnapshot` and snapshotting at proposal-generate time (so already-sent proposals do not silently re-theme when the contractor edits later). PDF (`src/lib/pdf/proposal-template.tsx`) and `/p/[slug]` swap the hard-coded "Mercer" header/footer + `#1a1a1a` accents for the snapshotted brand; `/settings` gets a "Bid branding" card with a "Refresh from website" action. **New users:** gated through the wizard via `src/app/(app)/layout.tsx` (no `onboardings` row → redirect). **Existing users:** dismissible "Add your branding" banner on `/dashboard`, no forced redirect. **v1 hard limits:** one theme per user, no per-bid overrides, no font picker, no auto-color-extraction from logo image, no team/multi-tenant brand sharing. Open dependency: PRD §10 Q10 (email confirmation on/off) determines whether the wizard fires immediately on signup or post-confirmation; the `auth/callback` redirect handles either path.
3. [ ] **Follow-up quick chips polish** — outreach state and Niko follow-up filter are shipped, but a one-click "Overdue" / "Due today" chip row could still speed daily pipeline triage.
4. [ ] **Phase A2 — sort leads by estimated bid** — gated on footprint/estimate fields (Phase B1). While B1 is paused, optional: explicit **sort by created date** control if product wants sort without estimates.
5. **Next strategic bet** — demo landed, now the real unlock per PRD §9 is M1 (capture-first bidding) or M3 (lead qualification agent). Both gated on the decisions in *Decisions blocking Milestone 1 / Phase 1* below. Do not start writing agent code until at least the vision-model + evals-platform + ground-truth decisions are made.

### Enrichment rethink (open)

**Correction (2026-04-22, reinforced 2026-04-26):** the original framing of this section read the CSV `Address / City / State / Zip` columns as the attendee's *registered office*. Closer reading of the BAAA list shows otherwise — those columns are **the property the attendee manages**, and one attendee typically appears on multiple rows (one per property). The same person at Greystar covering five communities shows up five times with five different addresses. That changes the unit of work: the actionable row is the **property**, and the contact list at that property is the secondary axis.

The current enrichment runner (`src/lib/leads/enrichment-runner.ts`) treats the CSV address as authoritative and only falls back to Places-by-`company` when the CSV doesn't carry one. The list UI now distinguishes the database layers: `/contacts` is the trade-show/contact database backed by durable contact rows, while `/leads` is the work-request/opportunity surface and still defaults to a Niko table with one row per property group, embedded contacts, portfolio count, follow-up filter/sort controls, and links into routed property / account / contact detail pages. Leads with no address pool into a "No property address" group.

Directions still on the table (PRD §10 Q6 related):

- **[shipped 2026-05-03; routed pages superseded the side panel 2026-05-12; `/contacts` promoted 2026-05-30]** Property-first Niko table on `/leads`. Group key is `resolvedAddress` for legacy rows; rows show embedded contacts, account/company, pipeline mix, portfolio count, earliest follow-up, and Niko search/filter/sort/pagination. Property rows and contact/account chips now link to routed detail pages instead of opening an in-table side panel. The old contact-row view is superseded by first-class `/contacts`, backed by durable contact rows. [`src/components/property-leads-table.tsx`](../src/components/property-leads-table.tsx), [`src/components/property-detail-panel.tsx`](../src/components/property-detail-panel.tsx), [`src/app/(app)/leads/page.tsx`](../src/app/(app)/leads/page.tsx).
- **[shipped 2026-04-26]** Per-lead outreach state. `last_contacted_at` / `follow_up_at` / `contact_attempts` columns on `leads` ([`drizzle/manual/010_leads_outreach.sql`](../drizzle/manual/010_leads_outreach.sql)), `logLeadContact` / `setLeadFollowUp` store helpers and matching server actions, and an "Outreach" card on lead detail with a Log-contact-attempt button + follow-up date input. The property table surfaces the earliest follow-up across contacts at that property.
- **[deferred]** Role-weighted contact ranking inside each property group using the normalized `property_contacts.role` value, which is now populated from the BAAA `Role with Company` CSV column during import. The parser exists; the remaining work is ranking/display priority in the UI.
- **[shipped 2026-05-03]** Portfolio count per account/company, surfaced in the property-first table and routed account/property detail pages so Jordan can prioritize the company with 12 properties over the one with 1.
- Separate "property capture" flow that happens *after* a contact is qualified: Jordan picks a property from the grouped list and runs capture + takeoff against the address that's already on the lead (PRD M1 / M2 territory). The `resolvedAddress` is reusable as the bid's `address` pre-fill.
- Generate a per-property qualification brief (PRD M3), keyed on `management company + property address + contact roles + portfolio size`.

Next step before writing more agent code: with property grouping + outreach state in hand, run a real session against the BAAA list and watch which properties Jordan actually works first. That tells us whether the pre-agent ergonomics are sufficient or whether the qualification brief needs to come sooner.

### Property-rooted re-model (shipped 2026-05-30) — Jordan working session 2026-05-29

Phases 1–5 landed (see *Shipped* above for the implementation summary). The
strategic rationale stays below as the decision record. Full schema deltas,
migration sequence, and `store.ts` refactor plan: [`docs/build-plans/property_rooted_remodel.plan.md`](build-plans/property_rooted_remodel.plan.md).

First proper look at Jordan's half of the operation (AQP). It corrects the **root of the object graph**, which sits on the M1 critical path; the rest is validation and polish. Captured here as the authoritative correction (mirrors *Enrichment rethink* above).

**The correction: the data model is property-first, not lead- or job-first.** Jordan's hierarchy is explicit — the property is the top-level object ("the crop we're harvesting"); projects and leads hang off it; contacts are a parallel object linking to both. A property can carry several projects (Pura Vita: one bid for the blue section, one for the whole building = two projects, one property, only one happens). The **scope object — the M1 priority — is not the root**; it lives inside a project, which lives inside a property. Today bids are effectively job/lead-rooted with flat compatibility fields on `leads`; that is the thing to fix before more UI, because every derived view (proposal, ops, reporting) inherits this graph. Rob independently lands on property-as-root (he thinks in building archetypes per property).

Target shape:

- **Property = root.** Project(s) and lead(s) are children of a property; contact is a parallel object linked to both property and project.
- **Owner vs. management company is a legal hard requirement, not metadata.** Every property needs three distinguishable things: who **owns** it, who **manages** it, and which contact maps to which. Notice to Owner (NTO) is a lien-rights instrument — served to the manager instead of the owner, you forfeit the right to lien. Downstream: invoice routing, NTO generation. First-class fields; cheap to add now while in the schema.
- **Scope object holds surfaces *and* access as sibling dimensions.** Access (lifts, scaffolding, swing stage, safety) scales by **height/archetype, not square footage** (swing stage alone ≈ $80k on Pura Vita) — do not fold it into surfaces.
- **Surface measure is paintable square feet**, not raw OSM/footprint area (restates the surface-inventory bottleneck). New archetype: **seven-story mid-rise** alongside garden/townhome.
- **Prompt-bidding boundary** (see *Open now* #1): LLM parses the natural-language ask into structured scope inputs; a deterministic engine multiplies them against **stored-config rates** to produce the number. Rates are config the engine reads, never values the model invents.

**Build stance — AQP-specific (decided 2026-05-29).** This is an independent app for our first customer, AQP — not a generalizable multi-tenant platform (resolves PRD §10 Q11; see *Decisions blocking* below). Jordan pushed on the platform thesis directly ("is the app yours or ours?", "I'd rather pay Salesforce than have you split focus"). Stance: build it AQP-deep, exactly how he wants it, and keep the seams clean — property/project/contact as real objects, **rates as config not hardcode** — so optionality is preserved without paying the abstraction/multi-tenant tax up front. Generalize only if a second customer forces it. (His own "build it for AQP, then take the pieces out" is the same strategy.)

**Where the real value is (M-later, do not build on a wrong root):** Jordan rates the ops layer as the high-value surface ("top of funnel is easy — this is extremely important for us"). It can't be built well until the property-rooted object graph lands, so it stays sequenced behind the re-model.

### Paused / deferred by decision

- **Phase B1 — footprint-based sqft + preliminary bid estimate** (`footprint_sqft`, `est_total_sqft`, `est_bid_amount`, `needs_review`). OSM tuning failed Day-0 plausibility targets; UI hidden until private Overpass (`OVERPASS_API_URL`) + containment strategy. Details: [`docs/worklog.md`](worklog.md) (2026-04-16 OSM tuning).
- **Photos in proposals (Rob’s ask)** — multi-day; post-demo / PRD deferred bucket.
- **XLSX import** — cancelled; CSV-only.

### Decisions needed (post-demo / production readiness)

Demo is shipped; these no longer block Jordan's POC but do gate a production rollout.

- [ ] **Production server-side Places API key** for `enrichLead` (vs dev referrer-restricted key). PRD §10 Q9.
- [x] **Real trade-show CSV from Jordan** — received (BAAA 2026 list, 1,224 rows). Import path works; enrichment value was limited because the CSV already carries the property street address and the Places lookup resolved to management-company HQ instead. See *Enrichment rethink* below.
- [ ] **Supabase email confirmation** — on vs off vs pre-seeded demo account for frictionless demos. PRD §10 Q10.

### Decisions blocking Milestone 1 / Phase 1 (PRD §10)

Tracked here so the plan is honest about what must resolve before the AI-native milestones start. These are **not** demo blockers, but they gate real execution.

- [ ] **Vision model selection** (PRD §10 Q1): pick Claude / GPT-4o / Gemini via evals against Rob’s ground-truth set. Gates M1.
- [ ] **Evals platform** (PRD §10 Q4): custom vs. Braintrust vs. LangSmith. Ground-truth dataset is the hard part.
- [ ] **Ground-truth dataset scale** (PRD §10 Q8): ~30 complete bids with captures, takeoffs, final numbers. Rob has bids, not captures: a dedicated capture pass on existing properties may be required before M1 formally starts.
- [ ] **Building-footprint provider** (PRD §10 Q6): Microsoft GlobalMLBuildingFootprints, ATTOM, EagleView low tier, or defer entirely and rely on capture-derived dimensions. Related to the paused Phase B1.
- [x] **Business model / app shape** (PRD §10 Q11) — **resolved 2026-05-29:** this is an **independent, AQP-specific app** built for our first customer (AQP), not a generalizable multi-tenant platform. Build AQP-deep with clean object seams (property/project/contact as real objects, rates as config not hardcode); generalize only if a second customer forces it, and do not invest further in multi-tenancy/abstraction now. See *Property-rooted re-model* above.
- [ ] **Unit economics target** (PRD §10 Q12): compute cost per bid vs subscription tier. Sensitivity analysis with real M1 numbers.
- [ ] **Co-founder split** (PRD §10 Q13): working agreement with brother on decision-making, code review, release cadence, agent/eval stack ownership. In writing before M2.
- [ ] **Agent framework vs direct calls** (PRD §10 Q3): start direct; revisit at M2 scope-reconciliation complexity.
- [ ] **Confidence-score calibration** (PRD §10 Q5): thresholds → UI states (show / flag / suppress). Needs real M1 data to tune.
- [ ] **Where contractors edit agent output: inline vs dedicated review view** (PRD §10 Q16). Biggest UX decision in M1; gate on prototyping.

### Pre-work checklist

- [x] Validate enrichment on sample multifamily properties (Places 10/10; OSM poor — Places-only path).
- [x] **Get real attendee CSV from Jordan.** BAAA 2026 list (1,224 rows) imported cleanly.

### Shipped (summary)

- **Contacts vs leads presentation split (2026-05-30)** — promoted contacts to a first-class sidebar tab and route. `/contacts` now lists durable `contacts` rows with account, property count, lead count, follow-up rollup, source filtering, search, sort, and Niko pagination; `/contacts/[id]` owns contact detail; `/contacts/import` is the trade-show CSV intake surface; `/contacts/new` creates a contact-only row with optional management group, reach fields, source, and notes. Legacy `/leads/contacts` routes redirect to `/contacts`, and property/account detail links now point to `/contacts/[id]`. `/leads` keeps the property-first opportunity surface and its import affordance now points to contact import. No schema migration: existing `contacts`, `properties`, `property_contacts`, and `leads` tables already supported the distinction. Remaining conceptual cleanup: add an explicit "promote contact/property to lead/work request" action so imported contact rows no longer masquerade as `new` leads.
- **Ownership / NTO split into lead vs project pre-start (2026-05-30)** — separated the two concerns that were previously co-located on the property card: (1) the **owner contact** at the property — a sales concern — is set on a slim "Ownership" card on `/leads/properties/[id]` via `setPropertyOwnerContactAction` (writes the `owner` `property_parties` row's `contact_id` only); (2) the **legal owner name + address + NTO recipient contact** — a lien-rights concern that only matters before crews mobilize — is captured on a new "Pre-start checklist" card on `/projects/[id]` (visible when `delivery_status='not_started'`) via `setProjectNtoAction` (writes a separate `nto_recipient` `property_parties` row, partial-unique enforced). The `not_started → in_progress` transition is gated **both** client-side (button disabled until the three fields are set) and server-side (`updateProjectStatus` throws and the existing error path surfaces it). Proposal-snapshot party block now reads legal owner / NTO from the `nto_recipient` row (the renderers already degraded to "—" when fields are null, so older snapshots keep rendering unchanged). The old `setPropertyOwnership` store/action/schema removed. Docs updated.
- **Property-rooted data model re-model (Phases 1–5, 2026-05-29 → 2026-05-30)** — re-rooted the object graph from bid/job-first to **property-first** per the Jordan working session. Phase 1: `accounts.type`, `properties.owner_account_id`/`management_account_id`, and `property_parties` table with `is_nto_recipient` (migration `015_property_root.sql`). A follow-up split replaced the first combined owner/NTO editor with `setPropertyOwnerContact` on the property detail page and `setProjectNto` on the project pre-start checklist. Phase 2: `buildings.archetype` (`garden`/`townhome`/`mid_rise`/`high_rise`/`other`), `access_items` table (sibling scope dimension to surfaces — scales by height/archetype, not sqft), `rate_config` table (org-scoped stored rates the deterministic pricing engine reads; access enters the live pricing total) (migrations `016_scope_access.sql`, `017_rate_config.sql`). Phase 3: collapsed the separate `projects` delivery table into the bid spine — the bid row IS the project, carrying both the opportunity lifecycle (`status`) and the delivery lifecycle (`delivery_status`); every project getter/mutator and the `/p/[slug]` status page reads the spine via a `ProjectView` mapper so pages were untouched. Cosmetic `bids`→`projects` table rename intentionally skipped. Migrations `018_project_spine.sql`, `019` (project_updates.project_id nullable), `020_drop_projects.sql` (destructive: dropped `project_updates.project_id` and the `projects` table; set `project_updates.bid_id` NOT NULL). Phase 4: `ProposalSnapshot` gained optional `parties` (management/owner/NTO), `accessItems[]` (separate from line items, total reconciles via `calculateBidPricing.accessItems`), and per-building `archetype`; PDF + `/p/[slug]` render an "Ownership & Notice to Owner" party grid, an "Access" section, and archetype labels on buildings. Older snapshots without the fields still render unchanged. Phase 5: [`docs/lead-data-model.md`](lead-data-model.md) rewritten to property-rooted; README data-model section updated; this entry moved from *Open now* to *Shipped*. Full plan: [`docs/build-plans/property_rooted_remodel.plan.md`](build-plans/property_rooted_remodel.plan.md).
- **Phase A** — CSV import, auto-mapping, leads list (cards + table), filters, lead detail, source tags.
- **Phase B (Places-only)** — `enrichLead`, resolved address + lat/lng + place id, satellite on lead detail, manual property override (`?edit=property`).
- **Phase C** — `bids.lead_id`, lead → bid pre-fill, lead **quoted** on proposal generate, **won/lost** from public share response.
- **Phase D** — `/p/[slug]`, proposal shares, accept/decline, bid/lead status propagation, share + copy link on bid detail.
- **Phase E** — Pipeline on **`/dashboard`** (funnel, source filter, `/leads` drill-down with `?status=` / `?source=`), proposal-based open vs won dollars.
- **Phase F — demo polish** — onboarding blurb on `/leads/import`, empty states and error messages across key views, real BAAA 2026 attendee CSV imported end-to-end (1,224 rows), seeded demo account, backup 3-minute walkthrough recorded. Demo shipped 2026-04-24.
- **Project layer Slice 1 (historical, superseded by the 2026-05-29 bid spine)** — initially shipped a separate `projects` table + `008_projects.sql` migration, `PROJECT_STATUSES` + helpers, atomic create-on-accept inside `respondToProposalShare`, `getProjectByBidId`, and a "Project created" badge on the bid detail page. Current schema folds these delivery fields onto `bids`.
- **Project layer Slice 2** — `/projects/[id]` route, status state-machine UI with `actual_*` auto-stamping (and `complete → punch_out / in_progress` reopen that clears `actual_end_date`), target-date / assigned-sub / crew-lead / notes editing, "Open project" link from the bid detail page.
- **Project layer Slice 3** — `/projects` list view with status filters + sidebar nav entry, append-only `project_updates` feed on the project detail page with per-entry `visible_on_public_url` opt-in, `/p/[slug]` pivots to a status-page render post-acceptance (status, schedule, on-site, public updates, original-proposal summary). Current `project_updates` rows are keyed by `bid_id`.
- **Phase G slice 1 — onboarding wizard scaffolding (2026-05-02)** — additive `company_profiles` + `onboardings` tables ([`drizzle/manual/012_company_profiles.sql`](../drizzle/manual/012_company_profiles.sql)), 3-step wizard at `/onboarding?step=website|confirm|theme` ([`src/app/(onboarding)/onboarding/page.tsx`](../src/app/(onboarding)/onboarding/page.tsx)), gate in [`src/app/(app)/layout.tsx`](../src/app/(app)/layout.tsx) (no `onboardings` row → redirect, mirror in-page guard so a completed user visiting `/onboarding` bounces to `/bids`), `submitOnboardingWebsiteAction` / `confirmOnboardingProfileAction` / `confirmOnboardingThemeAction` / `skipOnboardingAction` server actions, store helpers `getOnboardingState` / `markOnboardingWebsiteSubmitted` / `markOnboardingProfileConfirmed` / `markOnboardingComplete` / `skipOnboarding` / `getCompanyProfile` / `upsertCompanyProfile`, `/onboarding/:path*` added to the proxy matcher. Verified end-to-end against a fresh signup: signup → wizard step 1 → 2 → 3 → `/bids`; skip path also releases the gate.
- **Phase G slice 2 — Anthropic Haiku website enrichment (2026-05-02)** — Step 1's submit synchronously calls Anthropic Haiku 4.5 with structured output (Zod-typed: company name, address, phone, email, logo URL, primary hex color) over the contractor's homepage HTML, then persists the result on `company_profiles` so Step 2 pre-fills. New module [`src/lib/onboarding/enrich-from-website.ts`](../src/lib/onboarding/enrich-from-website.ts) handles the homepage fetch (5s timeout, 500KB cap), HTML noise stripping (`<script>` / `<style>` / `<svg>` / `<noscript>` / comments), the Haiku call (`messages.parse` + `zodOutputFormat`, `cache_control: ephemeral` on the system prompt), and absolute-URL resolution for the logo. New store helper `setEnrichmentResult` writes either the structured data + `enrichment_status='success'` or the error message + `enrichment_status='failed'`. The action wraps the call in a 15s `AbortController` hard timeout (initial 8s ceiling from the plan was too tight in practice; certapro.com round-trip ran ~5-8s); on failure (timeout, no API key, model refusal, fetch error) the wizard still advances to Step 2 and shows a *"We couldn't read X automatically"* banner so the user fills the form by hand. Required env: `ANTHROPIC_API_KEY` ([`.env.local.example`](../.env.local.example)). Verified end-to-end against `certapro.com`: extracted name "CertaPro Painters", phone "(800) 689-7271", logo (absolute URL), and brand color `#fdb913`; primary color flowed through to Step 3's color picker. Failed-path also verified (no key, made-up URL). **Deliberately not in slice 2:** logo upload + `brand-assets` Storage bucket, brand fields on `ProposalSnapshot`, themed PDF / `/p/[slug]` render, `/settings` branding card, existing-user banner on `/dashboard`.
- **Leads outreach + property grouping (2026-04-26)** — outreach state lives on the lead row: `last_contacted_at`, `follow_up_at`, `contact_attempts` ([`drizzle/manual/010_leads_outreach.sql`](../drizzle/manual/010_leads_outreach.sql)) with `logLeadContact` / `setLeadFollowUp` store helpers, matching server actions, and an "Outreach" card on lead detail (relative-time last-contacted, increment-on-click attempt counter, follow-up date input with overdue indicator). The property-first table now surfaces earliest follow-up across contacts at that property.
- **Lead domain model redesign (2026-05-03)** — additive normalized model for property-level opportunities: `accounts`, `properties`, `contacts`, `property_contacts`, `lead_contacts`, `activity_events`, and `audit_log` ([`drizzle/manual/013_lead_domain_model.sql`](../drizzle/manual/013_lead_domain_model.sql), [`src/db/schema.ts`](../src/db/schema.ts), [`docs/lead-data-model.md`](lead-data-model.md)). Existing lead creation and CSV import now normalize rows into durable account/property/contact records, link primary contacts to properties and leads, preserve raw import provenance, write activity events for imports/outreach/status/bid creation, and write structured audit records. Bids now store `property_id` and `primary_contact_id` while retaining `lead_id` during the transition. `/leads` defaults to a property-first Niko table with embedded contact chips and routed detail-page links; contact-row view remains available as `view=contact`.
- **Lead entity detail pages (2026-05-12; contacts promoted 2026-05-30)** — promoted the property / account / contact side panels out of the `/leads` table into routed detail pages: `/leads/properties/[id]`, `/leads/accounts/[id]`, and originally `/leads/contacts/[id]` (now redirected to `/contacts/[id]` by the Contacts split) ([`src/app/(app)/leads/properties/[id]/page.tsx`](../src/app/\(app\)/leads/properties/%5Bid%5D/page.tsx), [`src/app/(app)/leads/accounts/[id]/page.tsx`](../src/app/\(app\)/leads/accounts/%5Bid%5D/page.tsx)), each backed by store getters (`getAccountDetail`, `getPropertyDetail`, `getContactDetail`) and a full-page panel component with cross-links between accounts ↔ properties ↔ contacts ↔ leads. Index routes (`/leads/properties`, `/leads/accounts`) redirect back to the appropriate `/leads?view=…`; `/leads/contacts` redirects to `/contacts`. Property rows and contact chips in `PropertyLeadsTable` and `LeadsTable` now navigate via Next `<Link>` instead of opening an in-page sidebar — `lead-detail-aside.tsx` was deleted as part of the move. The leads list itself is now a full-bleed container (`/leads/page.tsx` uses `h-[calc(100svh-3.5rem)]`) so the Niko table fills the viewport without the old aside competing for width. `AccountAutocomplete` on `/leads/new` suggests existing accounts so manually-added leads attach to the existing account graph.
- **Multi-user organizations (2026-05-12)** — additive `org_memberships` table ([`drizzle/manual/014_org_memberships.sql`](../drizzle/manual/014_org_memberships.sql)) with per-user role (`owner` / `admin` / `member`) and per-invite status (`invited` / `active`). New `getOrgContext()` ([`src/lib/org-context.ts`](../src/lib/org-context.ts)) resolves the session user to an `OrgContext { userId, ownerUserId, email, name, role }` (active membership → linked org; pending email-keyed invite → auto-accepted on first sign-in; no row → solo owner of their own org). `store.ts → requireUser()` now returns the org context, and every tenant-scoped query uses `user.ownerUserId` instead of `user.id` — existing `user_id` columns semantically hold the owner id, so no data migration was needed. `/settings/members` lists members, lets owners/admins invite by email and remove pending invites or active members (`inviteOrgMember`, `removeOrgMember`, `listOrgMembers` store helpers; `inviteOrgMemberAction` / `removeOrgMemberAction` server actions). `/settings/company` was split out as its own page powered by `getCompanyProfile(ctx.ownerUserId)`; `/settings` keeps pricing defaults. New `SettingsNav` ([`src/app/(app)/settings/settings-nav.tsx`](../src/app/\(app\)/settings/settings-nav.tsx)) drives the in-section nav. Sign-out flow ([`src/components/nav-user.tsx`](../src/components/nav-user.tsx)) fixed in the same pass.
- **Post-demo perf pass (2026-04-24)** — dev-loop slowness triaged after Turbopack cache corruption. Middleware matcher narrowed to auth-relevant routes only (`/dashboard`, `/leads`, `/bids`, `/projects`, `/settings`, `/login`, `/signup`), cutting proxy overhead to zero on `/`, `/p/[slug]`, and static assets. Middleware now forwards the `auth.getUser()`-verified user id/email to Server Components via stripped-and-reset request headers (`x-mercer-user-id` / `x-mercer-user-email`), so the cached `getSessionUser()` helper is a pure header read on matched routes (no second Supabase RTT, no `getSession()` warning) and falls back to `getUser()` only on unmatched public routes. `getLeads()` rewritten to push search (`q`), `status`, and `sourceTag` filters + `limit` / `offset` into SQL using the existing `leads_user_id_created_at_idx`; `/leads` page now renders page-at-a-time with a "Load more" link and drill-down filters from the dashboard actually take effect. End result: 1,224-row BAAA import renders the leads page as a 100-row first paint instead of streaming everything; protected navigations drop from two Supabase auth RTTs to one.
- **Review perf/refactor pass (2026-04-26)** — fixed the unstable `getLeads()` ordering with `id` as a secondary sort and added `011_review_perf_indexes.sql`; changed `/leads?view=property` to paginate property groups in SQL before loading visible contacts, so groups are not split by contact-row pagination; moved CSV import enrichment into `after()` so uploads redirect immediately with rows pending; made `/projects` filtering/counts SQL-backed; removed the home-page `getSessionUser()` call so `/` stays free of Supabase auth RTTs; and made bid detail child queries wait until bid ownership is confirmed.
- **Infra** — Next.js 16, `src/proxy.ts`, [`AGENTS.md`](../AGENTS.md).

---

## MVP demo checklist (Jordan / two-week POC)

Historical phases **A–F** below are folded into checkboxes here and in *Open now* so we do not maintain two competing lists.

**Goal (still useful as a demo bar):** CSV → enriched leads → bid → shareable URL → customer accept → visible in pipeline.

Demo completed 2026-04-24.

1. [x] Jordan (or proxy) runs a **real** attendee CSV through import. BAAA 2026 list (1,224 rows) imported.
2. [x] Lead → bid → proposal → share link → accept/decline updates bid + lead.
3. [x] Dashboard shows funnel / pipeline story (scoped version on `/dashboard`).
4. [x] Walkthrough **under five minutes** with polish items in Phase F done.
5. [x] Phase F artifacts: onboarding copy, empty states, seeded demo data, backup video.

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

- [x] Shipped 2026-04-24 — see **Shipped (summary) → Phase F**.

---

## Risks & demo notes (short)

- **Enrichment**: Places-only path validated; OSM paused, so demo story is “resolved address + satellite,” not footprint-accurate sqft estimates.
- **Data quality**: sparse CSVs still need manual address override on lead detail, keep that visible in demo.
- **Scope creep**: park non-PRD asks in backlog. PRD §5 (product scope), §9 (roadmap), and §12 (build principles) define the north star; §9 "Out of scope indefinitely" is the explicit no-list.
- **Architectural-stance risk**: the PRD is explicit that bolting AI onto a system of record is the wrong product. As Phase 1 work lands, check each feature against PRD §1 and §12: if it looks like human data entry is the origination point, it is probably the wrong shape.

For longer narrative (personas incl. the Property Manager customer-of-the-customer, competitive landscape, AI architecture principles, open questions), see **PRD §3, §4, §6, §10**.

---

## Success criteria (demo)

All four met 2026-04-24.

1. [x] Real CSV import demo path confident.
2. [x] End-to-end proposal URL + accept path works.
3. [x] Pipeline visible on dashboard.
4. [x] Five-minute narrated walkthrough + Phase F polish complete.
