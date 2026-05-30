---
name: Property-Rooted Data Model Re-model
overview: "Re-root the data model from bid/job-rooted to PROPERTY-rooted, per the 2026-05-29 Jordan (AQP) working session. Property becomes the top-level object; the scoped opportunity ('project' in Jordan's words) and leads are children of a property; contacts are a parallel object; the scope object (surfaces + a new access dimension) lives inside a project; owner vs. management company vs. contact-role becomes first-class for Notice-to-Owner lien rights; surface measure is paintable square feet; rates are stored config the deterministic pricing engine reads. Sequenced so the cheap, least-arguable parts (property root, owner/NTO, access, rate config) ship before the higher-risk bid→project collapse. See docs/plan.md → 'Property-rooted re-model'."
status: shipped
todos:
  - id: decision-bid-project
    content: "DECISION (gates Phase 3-5) — reconcile 'bid' vs 'project'. RESOLVED 2026-05-29: Option A — collapse bids into a property-rooted projects spine (scope + pricing + lifecycle + delivery on one row)."
    status: completed
  - id: p1-schema-property-root
    content: "Phase 1 schema — SHIPPED 2026-05-29. accounts.type ('management_company'|'owner'|'other', default management_company); properties.management_account_id + owner_account_id (FK accounts); property_parties table (property↔account/contact + role + is_nto_recipient + free-text legal owner; partial-unique one NTO recipient per property). Migration 015_property_root.sql (additive + backfill management_account_id = account_id). leads.property_id NOT NULL deferred to the bid→project collapse (Phase 3) to avoid breaking the no-address lead pool."
    status: completed
  - id: p1-store-property-root
    content: "Phase 1 store — SHIPPED 2026-05-29, then superseded by the 2026-05-30 Ownership/NTO split. findOrCreateAccount(type), findOrCreateProperty(managementAccountId default=accountId, ownerAccountId); getPropertyDetail returns managementAccount/ownerAccount/ownerParty/ntoParty; the first combined setPropertyOwnership helper was replaced by setPropertyOwnerContact (property owner-rep contact) + setProjectNto (project pre-start legal owner / NTO block), both with ownership guards + audit log."
    status: completed
  - id: p1-ui-property-root
    content: "Phase 1 UI — SHIPPED 2026-05-29, then superseded by the 2026-05-30 Ownership/NTO split. The first combined 'Ownership & Notice to Owner' property card became a slim property-level Ownership card posting to setPropertyOwnerContactAction, while legal owner name/address + NTO recipient moved to the /projects/[id] pre-start checklist via setProjectNtoAction. DEFERRED: /leads/new ownership entry (ownership is property-scoped, not known at lead creation) and account-autocomplete type filtering (auto-created accounts default to management_company in the store, which is correct for BAAA imports)."
    status: completed
  - id: p2-schema-scope-access
    content: "Phase 2 schema — SHIPPED 2026-05-29. access_items table (bid_id FK cascade, optional building_id, type lift|scaffold|swing_stage|safety|other, method, quantity, duration_days, amount, rate_derived, sort_order) + buildings.archetype (garden|townhome|mid_rise|high_rise|other). Migration 016_scope_access.sql. Paintable-sqft: treated as semantics on existing surfaces.total_sqft (no column change); UI relabel deferred."
    status: completed
  - id: p2-schema-rate-config
    content: "Phase 2 schema — SHIPPED 2026-05-29. rate_config table (keyed by ownerUserId): scalar paint rates mirror user_defaults + jsonb access_rates for per-archetype access pricing. Migration 017_rate_config.sql backfills from user_defaults; getRateConfig falls back to user_defaults during transition. DEFERRED: rate_config editing UI in /settings + auto-derivation of access amounts from access_rates (lands with prompt-bidding); access amounts are entered explicitly for now."
    status: completed
  - id: p2-pricing-engine
    content: "Phase 2 pricing — SHIPPED 2026-05-29. pricing.ts adds accessItems (default []) + accessTotal to subtotal; deterministic, outside any LLM call. Access included in the live preview, the bid-page total, AND generateProposalAction (folded into snapshot line items so the customer total reconciles); a dedicated access section in the snapshot/PDF is Phase 4."
    status: completed
  - id: p3-reparent-scope
    content: "Phase 3 Stage 1 — SHIPPED + APPLIED 2026-05-29. The bid row IS the project (scope already FKs bids, so no re-parenting of buildings/line_items/access_items/proposals needed). Migration 018_project_spine.sql folds the delivery `projects` fields onto bids (label, delivery_status + check, target/actual dates, assigned_sub, crew_lead_name, accepted_*, delivery_notes), backfills from the 1:1 projects rows (5 won bids), and adds project_updates.bid_id (backfilled, kept alongside project_id). Status model: bids.status keeps the opportunity lifecycle (draft/sent/won/lost); delivery_status holds the post-won phase. Additive only — projects table still authoritative until Stage 2 cutover."
    status: completed
  - id: p3-store-refactor
    content: "Phase 3 Stage 2 — SHIPPED + verified 2026-05-29. Cut the data layer over to the bid spine: accept flow sets delivery_status + accepted_* on the bid (no projects insert; re-accept never clobbers in-flight delivery); project identity = bid id; getProjectByBidId/getProjects/getProject/updateProjectStatus/updateProjectDetails/getProjectUpdates/createProjectUpdate/getPublicProjectByBidId/getProjectStatusCounts all read/write the bid spine + project_updates.bid_id; new ProjectView type + bidToProjectView mapper keep return shapes stable so pages/actions needed NO changes; ProjectStatus re-based on bids.delivery_status. project_updates.project_id made nullable (migration 019). ownerUserId scoping + ownership guards preserved throughout. tsc/lint/build clean; DB check: 5 legacy projects == 5 spine projects, 0 status mismatches. Legacy projects table left in place as a safety net until the flows are exercised in real use."
    status: completed
  - id: p4-proposal-snapshot
    content: "Phase 4 — SHIPPED 2026-05-30. ProposalSnapshot (src/lib/pdf/types.ts) gained optional parties (management/owner/NTO), accessItems[] (separate from lineItems), and per-building archetype; older snapshots without the fields still render unchanged. generateProposalAction populates the new fields (parties via new slim getProposalPartyBlock(propertyId) in store; accessItems no longer fold into lineItems but still flow through calculateBidPricing.accessItems so the grand total reconciles). PDF template renders an 'Ownership & Notice to Owner' party grid, an 'Access' section with type/method/qty/duration/amount, and the archetype label in each building header. /p/[slug] mirrors the same: a party card, an access card, and an archetype line on each building in Scope & pricing. tsc/lint/build clean."
    status: completed
  - id: p3-drop-projects
    content: "Phase 3 Stage 3 — SHIPPED + APPLIED 2026-05-29 (destructive). Migration 020_drop_projects.sql dropped project_updates.project_id and the projects table, and set project_updates.bid_id NOT NULL. Removed the projects pgTable + Project type + import from schema/store. 5 legacy projects rows dropped (data already lived on the bid spine). tsc/lint/build clean; verified projects table gone + bid_id NOT NULL. Cosmetic bids→projects table rename intentionally NOT done (high churn, low value)."
    status: completed
  - id: p5-docs-cleanup
    content: "Phase 5 — SHIPPED 2026-05-30. docs/lead-data-model.md fully rewritten to property-rooted (new object graph + entity table covering accounts.type, property_parties, archetype on buildings, access_items, rate_config, the bids==projects collapse; updated product rules; migration history through 020). README updated: 'Leads' bullet flipped to 'Property-rooted data model', new 'Bids (projects)' section explaining the bid==project collapse + access/archetype/rate_config, 'Project layer' rewritten (no separate projects table), schema and db:apply-manual descriptions updated, migration range bumped 014→020. docs/plan.md: Open-now #1 (re-root data model) moved to Shipped with a full Phase 1–5 entry; remaining open-now items renumbered; the inline 'Property-rooted re-model (open)' decision-record block flipped to '(shipped 2026-05-30)' with a lead-in pointer to the Shipped entry. Cross-reference to 'Open now #2' in the rationale updated to '#1' after renumbering."
    status: completed
