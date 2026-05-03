# Mercer — Product Requirements Document

**Status:** Draft
**Audience:** Robbie + Timmy
**Last updated:** April 2026

---

## 1. Overview

Mercer is an **AI-native workflow engine** for commercial multifamily exterior renovation contractors, covering the full workflow from lead acquisition through post-construction punch-out. The beachhead is exterior painting; the design partner is Reno Base / AQP; the long-term scope is the full exterior trade stack (siding, stucco, envelope, concrete restoration) on occupied commercial properties.

The product's architectural stance is the thing that matters most. Most vertical SaaS in 2026 is a system of record with AI features bolted on — a chatbot on the dashboard, generated copy in the proposal, a summary at the top of a report. Mercer is the inversion: an **AI-native workflow engine with record-keeping**. The defining operations of the product — measurement, scope writing, lead qualification, ops reconciliation, customer negotiation — are done by AI systems, with humans as supervisors and editors. Structured records (buildings, surfaces, scope items, expenses, punch-list entries) are the substrate the agents read and write against, and the artifact the business runs on.

This framing matters because it changes the product shape, not just the feature list. A bid in Mercer does not start as an empty form; it starts as a capture — a walk-around video, a set of photos, a satellite tile — that an AI system turns into a structured takeoff draft. Scope is not prose in a PDF; it is a reconciled object whose every line item traces back to a source (measurement, spec, capture, customer request). A lead is not a row in a spreadsheet; it is a pre-qualified opportunity with a generated brief. The proposal URL is not a document; it is a live interface for scope negotiation and, after acceptance, project status.

Existing tools fragment the workflow and assume human data entry at every step: generic CRMs (Salesforce, HubSpot) speak no domain language; measurement tools (EagleView, Hover, STACK) handle one step; trade-vertical CRMs (JobNimbus, AccuLynx) own roofing but nothing else; construction suites (Procore, BuilderTrend) start after the contract is signed. All of them are systems of record. Mercer is the operating stance that a category-defining product for this industry in 2026 cannot be — the operational surface has to get dramatically smaller, and the agents have to do the work the contractor used to do.

**Product vision in one line:** The AI-native operating system for commercial renovation — point a phone at a building, get a bid; sign it, get a project; run it, get a clean close-out.

---

## 2. Goals and Non-Goals

### Goals

- Reduce the contractor's time-to-bid from hours-to-days (walk property, transcribe, Excel, PandaDoc) to minutes (capture, review AI draft, send) on the target property type.
- Make scope gaps (the porch-floors pattern) structurally impossible by reconciling measurement, spec, capture, and customer request into a single traceable scope object.
- Turn trade-show attendee lists into ranked pipelines with generated briefs, not spreadsheets of names to manually research.
- Collapse the post-sale ops layer (expense tracking, change orders, punch-lists, paint guides) into structured records that LLMs read and write against, so that adding an "ops feature" is days of work rather than weeks.
- Own the lead-to-punch-out workflow for one trade (exterior painting) on one property type (multifamily) with one design partner (Reno Base) before expanding trades.
- Keep the data model trade-agnostic so that siding, stucco, envelope, and concrete restoration can be added as incremental capture types and scope templates on the same spine.

### Non-Goals

- Serving residential contractors. The buyer profile (property manager, capex cycle, approved vendor list) is load-bearing and incompatible with residential service dispatch.
- Serving ground-up construction. The product assumes an existing, occupied building — and the AI leverage is specifically in *reading* existing conditions, not in planning new ones.
- Solving roofing. JobNimbus and AccuLynx exist. If a customer asks, the answer is "not yet."
- Replacing accounting, tax, or payroll software. Mercer reports on job financials; QuickBooks stays downstream.
- **Building a chat-first product.** Chat is a tool the product uses internally for agent orchestration; it is not the interface. The contractor does not "ask the AI for a bid." The contractor captures a property and reviews a draft.
- **Human-first data entry as the primary UX.** Forms exist as the edit surface for AI-generated drafts, not as the origination point for new records. If a workflow still looks like a spreadsheet in Mercer, we've built the wrong thing.
- **Configurability as a core product value.** Opinions about the workflow are the product. The AI layer is what adapts to a contractor's specifics; the UI does not need to. Field sets on leads, bids, and projects are opinionated and uniform across tenants — see §6.1-§6.3 for the definitive field list. There is no per-contractor custom-fields system in Phase 1.
- **Generative output for numeric fields.** Square footage, material costs, labor hours, and totals are computed deterministically from structured inputs. LLMs orchestrate, read, summarize, and explain; they do not produce the numbers the business runs on.

---

## 3. Users and Personas

### Rob — The Owner-Estimator

Late-career founder of a regional exterior painting business. Today, Rob visits properties in person, takes handwritten dimensional notes on porch walls, gables, catwalks, tunnel ceilings, and stairwells, then transcribes them into an Excel template that converts square footage into materials, labor, and a final price. Proposals go out via PandaDoc. Files live across iCloud Desktop, SharePoint, and Chrome tabs.

Rob's workflow is the canonical source of domain truth, and the AI models are trained against it: measurement templates, coverage assumptions, per-unit labor pricing, substrate specs, scope-line logic.

**Rob's interaction model in Mercer:** Rob opens the app on his phone at the property. He walks the buildings, capturing photo and video. The app generates a takeoff draft he reviews and edits. He has an opinion about whether the gable square footage is right and can override it. He does not transcribe numbers. He does not rebuild the Excel template each time. His pattern recognition — "this is a six-unit three-story, I know what this costs" — is the guardrail, not the data entry system.

**Pain points Mercer addresses:**
- The hours-per-bid spent transcribing notes and rebuilding Excel
- Scope gaps (the porch-floors miss) that come out of his pocket
- Remembering which building styles exist on a property he walked three months ago
- Finding the bid for a property someone calls him about

### Jordan — The Operations Lead

Mid-career co-owner running the ops side of AQP: pipeline management, scheduling, subcontractor assignment, expense tracking, punch-outs, customer communication. Ran a Salesforce build that worked functionally but failed operationally because Rob couldn't use it. Current operating system is a multi-tab spreadsheet.

**Jordan's interaction model in Mercer:** Jordan supervises agents. The lead-qualification agent ranks the NAA Orlando attendee list; Jordan reviews the top twenty and decides which to pursue. The scope-reconciliation agent flags that the Fountains at Pershing bid has no line item for tunnel ceiling touch-up despite being in the capture; Jordan either adds it or dismisses the flag. The expense-reconciliation agent tells him Dante went $10K over on paint; Jordan asks why, gets a grounded answer referencing specific invoices, and decides whether it's a real problem or a takeoff error. He does not run queries. He does not build reports. He reviews agent output and makes decisions.

**Pain points Mercer addresses:**
- Tracking a job across five disconnected systems
- Losing context between a won deal and its ops handoff
- Reconciling takeoff budgets against actual material spend
- Answering cross-sectional questions ("how much with High Mark last year, how many damages") that require five spreadsheet joins today

### Jessica — The Admin

Handles proposal formatting, photo insertion into PandaDoc, file organization across OneDrive. Not a decision-maker on tooling but a daily user.

**Jessica's interaction model in Mercer:** Much of Jessica's current work disappears, because photos flow directly from the capture into the proposal, file organization is automatic, and proposal formatting is handled by the template system. Her role shifts toward supervising the AI-generated proposal drafts, handling customer communication, and managing exceptions the agents flag. She becomes the human layer for edge cases the agents aren't confident about.

**Pain points Mercer addresses:**
- Photo management inside proposals (now automatic)
- Keeping job folders organized (now the wrong primitive; everything is indexed by bid/project)
- Reducing manual re-entry across documents

### The Property Manager — The Customer-of-the-Customer
 
A regional property manager or portfolio owner overseeing anywhere from a handful to dozens of multifamily properties on behalf of an ownership group or REIT. Works on a capex cycle: annual budgets are set months in advance, and major exterior work (repaints, siding replacement, envelope retrofits) is planned one to three years out against projected reserves. Buys against an approved vendor list built over years of word-of-mouth, trade-show encounters, and referrals from Sherwin-Williams reps or other property managers. Rarely awards work to a contractor who isn't on that list, and getting on the list matters more than winning any single bid.
 
A typical decision-making process: the property manager notices a property due for recoat, either through a visual inspection, a property-condition report, or a complaint from a resident or owner. They reach out to two or three trusted contractors from the approved vendor list for bids. Bids arrive as PDFs attached to emails — often days or weeks apart, with inconsistent formats, unclear inclusions, and pricing that's hard to compare line-by-line. The property manager forwards the bids to their regional director or ownership group for budget approval, fielding questions about scope, timeline, and warranty along the way. Once approved, the chosen contractor is verbally awarded the job; work begins; the property manager gets periodic updates from the contractor's crew or sub. After completion, they file the paint colors and product codes in a folder somewhere for next time — or, more often, lose them and ask the contractor again in five years.
 