---

# Property-Rooted Data Model Re-model — build plan

Source: 2026-05-29 Jordan (AQP) working session, captured in `docs/plan.md` →
*Property-rooted re-model*. Build stance is **AQP-specific** (PRD §10 Q11
resolved): build deep for AQP, keep object seams clean (property/project/contact
as real objects, **rates as config not hardcode**), generalize only if a second
customer forces it. Do not pay the multi-tenant/abstraction tax up front.

This plan is sequenced so the **least-arguable, highest-value** work ships first
(property root + owner/NTO + access + rate config), and the **one real fork**
(bid↔project reconciliation) is isolated to Phase 3+ behind an explicit decision.

---

## The one open decision: "bid" vs "project"

Jordan calls the scoped opportunity a **project** ("one bid for the blue
section and one for the whole building: two projects, one property, only one
will happen"). Our current schema already uses the name `projects` for the
**post-acceptance delivery record** (1:1 with a won `bid`, status state machine,
`/projects/[id]`). So Jordan's "project" ≈ our `bid`, and our `projects` is the
delivery back-half. The remodel must reconcile this. Two options:

**Option A — Collapse `bids` into a property-rooted `projects` spine (recommended).**
One row per scoped opportunity, child of a property, carrying scope + pricing +
the *full* lifecycle (estimating → quoted → won/lost → not_started →
in_progress → punch_out → complete, + on_hold). Eliminates one table, unifies two
status machines, and matches Jordan's vocabulary 1:1. Proposals remain frozen
priced snapshots that hang off the project. **Cost:** the largest single
refactor — `bids`-rooted scope (buildings/surfaces/line_items), proposals, the
delivery `projects` table, `getBidPageData`, `getBidsWithSummary`, the bid pages,
and `/p/[slug]` all move onto the project spine.

**Option B — Keep `bids` as versioned priced children of a new property-rooted project.**
Introduce a `projects` opportunity spine under property; a project owns the scope;
each `bid` is a priced snapshot of that scope over time; the delivery fields move
onto the project. Lower vocabulary churn for the bid artifact, but adds a layer
(project → bid → proposal) and keeps two lifecycle concepts.

**Recommendation: Option A.** It is simpler at rest (fewer tables, one status
machine), matches how Jordan talks, and the ops layer he values most attaches
cleanly to a single project spine. Phases 1–2 below are **decision-independent**
and should proceed regardless; Phase 3 assumes Option A and notes Option B deltas.

---

## Target object graph (Option A)

```
account            (company; accounts.type = owner | management_company | other)
property  ── ROOT  ("the crop we're harvesting")
  ├─ owner_account_id        → account     (legal owner — the lienable party)
  ├─ management_account_id    → account     (manager)
  ├─ property_parties[]       (property ↔ account/contact + role + is_nto_recipient)
  ├─ property_contacts[]      (existing M:N people ↔ property; role / influence)
  ├─ leads[]                  (top-of-funnel; property_id required going forward)
  └─ projects[]               (scoped opportunities — "blue section", "whole building";
                               many per property, ≤1 proceeds)
        ├─ primary_contact_id → contact
        ├─ lead_id            → lead (originating)
        ├─ SCOPE
        │    ├─ buildings[] → surfaces[]   (surfaces measured in PAINTABLE sqft)
        │    │      └─ buildings.archetype (garden | townhome | mid_rise | high_rise)
        │    ├─ access_items[]              (NEW — lifts / scaffold / swing stage / safety;
        │    │                               sibling to buildings; scales by height/archetype)
        │    └─ line_items[]
        ├─ pricing (snapshot of org rate_config at bid time)
        ├─ proposals[] → proposal_shares[]  (frozen priced snapshot + public /p/[slug])
        ├─ project_updates[]                (delivery feed, public opt-in)
        └─ status: estimating → quoted → won | lost
                   └─ if won → not_started → in_progress → punch_out → complete (+ on_hold, reopen)

contact  ── parallel object ── links to property (property_contacts) AND project (primary_contact_id)

rate_config  (NEW — stored rates the deterministic engine reads; never LLM-invented)
   coverage_sqft_per_gallon · price_per_gallon · labor_rate_per_sqft · default_margin
   access_rates (jsonb): swing_stage / lift / scaffold pricing keyed by archetype
```

What's unchanged conceptually: `accounts`, `properties`, `contacts`,
`property_contacts`, `leads`, `lead_contacts`, `activity_events`, `audit_log`,
`proposals`, `proposal_shares` keep their roles. The structural moves are
(1) property as the explicit root, (2) owner/management/NTO first-class,
(3) scope (incl. new access) under the project, (4) bids→projects collapse,
(5) rates as config.

---

## Phase 1 — Property as root + owner/management/NTO (decision-independent, ship first)

The legally load-bearing, least-arguable part. **NTO (Notice to Owner) is a
lien-rights instrument** — served to the manager instead of the owner, AQP
forfeits the right to lien. So every property must distinguish *who owns*, *who
manages*, and *which contact maps to which*.

### Schema (`drizzle/manual/015_property_root.sql`, additive + backfill)

```sql
-- accounts can be the owner OR the management company OR other
ALTER TABLE accounts ADD COLUMN type text NOT NULL DEFAULT 'management_company';
  -- existing BAAA rows are management companies; safe default

-- properties gain explicit owner vs manager (both nullable FK accounts)
ALTER TABLE properties ADD COLUMN owner_account_id uuid REFERENCES accounts(id);
ALTER TABLE properties ADD COLUMN management_account_id uuid REFERENCES accounts(id);
UPDATE properties SET management_account_id = account_id WHERE account_id IS NOT NULL;

-- richer party mapping incl. the NTO recipient and which contact maps to which
CREATE TABLE property_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  role text NOT NULL,            -- owner | management_company | billing | nto_recipient | other
  is_nto_recipient boolean NOT NULL DEFAULT false,
  -- free-text fallback for a legal owner with no account/contact row
  legal_owner_name text,
  legal_owner_address text,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX property_parties_property_idx ON property_parties (user_id, property_id);
```

Decision note: `property_parties` is recommended over scattering more FK columns
because it captures "who owns / who manages / **which contact maps to which** /
who gets the NTO" in one place. The two scalar FK columns on `properties`
(`owner_account_id` / `management_account_id`) stay as the fast-path for the
common case; `property_parties` covers the legal/NTO detail.

### Store / actions
- `findOrCreateAccount`: accept + set `type`.
- `findOrCreateProperty`: set `management_account_id` (default) and optionally
  `owner_account_id`; keep writing the legacy `account_id` during transition.
- New helpers: `getPropertyParties(propertyId)`, `upsertPropertyParty(...)`,
  `setNtoRecipient(...)`.
- `getPropertyDetail` / `getAccountDetail`: return owner vs management distinctly
  and the NTO recipient.

### UI
- Property detail panel + `/leads/new`: owner vs management company shown as
  distinct fields; an explicit "NTO recipient" marker on the party that should
  receive Notice to Owner. `AccountAutocomplete` filters/labels by `account.type`.

### CSV import
- BAAA rows are management companies → `findOrCreateAccount(type:'management_company')`,
  `properties.management_account_id` set. Owner stays unknown until entered.

---

## Phase 2 — Scope: access dimension, paintable sqft, rate config (decision-independent)

### Access as a sibling to surfaces (`016_scope_access.sql`)

Access (lifts, scaffolding, swing stage, safety) **scales by height/archetype,
not square footage** (swing stage alone ≈ $80k on the Pura Vita seven-story
mid-rise). It must not be folded into surfaces.

```sql
ALTER TABLE buildings ADD COLUMN archetype text;  -- garden|townhome|mid_rise|high_rise|other

CREATE TABLE access_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NOTE: FK target (bid vs project) depends on Phase 3 decision; ships pointing
  -- at the current bids table, repointed to project in Phase 3.
  bid_id uuid NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  building_id uuid REFERENCES buildings(id) ON DELETE SET NULL,  -- optional per-building
  type text NOT NULL,            -- lift | scaffold | swing_stage | safety | other
  method text,                   -- free text (e.g. "swing stage, 7 stories")
  quantity numeric,
  duration_days integer,
  amount numeric,                -- explicit, or computed from rate_config (engine writes)
  rate_derived boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Archetype set gains **`mid_rise`/`high_rise`** alongside garden/townhome (the
seven-story Pura Vita case).

### Paintable square feet
`surfaces.total_sqft` is **treated as paintable sqft** (net paintable area, not
gross footprint). Phase 2 is mostly semantic: document it in
`docs/lead-data-model.md`, relabel the surface UI to "paintable sqft", and keep
any future footprint-derived gross (paused Phase B1) as a separate field so the
two are never conflated. Optional: add `surfaces.measurement_basis` ('paintable')
for forward clarity.

### Rate config — rates as config, never LLM-invented (`017_rate_config.sql`)

```sql
CREATE TABLE rate_config (
  user_id uuid PRIMARY KEY,               -- ownerUserId (org scope), mirrors user_defaults
  coverage_sqft_per_gallon numeric,
  price_per_gallon numeric,
  labor_rate_per_sqft numeric,
  default_margin_percent numeric,
  access_rates jsonb,                     -- { swing_stage: {high_rise: 80000, ...}, lift: {...} }
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO rate_config (user_id, coverage_sqft_per_gallon, price_per_gallon,
                         labor_rate_per_sqft, default_margin_percent, updated_at)
SELECT user_id, coverage_sqft_per_gallon, price_per_gallon, labor_rate_per_unit,
       margin_percent, updated_at
FROM user_defaults
ON CONFLICT (user_id) DO NOTHING;        -- backfill from existing defaults
```

`user_defaults` stays readable during transition; cutover to `rate_config` in the
store, then drop in the Phase 5 cleanup migration.

### Pricing engine (`src/lib/pricing.ts`)
Add an **access cost** term alongside material + labor + line items:
`accessTotal = Σ access_items (explicit amount OR rate_config.access_rates lookup
by type × archetype × quantity)`. Stays pure, deterministic, config-driven, and
**outside any LLM call** — this is the receiving end of the prompt-bidding
boundary (Open-now #2): the model parses an ask into structured inputs; this
engine multiplies them against stored rates.

---

## Phase 3 — Bid → project collapse (DECISION-GATED, Option A)

Highest-risk phase. Additive-first, with destructive drops deferred (matches the
project's "compatibility fields during transition" posture from `013`).

### Migration sketch (`018_project_spine.sql`, additive + backfill)
1. Re-parent scope: add `project_id` to `buildings`, `line_items`, `access_items`,
   `proposals`. Backfill from `bid_id` via the existing 1:1 bid↔project mapping
   (today every project has a unique `bid_id`). Keep `bid_id` columns during
   transition.
2. Promote the project spine: add the bid-side columns the delivery `projects`
   table lacks (`property_id` required, `primary_contact_id`, `lead_id`, `label`,
   `client_name`, pricing fields, satellite/geo) to `projects`; widen `status`
   to the unified lifecycle enum; backfill from the joined `bids` row.
3. Repoint `project_updates` (already on `projects` — unchanged).
4. Code cutover (store/actions/UI) reads the project spine.
5. `019_drop_bids.sql` (destructive, **after** cutover): drop `bids`-rooted FKs
   and the `bids` table; optionally rename retained columns. Sequence the table
   rename carefully — old `projects` delivery columns are already merged, so no
   name collision remains.

**Option B delta:** instead of dropping `bids`, keep it as a priced snapshot with
`bids.project_id`; scope FKs point at `project_id`; `bids` carries only pricing +
status-of-this-version. No `019` drop.

### Store refactor (`src/lib/store.ts`, ~3,465 lines — the bulk of the work)
- `getBidPageData` → `getProjectPageData` (scope now under project).
- `getBidsWithSummary` → property-grouped project summary (the grouped-subquery
  perf pattern from `007_perf_indexes.sql` carries over; re-key aggregates on
  `project_id`).
- `createBid`/`updateBid`/`deleteBid` → `createProject`/`updateProject`/`deleteProject`,
  requiring a `property_id`.
- Merge `getProjectByBidId` / create-on-accept into the spine: acceptance flips
  project status `quoted → won` and stamps acceptance on the same row (no separate
  insert; the `ON CONFLICT` idempotency on accept is no longer needed).
- Keep **every** query scoped by `user.ownerUserId` and preserve the ownership
  guards (`requireBidOwnership` → `requireProjectOwnership`, etc.). This is the
  tenant-safety invariant — do not regress it during the move.
- `getLatestBidForLead` → `getLatestProjectForLead`.

### UI / routes
- `/bids` + `/bids/[id]` → `/projects` + `/projects/[id]` (or keep routes, swap
  data source). `/projects/[id]` already renders the delivery half; extend it to
  the full lifecycle incl. estimating/quoted + scope editing.
- Lead → "create project from lead" handoff (was "create bid from lead").
- `/p/[slug]` reads project + proposal snapshot (snapshot is self-contained, so
  the public page changes least).

---

## Phase 4 — Proposal snapshot + PDF + public page

Extend `ProposalSnapshot` (`src/lib/pdf/types.ts`) and `generateProposalAction`
to embed: the **party block** (owner vs management, NTO recipient), **access
line items**, and **building archetype**. The snapshot stays **frozen at generate
time** (existing invariant) so re-theming/edits never alter a sent proposal. PDF
template (`src/lib/pdf/proposal-template.tsx`) and `/p/[slug]` render the new
sections.

---

## Phase 5 — Docs + cleanup
- Rewrite `docs/lead-data-model.md` and the README data-model section to
  property-rooted (current docs say "one bid per property"; that becomes "many
  projects per property, ≤1 proceeds").
- Flip `docs/plan.md` → *Open now* #1 to shipped; move the *Property-rooted
  re-model* block to *Shipped*.
- Run `019_drop_bids.sql` destructive cleanup once no code path reads the old
  columns/tables. Verify per AGENTS.md DoD: `bunx tsc --noEmit`, `bun run lint`,
  `bun run build`.

---

## Risks & notes
- **Tenant scoping is the invariant.** The biggest correctness risk in the
  store refactor is dropping an `ownerUserId` filter or ownership guard while
  moving queries onto the project spine. Diff every `where(eq(*.userId, ...))`.
- **Two status machines merging** (bid draft/sent/won/lost + project
  not_started/.../complete) into one lifecycle enum — write the allowed-transition
  table explicitly (mirror `allowedProjectStatusTransitions`).
- **Proposal snapshots are immutable** — never backfill old snapshots with new
  fields; only new proposals carry the party/access/archetype block.
- **Additive-first migrations** per AGENTS.md; destructive drops only after code
  cutover, in their own migration.
- **Multi-tenancy:** existing `org_memberships`/`ownerUserId` scoping stays as-is
  (AQP decision says don't invest further, not rip out). Keep using `ownerUserId`.
- **Phase ordering:** 1 → 2 ship value immediately and are reversible/low-risk;
  do not start Phase 3 until the bid↔project decision is signed off.
```