The property manager is accountable to two audiences: the ownership group (who wants the asset maintained and costs controlled) and the residents (who don't want to live through a painting project any longer than necessary). Their reputation as a manager is built on running properties that look good, stay within budget, and don't generate complaints.
 
**Property manager's interaction model in Mercer:** Receives a proposal URL from the contractor, not an email attachment. On the URL, they can see per-building breakdowns with photos, hover over line items to see exactly what's included and why (metal primer on railings because the spec calls for it, porch floors because they were previously painted), ask questions that route back to the contractor as structured comments tied to specific scope items, and request scope adjustments ("can we descope the stairwells and extend the timeline by two weeks to stay under $400K?") that produce a live revised bid inline. After acceptance, the same URL becomes the project status page — crew photos, schedule updates, weekly summaries — with no new login, no new app, no new tool to learn. When they want the paint colors for a touch-up five years later, the URL is still there.
 
**Pain points Mercer addresses (through the contractor):**
- Comparing bids that arrive in inconsistent formats with unclear line-item detail
- Explaining scope and pricing decisions to the ownership group or board without being the contractor
- Tracking project progress without calling or emailing the contractor every few days
- Finding historical project information (colors, products, warranty terms) years later
- Making scope trade-offs against budget without waiting days for a revised quote
**Implications for Mercer:**
- The customer's surface area is a URL. Authentication stays optional — any friction reduces adoption by the decision-maker we need the contractor to look good in front of.
- The proposal URL is load-bearing twice: once as a sales tool that differentiates the contractor, and again as a retention tool that keeps the customer in Mercer's orbit for future capex cycles.
- The AI layer is what makes the URL genuinely responsive (scope change requests, line-item explanations) without adding friction for either party.
- The property manager never pays Mercer. The contractor does. But the property manager's experience is what wins the contractor the next bid, and Mercer's share of that credit is how contractors justify the subscription.

---

## 4. Market and Competitive Landscape

The software around exterior renovation fragments along three axes now, not two: **what stage of the job the tool owns**, **who the tool is built for**, and — newly salient in 2026 — **whether the tool is a system of record with AI features or an AI-native workflow engine**.

### By stage

| Stage | Representative tools | Relationship to Mercer |
|---|---|---|
| Measurement | EagleView, Hover, STACK, PlanSwift | Upstream; integration targets and training-data sources, not substitutes |
| Pre-sale (lead → close) | Salesforce, HubSpot, Pipedrive; JobNimbus, AccuLynx, Roofr | Direct overlap; generics don't speak domain, roofing tools don't extend past roofing |
| Post-sale operations | Procore, BuilderTrend, JobTread, Knowify | Direct overlap on the expanded scope; built for ground-up or residential remodel |

### By buyer

Unchanged from prior analysis: industry-agnostic platforms can't out-specialize a vertical product, residential service dispatch has wrong unit economics, trade-vertical CRMs are roofing-only, ground-up construction has wrong starting assumptions. The empty quadrant is occupied commercial renovation beyond roofing.

### By architectural stance

This is the axis that's genuinely new in 2026, and it's the most important one.

**System of record with AI features.** Most of the above. A database at the core; a UI that lets humans read and write records; an LLM layered on top for chat, summaries, or generative copy. The AI is additive. You could turn it off and still have the product. JobNimbus, AccuLynx, Procore, and the generic CRMs are all in this category, including their 2025-2026 AI releases.

**AI-native workflow engine with record-keeping.** The AI system is the thing that does the work, and the records are what the AI reads and writes. Turn off the AI and you don't have a degraded version of the product; you don't have the product. Capture becomes an empty form. Enrichment becomes a null column. Scope reconciliation stops running. Mercer sits here, alone in the category.

This distinction is defensible in a way the stage-and-buyer framing alone isn't. To rebuild Mercer, a competitor needs not just the domain model but the entire agent and vision stack, the evals, the capture UX, the confidence-scored output surfaces, and the design-partner loop to train against. Bolting "AI-powered" onto JobNimbus doesn't close the gap, because the UX premise is different — JobNimbus's forms assume human data entry.

### Positioning

Roofing contractors have JobNimbus and AccuLynx as systems of record with AI features. Ground-up construction has Procore in the same category. Occupied commercial renovation, across the full exterior trade stack, has no category leader at all — and no one has yet built an AI-native version for any adjacent trade either. Mercer is that product: AI-native, multifamily exterior, painting first, widening trade-by-trade as the foundation holds.

The roofing analogue still validates the workflow pattern. The architectural stance is where the category-defining opportunity lives.

### Why not [the obvious choice]

- **Salesforce / HubSpot + AI add-ons.** Infinitely configurable, speaks nothing. No domain model for buildings, takeoffs, substrates, or coverage. No vision capture. No scope reconciliation. The AI add-ons are chatbots and generative email drafts, not agents doing the work.
- **Jobber / Housecall Pro / ServiceTitan.** Residential unit economics, wrong buyer.
- **JobNimbus / AccuLynx.** Roofing-only and system-of-record architecture. Their 2025-2026 AI features are generative proposal copy and pipeline summaries, not capture-driven takeoffs.
- **Procore / BuilderTrend / JobTread.** Ground-up or residential-remodel bias. Post-sale only. No opinion about lead qualification or pre-sale capture.
- **EagleView / STACK / Hover.** Measurement only, single-family residential at best for phone-capture products. Integration targets for the aerial measurement leg.

---

## 5. Product Scope

Organized around the contractor's workflow as a pipeline of capability areas. Each area describes the AI-native operation as the primary product, with the structured records below it as the substrate, and explicit deferrals where the AI-native version is hard enough to warrant sequencing.

### 5.1 Lead Capture and Qualification

Leads enter Mercer from three sources: trade-show attendee lists (CSV), inbound inquiries (manually added), and outbound prospecting (manually added). The AI-native move is qualification, not enrichment.

A **lead-qualification agent** runs on every imported row. Given a name, company, and email, it researches the property portfolio the management company operates, pulls public data on those properties (year built, unit count, public RFP activity), estimates repaint timing from typical recoat cycles and visible satellite condition, and produces a ranked brief per lead. The contractor's queue is a ranked pipeline with explanations, not a spreadsheet to manually triage.

**Capabilities**
- CSV import with column auto-mapping and per-import source tagging
- Manual single-lead entry
- Lead-qualification agent run per lead with: resolved property portfolio, estimated paint-timing score, generated brief, satellite thumbnails for top candidate properties
- Confidence score per enrichment with graceful degradation (low-confidence leads surface as "needs human review" rather than fabricated data)
- Lead list view with ranking by qualification score, filtering by source and status, and detail view per lead
- **Property-grouped list view** as the default. Trade-show CSV rows are property-level, not contact-level: one attendee covering five communities appears five times with five different addresses. The list groups rows by `resolved_address`, sorted by earliest follow-up date then alpha, with a `By contact` toggle that restores the flat table when a contact-first read is needed.
- **Outreach state per lead**: `last_contacted_at`, `follow_up_at`, `contact_attempts`. Lead detail surfaces a one-click "log contact attempt" (timestamps + increments the counter) and a follow-up date input. Property-card headers roll up the earliest follow-up across contacts at that property and flag overdue dates.
- Lead status: new / qualified / quoted / won / lost
- Manual override and correction of agent output (becomes training data)

**Deferred**
- Outbound agent that drafts first-touch emails per qualified lead
- Deduplication and portfolio grouping across imports
- Assignment to reps

### 5.2 Capture and Takeoff

The bid engine is the heart of the product, and the place where the AI-native stance is most visible. The primary input is not a dimensional form — it's a **capture**.

A capture is a set of photo and video inputs from a property walk, optionally paired with satellite imagery and a building footprint. A **vision-based takeoff agent** processes the capture and produces a structured takeoff draft: building types identified and counted, surfaces enumerated per type, dimensional estimates with confidence scores per surface. The contractor reviews the draft in a form-based edit interface, correcting dimensions the agent is unsure about or got wrong.

The form still exists. It's now the edit surface, not the origination point. A contractor without a capture can fall back to manual entry — but the product is optimized for the capture-first path.

**Capabilities**
- Mobile capture flow: photo and video with optional scale references (tape-measure callouts, known doorway heights, etc.)
- Remote-capture mode: satellite + street view + footprints only, for pre-walk preliminary estimates
- Vision-based takeoff agent produces draft with: building types, building counts, surfaces per building type, estimated dimensions per surface, confidence score per field
- Form-based edit interface for correcting and completing draft
- Compound surface entries preserved (Rob's `(8×3×2) + (17×8×9)` notation) as a valid structured input, both agent-generated and human-entered
- Real-time deterministic math on edits (all totals recompute instantly; no LLM in the numeric path)
- Per-user defaults for coverage rates, labor rates, margin, default substrates
- Custom line items (metal primer, bleach wash, flooring contingency, equipment rental)
- Bid status: draft / sent / won / lost
- Capture artifacts preserved as part of the bid record for later agent operations (scope reconciliation, proposal generation, punch-list seeding)

**Deferred**
- Fine-tuned or custom vision models (Phase 1 uses frontier model APIs; custom comes later if accuracy or cost demand it)
- Automatic substrate detection (siding vs. stucco vs. masonry) from photos
- Multi-capture stitching (combining walk-around captures across multiple visits)

### 5.3 Scope Reconciliation

Scope is a **structured, traceable object**, not prose in a PDF. Every line item in the scope has a source: a measurement in the takeoff, a line in the Sherwin-Williams spec PDF, something visible in the capture, a note from the customer's original RFQ. The data model makes this first-class.

A **scope-reconciliation agent** runs on every bid. It reads the takeoff, the capture, the spec PDF (if uploaded), and the customer's original request (if available), and flags gaps: "spec calls for metal primer on all railings; 116 railing sections are visible in the capture; no line item for metal primer in the takeoff — add it?" The contractor accepts, modifies, or dismisses each flag. The flag history becomes part of the bid record.

This is where the porch-floors miss stops happening — not because a human is being more careful, but because the system is checking what a human would have had to manually cross-reference across three documents.

**Capabilities**
- Structured scope object per bid: line items, each with source reference (measurement_id, spec_doc_page_ref, capture_image_ref, customer_request_id, contractor_judgment)
- Spec PDF upload and structured extraction (products, areas, coverage requirements)
- Customer request ingestion (email forward, pasted RFQ, voice note dictation)
- Scope-reconciliation agent runs on bid draft; produces ranked list of gap flags
- Flag review UI: accept as line item, modify, or dismiss with reason
- Flag history preserved per bid
- Scope changes during proposal negotiation (see §5.4) also run through reconciliation

**Deferred**
- Spec library across manufacturers (Sherwin-Williams, PPG, Benjamin Moore) with pre-parsed structured data
- Cross-bid pattern learning (e.g., "you usually include porch floors on this building type; this bid doesn't")
- Substrate-aware material math variations

### 5.4 Proposal as a Live Surface

The proposal is an interactive, AI-responsive URL, not a static PDF.

The contractor sends a shareable URL. The property manager opens it — no login — and sees the proposal with per-building breakdown, scope summary, photos from the capture, warranty, timeline, and price. They can hover over line items to see source, ask questions that route to the contractor as structured comments, and request scope changes that produce a live revised bid inline. A **negotiation agent** on the contractor's side processes incoming scope-change requests: parses the ask, checks feasibility against the takeoff and margin targets, and drafts a revised bid for the contractor to approve and send.

PDF export remains available for property managers who insist. It is not the primary surface.

**Capabilities**
- Shareable public proposal URL (`/p/[slug]`) with no-auth access
- Per-building square footage breakdown, scope summary, inclusions/exclusions, warranty, timeline, price
- Photos from capture embedded automatically
- Hover-to-source on scope line items
- Structured comment thread on any scope item or the proposal as a whole
- Accept/decline actions with capture of approver name and title
- Scope-change request UI: property manager requests a change; negotiation agent drafts a revised bid; contractor reviews and sends
- PDF export as fallback
- Proposal-response status propagation: on accept, bid → won, lead → won, project created (see §5.5)

**Deferred**
- Real email sending with open/click tracking (SendGrid / Postmark)
- Signature capture and legal-grade e-sign
- Proposal versioning with visible diffs
- Retention campaigns for unresponsive recipients
- Customer account surface with historical proposals across contractors (a platform play, not a Phase 1 play)

### 5.5 Project Layer

When a bid is accepted, the deal becomes a **project**. The scope is deliberately narrow in Phase 1 (status, dates, sub, notes, status-page pivot) and expands in later milestones as the AI-native ops layer is built. The point of starting narrow is not to defer ops indefinitely — it's to prove the handoff from pre-sale to post-sale lives in one system before layering agent operations on top of it.

#### Lifecycle and trigger

Project creation is **automatic on acceptance**. The instant `proposal_share.accepted_at` is set, a `project` row is created in the same database transaction that flips the bid to `won` and the lead to `won`. There is no separate "convert to project" step for the contractor — the moment the property manager signs, the deal is a project. One project per bid; if a previously-declined share is re-accepted, the existing project is updated rather than duplicated. Defensive `ON CONFLICT DO NOTHING` on `bid_id` makes the create idempotent under any race.

A bid that has not been accepted has no project. A bid that is later marked declined keeps any project that was previously created (post-acceptance state changes, including unwinding a deal, are project-side concerns rather than bid-side ones).

#### State machine

Five states. Linear primary path with one off-ramp and one explicit reopen:

```
not_started → in_progress → punch_out → complete ──┐
                    ↓             ↑                │
                 on_hold ─────────┘                │
                    ↑                              │
                    └──────── reopen ──────────────┘
```

- `not_started` (default on creation)
- `in_progress` — entering this state stamps `actual_start_date` if not already set
- `punch_out` — open issues and final walks; entering does not clear `actual_start_date`
- `complete` — entering this state stamps `actual_end_date` if not already set. Can be **reopened** to `punch_out` (typical: walk-list items resurface) or back to `in_progress` (substantive rework). Reopening clears `actual_end_date` so the next entry into `complete` re-stamps it; `actual_start_date` is preserved through the reopen.
- `on_hold` — side state reachable from any non-terminal state and exitable back to `in_progress` (typical: weather, owner pause, sub availability)

Transitions are **manual** from the project detail page. There are no magical state flips driven by external events in Phase 1 (no calendar integration auto-starting jobs, no sub-portal events advancing punch-out). The intent is to keep the state machine honest while the team is small and the surface is new.

#### What the project inherits vs. what it owns

The bid is the **contract artifact**. It does not become editable just because work has started. The project owns the operational metadata around delivery.

*Inherited by reference, immutable from the project's perspective:*

- The bid record (scope, price, satellite, captures, spec documents, scope items, scope flags, line items)
- The proposal snapshot (the exact frozen version the property manager accepted)
- The lead (if the bid was created from one)
- All capture artifacts, spec documents, and customer requests attached to the bid

*Owned by the project (mutable post-creation):*

- `target_start_date`, `target_end_date`
- `actual_start_date`, `actual_end_date`
- `assigned_sub`, `crew_lead_name`
- `status`
- Freeform `notes`
- A feed of `project_update` records (see data model in §6)

#### Public status-page pivot (Slice 3)

The same `/p/[slug]` URL the property manager used to accept the proposal becomes the project status page post-acceptance — same slug, same no-auth access, same single bookmark for the lifetime of the relationship. Post-accept, the URL renders:

- The frozen scope and price from the accepted proposal (read-only)
- Schedule (target start/end, actual start/end)
- Current status with a human-readable label
- The feed of `project_update` records flagged `visible_on_public_url = true` (auto-posted crew photos, schedule updates, weekly summaries; private contractor-side updates stay internal)

This is the property-manager retention surface. They never need to log in, install anything, or learn a new tool to know what's happening on their property — and five years later, when they need the paint colors, the URL is still there.

#### Scope changes after acceptance

Out of scope for Phase 1. The bid is frozen at acceptance; the proposal snapshot is the legal artifact; the project surface is for delivery metadata, not scope edits. If the property manager needs a scope change after acceptance, the Phase 1 mechanism is **off-system conversation** plus, if needed, a **new bid**. Mid-project scope edits within the existing project record are not supported and should not be quietly enabled — that's a change-order workflow and it's deferred (see below).

#### Deferred — AI-native when built (see §9 Milestone 5)

- **Expense reconciliation agent.** Jordan's "why are we over by $10K on paint?" as a grounded query against invoices and takeoff buckets.
- **Change-order workflow** driven by voice dictation + LLM structuring. This is where the post-acceptance scope-change story actually gets built.
- **Pre-con and post-con walk checklists** auto-generated from the capture and scope.
- **Punch-list seeding** from capture + scope, with photos linking back to specific line items.
- **Auto-generated paint guides** from project records.
- **NPS collection and analysis.**
- **Draw schedules and invoicing.**
- **Damage tracking.**
- **Sub performance patterns** (who goes over, who under, on what trade types).

### 5.6 Pipeline and Reporting

A single view of deal state, with AI as the query interface.

**Capabilities**
- Funnel view: leads → qualified → quoted → won, with conversion rates
- Counts by status and source tag
- Total pipeline $ value (lead-stage estimates + active bid totals + won deal contract values)
- Drill-down from each count to underlying records
- **Natural-language query surface over the full record set** ("how many jobs with High Mark last year, what was the average overrun"), grounded against structured records, not hallucinated

**Deferred**
- Saved views per user
- Time-series trend analysis
- Scheduled reports / digest emails
- Per-rep or per-sub attribution at scale

---

## 6. Functional Requirements

### Data Model

Primary entities, with AI-native additions called out:

| Entity | Key fields | Relationships |
|---|---|---|
| user | id, email, auth fields, defaults (coverage, labor rate, margin) | — |
| account | id, user_id, name, website, source_tag, status, notes | properties, contacts |
| property | id, user_id, account_id, name, address, lat/lng, place_id, satellite_image_url, enrichment fields, source_tag, raw_source | leads, bids, property_contacts |
| contact | id, user_id, account_id, name, email, phone, title, source_tag, relationship_tier | property_contacts, lead_contacts |
| property_contact | id, user_id, property_id, contact_id, role, decision_influence, source_tag, import_ref, active, first_seen_at, last_seen_at | property, contact |
| lead | id, user_id, property_id, account_id, primary_contact_id, source_tag, legacy contact/property compatibility fields, **qualification_score**, **qualification_brief**, **agent_run_id**, status, priority, opened_at, closed_at, notes | lead_contacts, activity_events, bids |
| lead_contact | id, user_id, lead_id, contact_id, property_contact_id, role, is_primary | lead, contact |
| activity_event | id, user_id, lead_id/contact_id/property_id/account_id/bid_id, type, title, body, occurred_at, metadata | human-readable timeline |
| audit_log | id, user_id, actor_user_id, entity_type, entity_id, action, changed_fields, previous_values, new_values, source, created_at | structured change history |
| bid | id, user_id, lead_id (nullable), property_id, primary_contact_id, property_name, client, address, lat/lng, satellite_image_url, status, subtotal/margin/total, notes | buildings, line_items, proposals, project, **captures** |
| **capture** | id, bid_id, type (photo/video/satellite/streetview), storage_url, taken_at, gps, **vision_agent_run_id** | surfaces (agent-produced), scope_flags |
| building | id, bid_id, type_name, count, notes, **capture_refs** | surfaces |
| surface | id, building_id, surface_name, dimension_inputs (structured), computed_sqft, substrate, **source_type** (agent/human), **confidence_score**, **capture_ref** | — |
| **scope_item** | id, bid_id, description, amount, kind (material/labor/other), **source_type** (measurement/spec/capture/customer_request/contractor_judgment), **source_ref** | — |
| **scope_flag** | id, bid_id, flag_type, description, source_refs, status (open/accepted/dismissed), dismissed_reason, created_by_agent_run_id | — |
| **spec_document** | id, bid_id, storage_url, extraction_agent_run_id, parsed_products (jsonb), parsed_areas (jsonb) | — |
| **customer_request** | id, bid_id, source (email/rfq/voice), raw_content, parsed_scope (jsonb) | — |
| proposal | id, bid_id, snapshot_data, pdf_url | proposal_shares, proposal_comments |
| proposal_share | id (slug), proposal_id, accessed_at, accepted_at, accepted_by_name, accepted_by_title, declined_at, decline_reason | proposal_comments |
| **proposal_comment** | id, proposal_share_id, scope_item_id (nullable), author_name, body, created_at | — |
| **scope_change_request** | id, proposal_share_id, original_scope_snapshot, requested_change_description, negotiation_agent_run_id, proposed_revised_bid, status | — |
| project | id, bid_id (unique), user_id, status (`not_started`/`in_progress`/`punch_out`/`complete`/`on_hold`), target_start_date, target_end_date, actual_start_date, actual_end_date, assigned_sub, crew_lead_name, **accepted_by_name**, **accepted_by_title**, **accepted_at**, notes | project_updates (full spec: §6.3) |
| project_update | id, project_id, **author_type** (human/crew_auto/agent), author_name, body, attachments_ref (jsonb), **visible_on_public_url** (bool), created_at | — (full spec: §6.3.1) |
| **agent_run** | id, agent_type, inputs_ref, outputs_ref, model, prompt_version, started_at, completed_at, confidence_metrics (jsonb), cost_usd | — |

The `agent_run` table is load-bearing. Every agent operation produces a record with enough traceability to replay, debug, and evaluate. Without this, the product becomes impossible to improve and impossible to trust.

The §6 table above is the relationship map. The three subsections below — §6.1, §6.2, §6.3 — are the **definitive field spec** for the three primary workflow entities (lead, bid, project). Field sets are deliberately uniform across tenants. There is no per-contractor customization of which fields exist; see §2 (non-goals) and §12 (build principles).

Convention used in each subsection:

- *Identity* — primary key, ownership, timestamps
- *Business* — domain-meaningful columns the product surfaces
- *Workflow state* — status enums, transitions
- *Agent layer* — fields populated by AI agents (often aspirational and flagged with the milestone they unlock)

Field shapes call out type, nullability, and a one-line purpose note. Aspirational fields not yet in the live schema are flagged inline with the milestone that introduces them.

### 6.1 Lead fields

Grounded in the normalized lead-domain model. A lead is a **property-level sales opportunity**: one property being pursued during one sales cycle. Contacts and properties are durable records linked through `property_contacts`; contacts participating in an opportunity are linked through `lead_contacts`. The old flat contact/property fields remain on `leads` only as compatibility fields while the UI migrates screen by screen.

*Identity*

- `id` (uuid, PK) — server-generated.
- `user_id` (uuid, not null) — owner; cross-user reads are forbidden.
- `created_at`, `updated_at` (timestamptz, not null) — audit timestamps.

*Contact*

- `name` (text, not null) — primary contact at the company. The only required identity field; everything else can be missing on a sparse trade-show row.
- `email` (text, nullable).
- `phone` (text, nullable).

*Company context*

- `company` (text, nullable) — management company / property group name. The qualification agent (Milestone 3) keys off this to resolve the portfolio.
- `property_name` (text, nullable) — a specific property the contact mentioned. Hint, not a foreign key; the bid captures the actual property to bid on.
- `source_tag` (text, nullable) — per-import provenance ("NAA Orlando 2026", "inbound 2026-04-12", "outbound — Sherwin rep referral").
- `raw_row` (jsonb, nullable) — unmapped CSV columns from import, kept verbatim for later use.
- `notes` (text, not null, default `''`) — freeform contractor notes.

*Resolved property address*

This is the **multifamily property the contact manages**, not a corporate office. The trade-show CSV carries the property `Address / City / State / Zip` directly; the enrichment runner uses those when present and only falls back to a Places lookup keyed on `company` when the CSV row is address-less. The property-grouped list view groups by this column.

- `resolved_address` (text, nullable) — formatted property address. Authoritative when the CSV provided it; backfilled by Places for sparse rows.
- `latitude`, `longitude` (double precision, nullable) — property coordinates.
- `google_place_id` (text, nullable) — Places identifier for re-lookup.

*Enrichment state*

- `enrichment_status` (text enum, nullable) — `idle | pending | success | failed | skipped`.
- `enrichment_error` (text, nullable) — last error message when status is `failed`.

*Outreach state*

Per-contact outreach tracking. Sits on the lead row because contact attempts are per-person, not per-property: two different people at the same management company managing the same property still get tracked independently.

- `last_contacted_at` (timestamptz, nullable) — most recent recorded outreach. Updated by the "log contact attempt" action.
- `follow_up_at` (date, nullable) — date the contractor wants to circle back. The list view surfaces overdue dates in red and rolls up the earliest across contacts at each property.
- `contact_attempts` (integer, not null, default `0`) — running count incremented every time a contact attempt is logged.

*Historical, no longer written for new leads*

- `satellite_image_url` (text, nullable) — kept on the table for back-compat with rows imported before the satellite-strip pass; never written for new leads. Deliberate no-migration decision documented in the worklog. New code should not read this column on the lead.

*Qualification — aspirational, Milestone 3*

- `qualification_score` (numeric, nullable) — 0–100 confidence-weighted ranking from the qualification agent.
- `qualification_brief` (text, nullable) — generated brief covering portfolio, paint timing, public-data signals.
- `agent_run_id` (uuid, nullable, FK → `agent_run.id`) — pointer to the run that produced the brief, for traceability.

*Workflow*

- `status` (text enum, not null, default `new`) — `new | qualified | quoted | won | lost`. Note `qualified` is reserved for the qualification-agent-driven flow (Milestone 3); pre-Milestone-3 leads jump straight from `new` to `quoted` on first bid.

### 6.2 Bid fields

Grounded in the current `bids`, `buildings`, `surfaces`, and `line_items` tables. The bid is the **property-level opportunity** and, post-acceptance, the **contract artifact**. It does not become editable post-acceptance; project-side delivery metadata lives on the project (§6.3).

*Identity*

- `id` (uuid, PK).
- `user_id` (uuid, not null) — owner.
- `lead_id` (uuid, nullable, FK → `leads.id`) — bids can exist without a lead (cold inbound, walk-in).
- `created_at`, `updated_at` (timestamptz, not null).

*Property — the thing being painted*

Distinct from the lead's office address. Captured at bid creation via the address-autocomplete flow.

- `property_name` (text, not null) — display name on the proposal.
- `address` (text, not null) — formatted address.
- `latitude`, `longitude` (double precision, nullable) — coordinates of the property.
- `google_place_id` (text, nullable) — Places identifier.
- `satellite_image_url` (text, nullable) — proxy URL for the satellite tile shown in the bid summary and on the proposal.

*Client*

- `client_name` (text, not null) — buyer-side primary contact for this bid. Intentionally thin in Phase 1; richer client-contact fields (email, phone, role, ownership group) are deferred until the qualification agent lands in Milestone 3 and structured client objects become useful.

*Pricing inputs*

Each overrides the corresponding `user_defaults` value when set; nulls fall back to defaults.

- `coverage_sqft_per_gallon` (numeric, nullable).
- `price_per_gallon` (numeric, nullable).
- `labor_rate_per_unit` (numeric, nullable).
- `margin_percent` (numeric, default `0`).

*Derived totals — never stored as columns*

Subtotal, margin amount, and total are **computed deterministically** by `src/lib/pricing.ts` from surfaces + line items + pricing inputs. Re-stating the §6 AI principle: numeric fields the contract value depends on are computed, never generated. The bid record stores inputs; the totals are derived.

*Child records*

- `buildings[]` — `id`, `bid_id`, `label`, `count`, `sort_order`, timestamps. Each building represents a *type* of building on the property; `count` is how many of that type exist.
- `surfaces[]` (per building) — `id`, `building_id`, `name`, `dimensions` (jsonb of `[length, height][]` tuples preserving Rob's compound-surface notation), `total_sqft` (computed once and cached), `sort_order`, `created_at`.
- `line_items[]` — `id`, `bid_id`, `name`, `amount`, `sort_order`, `created_at`. Custom additions (metal primer, bleach wash, equipment rental).
- `proposals[]` — `id`, `bid_id`, `snapshot` (jsonb of the frozen render data), `pdf_url`, `created_at`.

*Aspirational child records — Milestone 1+*

- `captures[]` — Milestone 1: photo / video / satellite / streetview artifacts feeding the takeoff agent.
- `scope_items[]`, `scope_flags[]` — Milestone 2: structured traceable scope object + reconciliation-agent flags.
- `spec_documents[]`, `customer_requests[]` — Milestone 2: spec PDF parsing + customer-request ingestion.

*Workflow*

- `status` (text enum, not null, default `draft`) — `draft | sent | won | lost`. Transitions: `draft → sent` on proposal generate; `sent → won` on share accept; `sent → lost` on share decline. Manual overrides allowed from the bid detail page.
- `notes` (text, not null, default `''`) — freeform contractor notes.

### 6.3 Project fields

New entity introduced for the project layer. Created automatically when a `proposal_share` is accepted; see §5.5 for lifecycle. The project owns delivery metadata; everything contractual lives on the bid by reference.

*Identity*

- `id` (uuid, PK).
- `bid_id` (uuid, not null, **unique**, FK → `bids.id` on delete cascade) — one project per bid; uniqueness is the database guarantee that supports `ON CONFLICT DO NOTHING` idempotency on accept.
- `user_id` (uuid, not null) — denormalized from the bid for cheap ownership checks (mirrors how `bids.user_id` works).
- `created_at`, `updated_at` (timestamptz, not null).

*Inherited references — read-only from the project's perspective*

Not stored as columns beyond `bid_id`. Reached via the existing join graph:

- bid (and through it: property info, scope, price, satellite, line items, captures, spec documents, scope items, scope flags)
- proposal snapshot (the frozen version the property manager accepted)
- lead (if the bid was created from one)

*Schedule*

- `target_start_date` (date, nullable) — contractor-settable target.
- `target_end_date` (date, nullable) — contractor-settable target.
- `actual_start_date` (timestamptz, nullable) — auto-stamped when status enters `in_progress` (if not already set).
- `actual_end_date` (timestamptz, nullable) — auto-stamped when status enters `complete` (if not already set).

*Assignment*

- `assigned_sub` (text, nullable) — freeform in Phase 1. Becomes a FK to a subs table in a later milestone when sub performance patterns (Milestone 5) ship.
- `crew_lead_name` (text, nullable) — point-of-contact crew lead, freeform.

*Workflow*

- `status` (text enum, not null, default `not_started`) — `not_started | in_progress | punch_out | complete | on_hold`. State machine in §5.5.

*Acceptance provenance*

Copied from `proposal_share` at create-time so the project carries the signer even if the share row changes later.

- `accepted_by_name` (text, nullable).
- `accepted_by_title` (text, nullable).
- `accepted_at` (timestamptz, nullable).

*Notes*

- `notes` (text, not null, default `''`) — contractor-only freeform. Not shown on the public status page.

*Agent layer — aspirational, Milestone 5*

- `expense_reconciliation_agent_run_id` (uuid, nullable, FK → `agent_run.id`) — last expense-recon pass for this project.
- `last_status_summary_agent_run_id` (uuid, nullable, FK → `agent_run.id`) — most recent auto-generated status summary surfaced on the public status page.

#### 6.3.1 project_update fields

Child entity that drives both the public status page and the contractor-internal feed. Introduced in Slice 3 of the project layer (§5.5 public status-page pivot); not in the live schema yet.

- `id` (uuid, PK).
- `project_id` (uuid, not null, FK → `projects.id` on delete cascade).
- `author_type` (text enum, not null) — `human | crew_auto | agent`.
- `author_name` (text, nullable) — display name; null for `crew_auto` / `agent`.
- `body` (text, not null).
- `attachments_ref` (jsonb, nullable) — pointers to capture / photo storage refs.
- `visible_on_public_url` (boolean, not null, default `true`) — when false, update is contractor-internal only and never appears on `/p/[slug]`.
- `created_at` (timestamptz, not null).

### AI Architecture Principles

Binding constraints that shape every feature:

- **Deterministic math lives outside the LLM.** Square footage, material quantities, labor hours, totals, margins — all computed in code from structured inputs. LLMs orchestrate, read, summarize, explain, and classify; they do not emit numbers that flow into the contract value.
- **Every agent output has a confidence score.** Downstream UI can choose to show confident output plainly, flag medium-confidence output for review, and surface low-confidence output as "needs human judgment" rather than fabricating.
- **Every scope item, enrichment field, and structured extraction has a source reference.** Traceability is not a nice-to-have; it's what makes the porch-floors guarantee real.
- **Graceful degradation when the AI fails.** Capture failing to parse → fall back to manual entry. Spec parsing failing → fall back to contractor-provided summary. Qualification agent low-confidence → surface as "needs review" rather than pretending.
- **Human override is a first-class operation and becomes training data.** When Rob corrects a gable dimension from the agent's 420 sqft to 480 sqft, that correction is logged, attributed, and used to improve the model over time.
- **Agent operations are resumable and replayable.** An `agent_run` that fails partway through (network, rate limit, model error) can be retried without losing upstream work. Agent outputs can be regenerated with a newer prompt or model and compared.

### Non-Functional Requirements

- **Mobile-first for on-site use.** Capture is the primary input surface and must work in a parking lot on a phone with spotty cell service. Asynchronous upload and offline queueing are design requirements, not nice-to-haves.
- **Latency.** Capture upload is async; takeoff agent results appear within 60 seconds of upload completion for a typical property walk. Address autocomplete and satellite preview under 500ms. Bid totals recompute synchronously on edit. Scope reconciliation runs asynchronously on bid save.
- **Unit economics.** Per-bid cost of AI operations (vision, qualification, reconciliation, negotiation) must be modeled into pricing from day one. Target: under $X per bid at typical property size, where X is small enough that the product sustains at $500-1000/mo subscription tiers.
- **Evals before features.** No agent ships to production without an evaluation suite covering at least the design-partner ground-truth dataset. "It works on one bid" is not shipping criteria.
- **Observability of agent behavior.** Agent runs, confidence scores, human override rates, and cost-per-run are first-class dashboards for the build team — not just system logs.
- **Deployability.** Vercel preview per PR; production on merge to main. Agent prompt versions are part of the deploy artifact, not runtime config.

---

## 7. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js 16 (App Router), React 19 | Server Components + Server Actions for writes |
| Backend | Next.js | No separate service layer in Phase 1; agent runs may move to dedicated workers as volume grows |
| Data | Postgres via Supabase, Drizzle ORM | |
| Auth | Supabase Auth | |
| UI | shadcn/ui on Tailwind 4 + Radix primitives | |
| Validation | Zod | Shared between client and server; also the schema agents emit structured output against |
| PDF | @react-pdf/renderer | Fallback surface; not primary |
| Hosting | Vercel | |
| Analytics | Vercel Web Analytics | |
| Maps | Google Places API (New); Maps Static API; Google Street View API | Places for autocomplete + lead qualification; Static for thumbnails; Street View for remote-capture mode |
| Building footprints | TBD (see §10 open questions) | Microsoft GlobalMLBuildingFootprints via PostGIS, ATTOM, or paid EagleView tier |
| **Vision models** | **Frontier multimodal API (Claude, GPT-4o, Gemini) in Phase 1; custom fine-tune evaluated later** | Selection driven by evals, not vendor preference |
| **LLM orchestration** | **Direct API calls in Phase 1; agent framework (likely Vercel AI SDK or similar) for multi-step flows** | Avoid over-frameworking early |
| **Structured output** | **Model-native structured output (JSON schema / tool use) against Zod schemas** | Shared schemas between app code and agent output |
| **Evals** | **Custom eval harness against design-partner ground truth; Braintrust or similar as platform evaluated** | Ground-truth dataset is Rob's historical bids + captures + final numbers |
| **Agent observability** | **LangSmith, Braintrust, or custom; evaluated during Milestone 1** | Per-run traces, confidence tracking, cost tracking |
| CSV parsing | Custom RFC-4180-ish parser, server-side | |

---

## 8. What's Built Today

As of this PRD, the following is live at mercer-bids.vercel.app:

- Address-first bid creation with Places autocomplete and satellite confirm
- Building types with counts; paintable surfaces with dimension-factor input (manual, form-based)
- Coverage rates, labor, margin, custom line items; real-time bid totals
- PDF proposal export with per-building breakdown and optional satellite imagery
- Bid status tracking (draft / sent / won / lost) with automatic updates on proposal response
- OSM building footprints on bid detail (hidden pending accuracy resolution)
- Lead import (CSV) with column auto-mapping, source tags, enrichment status, lead detail
- Property-grouped leads list (default) with `By contact` toggle; rows group by `resolved_address` (the CSV-derived property address) and groups sort by earliest follow-up
- Per-lead outreach state: `last_contacted_at`, `follow_up_at`, `contact_attempts`, with log-contact and follow-up controls in the lead detail aside and overdue rollups on property cards
- Lead-to-bid conversion with pre-filled bid creation
- Shareable proposal pages at `/p/[slug]` with accept/decline and status propagation
- Dashboard at `/dashboard` with lead and bid summary counts

**What's not built:** none of the AI-native operations described in §5. The current app is a Phase 0 proof of the data model and the non-AI surfaces. The product described in this PRD starts from here.

---

## 9. Roadmap

Capability milestones, not calendar sprints. Each milestone ends in something a contractor could use on a live job and measurably predicts long-term value. Milestones are sequenced by **where the AI leverage is highest relative to build risk**, not by workflow order.

### Milestone 1 — Capture-First Bidding

The single biggest shift. Replace the dimensional form's primacy with a capture → AI takeoff draft → human edit flow. Keep the form as the edit surface.

**Scope**
- Mobile capture UX (photo, video, optional scale references)
- Vision-based takeoff agent with confidence scoring
- Form-based edit surface with source-traced fields
- Ground-truth eval suite against Rob's historical bids
- Graceful fallback to manual entry

**Exit criteria**
- Takeoff draft from capture lands within ±15% of Rob's final numbers on at least 70% of bids in the eval set for the target property type (multifamily three-story)
- Rob runs at least five live bids through the capture flow and self-reports it as faster than the status quo
- Per-bid compute cost is under the unit-economics target

This is the milestone that makes Mercer a category of product, not a better spreadsheet. Everything else depends on it being real.

### Milestone 2 — Scope Reconciliation

Build the structured scope object with traceability, and the reconciliation agent that flags gaps from measurement + spec + capture + customer request.

**Scope**
- Structured scope object and source references in the data model
- Spec PDF upload and parsing agent
- Customer request ingestion (email paste, voice dictation)
- Scope-reconciliation agent with flag UI
- Eval suite covering known-gap patterns (porch floors, metal primer, substrate mismatches)

**Exit criteria**
- On a test set of Rob's historical bids (including at least one with a known scope miss), the reconciliation agent flags the miss at least 80% of the time
- At least one real bid where the contractor resolves a flagged gap before sending the proposal
- Flag dismissal reasons distribute reasonably (not dominated by "false positive"; not zero "accepted")

### Milestone 3 — Lead Qualification Agent

Trade-show CSV becomes a ranked pipeline with generated briefs.

**Scope**
- Qualification agent: company → portfolio resolution → public data pull → paint-timing estimate → brief
- Confidence-scored ranking
- Lead list UI around the ranking, not the raw import
- Manual override with training-data loop

**Exit criteria**
- Jordan runs a real NAA Orlando attendee list through qualification; the top-10 ranked leads include at least 6 he'd have independently flagged as high-priority
- Agent cost per lead is well under the value of a 10-minute manual research task
- At least one qualified lead converts to a sent proposal

### Milestone 4 — Proposal as a Live Surface

Shareable URL becomes interactive: hover-to-source, structured comments, scope-change requests via negotiation agent.

**Scope**
- Interactive proposal URL with source tracing
- Structured comment thread
- Scope-change request flow with negotiation agent drafting revisions
- Contractor-side review and send of revised bids

**Exit criteria**
- At least one live bid where the property manager makes a scope-change request through the URL and the contractor closes the deal with the revised bid
- Negotiation agent's draft revisions are approved (without further edit) at least 50% of the time

### Milestone 5 — AI-Native Ops Layer, First Slice

Take the highest-leverage piece of Jordan's ERP scope and ship it AI-native.

**Candidate for first slice: expense reconciliation.** Agent ingests Sherwin-Williams invoices (email forward, upload, API when available), assigns to takeoff expense buckets, surfaces overruns with explanations. Jordan's "why are we over by $10K on paint?" becomes a grounded query with a grounded answer.

Other candidates, sequenced by later decision:
- Change-order workflow via voice dictation
- Pre-con / post-con walks auto-generated from scope and capture
- Punch-list seeding from capture + scope

**Exit criteria** — defined during the milestone, gated on what's learned in Milestones 1-4.

### Milestone 6 — Voice-First Contractor Interface

Benny's vision: pull up Mercer, say "we're quoting this property," get a price. The capstone of the AI-native stance — all the upstream milestones collapse into an agent-orchestrated flow where the contractor's voice is the interface.

Not committed in shape until Milestones 1-5 land and the ops layer is exercised on live work.

### Out of scope indefinitely

- Accounting, tax, payroll
- New construction
- Residential service dispatch
- Roofing-specific workflows
- Configurability for contractors outside the commercial multifamily exterior niche

---

## 10. Open Questions

Decisions needed before or during execution.

### AI architecture

1. **Vision model selection.** Frontier APIs (Claude, GPT-4o, Gemini) perform differently on building photos; evals against Rob's ground-truth set decide. Cost differences are material at scale. *Gates Milestone 1.*
2. **Custom vision model timing.** Fine-tuning or custom training on painting-specific building data is plausible but expensive and not Phase 1. Criteria: frontier-API accuracy ceiling hit, or per-bid cost above unit-economics target.
3. **Agent framework vs. direct calls.** Start direct; evaluate framework (Vercel AI SDK, Mastra, custom) when multi-step flows grow. Decision gate: Milestone 2 scope-reconciliation complexity.
4. **Evals platform.** Custom vs. Braintrust vs. LangSmith. Ground-truth dataset construction is the hard part; platform is secondary.
5. **Confidence-score calibration.** How thresholds map to UI states (show / flag / suppress) needs real data from Milestone 1 to tune. Shipping with poorly-calibrated confidence creates either false trust or false alarm.

### Data and sources

6. **Building-footprint provider.** OSM validation came back at ≤20% plausibility. Options: Microsoft GlobalMLBuildingFootprints via PostGIS, ATTOM, EagleView low tier, or defer and rely on capture-derived dimensions. *Affects remote-capture quality.*
7. **Spec PDF sourcing for Milestone 2.** Start with what Reno Base already has on file; evaluate a spec library across manufacturers as a later deliverable.
8. **Ground-truth dataset scale.** Phase 1 evals need at least ~30 complete bids with captures, takeoffs, and final numbers. Rob has the bids but not the captures yet. Getting those captures is a dependency on Milestone 1, and may require a dedicated capture pass on existing properties before the milestone formally starts.

### Business and access

9. **Production server-side Places API key.** Dev uses HTTP-referrer restriction via a Referer spoof; production needs IP-restricted server key.
10. **Supabase email confirmation.** On by default; affects design-partner access and any early-user onboarding. Decide per milestone.
11. **Business model.** Is Reno Base using this internally, or is it the first customer of a new business? Changes priorities on multi-tenancy, billing, onboarding, and product framing. *Needed before Milestone 5.*
12. **Unit economics target.** What compute cost per bid is sustainable at what subscription tier? Sensitivity analysis needed with real Milestone 1 numbers.
13. **Co-founder split.** Robbie (design + product) and brother (engineering). Working agreement on decision-making, code review, release cadence, and ownership of the agent/eval stack needs to exist in writing before Milestone 2 starts.

### Product shape

14. **Proposal-as-surface vs. PDF default.** How hard to push property managers onto the live URL vs. continuing to deliver PDF. Likely answer: both, with URL primary; gate on customer feedback in Milestone 4.
15. **Photos in proposals.** Automatic from capture in the AI-native flow; the original "Rob wants photos" ask becomes trivially solved by Milestone 1 — but only if capture is adopted. Phase 0 manual photo insertion may still matter for bids done before capture coverage is complete.
16. **Where does the contractor edit agent output — inline or dedicated review view?** Biggest UX decision in Milestone 1. Gate on prototyping during the build.

---

## 11. Success Metrics

Phase 1 is a learning exercise, not a revenue exercise. The right metrics measure whether the AI-native stance is delivering leverage and whether real contractors trust the output.

### Milestone 1 — Capture-First Bidding
- Takeoff draft lands within ±15% of Rob's final on ≥70% of bids in the eval set
- ≥5 live bids run through capture flow by Rob
- Rob self-reports capture flow as faster than the status quo
- Per-bid compute cost under unit-economics target
- Human override rate on agent-produced surfaces trends down over time as the model is tuned

### Milestone 2 — Scope Reconciliation
- ≥80% catch rate on seeded scope-gap test set
- ≥1 real bid where a flagged gap is resolved before send
- Flag dismissal distribution is healthy (not dominated by false positives)

### Milestone 3 — Lead Qualification
- ≥6 of top-10 qualified leads match independent human priority judgment on a real list
- ≥1 qualified lead converts to sent proposal
- Per-lead qualification cost well under equivalent manual research time

### Milestone 4 — Live Proposal Surface
- ≥1 live deal closed after scope-change-request flow
- Negotiation agent revisions approved without further edit ≥50% of the time
- Property manager NPS / qualitative feedback on the URL surface

### Milestone 5 — Ops Layer
- Expense-reconciliation agent's explanations accepted as adequate by Jordan on ≥80% of overrun queries
- Time-to-answer on Jordan's cross-sectional questions drops from "build a report" to "ask and receive"
- At least one project runs end-to-end through Mercer without SharePoint fallback

### Cross-milestone
- Design partner willingness to extend to a second trade (measured by conversation, not survey)
- Agent run cost as a proportion of bid value stays within target
- Confidence-score calibration is well-tuned (high-confidence predictions are actually right; low-confidence ones are flagged)

---

## 12. Build Principles

- **AI does the work; humans supervise and edit.** If a feature looks like human data entry, we've built the wrong shape.
- **Deterministic math, never generative.** Numbers flow from structured inputs through code. LLMs orchestrate; they do not calculate.
- **Every output has a source and a confidence score.** Traceability is what makes the product trustworthy.
- **Capture-first, form-second.** Forms are the edit surface, not the origination.
- **Evals before features.** No agent ships without a ground-truth eval set.
- **Graceful degradation.** When the AI is uncertain, surface it; don't fabricate.
- **Human override is a first-class operation.** Every correction becomes training data.
- **Agent runs are resumable, replayable, and logged.** Without this, the product becomes impossible to improve.
- **Mobile-first, on-site use.** Contractors use it in the parking lot.
- **Close the loop.** From lead acquired to project complete, everything lives in one system with a traced record.
- **Output that wins work.** Proposals should be easier to share, review, and sign than the status quo.
- **Domain opinion is the product.** Configurability is deferred. Custom fields, custom statuses, and custom workflows are explicitly out of Phase 1. Opinions about what a lead, bid, and project are *is the product*; the field specs in §6.1-§6.3 are the contract. Value comes from knowing what a building, surface, takeoff, scope item, and punch-out are — and from having AI systems that operate fluently on those primitives.
