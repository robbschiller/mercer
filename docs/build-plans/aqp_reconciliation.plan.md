# Build plan — AQP Operating System → Mercer reconciliation

**Status:** Blueprint (captured 2026-06-09). Drives the next several phases.
**Source:** AQP "Operating System" alpha handoff (first customer, Austin/Affordable Quality Painting): `AQP-Operating-System-Summary.pdf`, `SCHEMA.md` (18 entities + DDL), `aqp-alpha.html` (8 screens). `BUILD_MAP.md` not yet shared.
**Relates to:** [[data-model-and-entry-points]], the property-rooted re-model (`docs/plan.md`), [`docs/build-plans/conversation_tab.plan.md`].

## Framing

AQP's spec independently lands on **Mercer's existing thesis** — property is the durable root; lead → takeoff → proposal → job; token customer portal. Mercer already has the **front half**. This doc reconciles AQP's 18-entity model + 8 screens against Mercer's current schema and sequences the gap.

**Mercer is the product; AQP is the first customer.** AQP's spec is single-tenant with hardcoded constants. Mercer is already org-scoped (`userId`/`ownerUserId`, `org_memberships`), so the rule is: **anything AQP hardcodes becomes per-org config, never a constant in code** (see §Config-per-org).

## Architecture decision — Model A (DECIDED 2026-06-09)

AQP separates **Takeoff → Proposal → Job** as distinct entities; a Job carries an **immutable `contract_value`** that all profitability derives from. Mercer collapsed takeoff into `bids` and project into the bid's delivery facet (the bid row IS the project; the `projects` table was dropped in `020`).

**Decision: keep Mercer's collapsed spine (A).** Do **not** reintroduce a separate `jobs` table.
- Add an immutable **`contractValue`** snapshot column to `bids`, stamped at acceptance (the profitability baseline; never recomputed).
- The money layer (`expenses`, `invoices`, `change_orders`) attaches to `bids` via `bidId`, scoped by `userId` like every other table.
- Rationale: far less churn, the bid spine already carries delivery state, and the only true requirement from AQP's `jobs.contract_value` is a single immutable snapshot field — not a whole entity. (Model B — split a real `jobs` entity — was rejected; revisit only if jobs diverge hard from bids.)

## Entity reconciliation (AQP 18 → Mercer)

### ✅ Exists (keep; minor field adds)
| AQP entity | Mercer | Notes / field deltas |
|---|---|---|
| `companies` (mgmt/owner, unified by `type`) | `accounts` (`type`: management_company/owner/other) | Near-identical. Add `internal_rep_id` (see rep inheritance). |
| `properties` | `properties` | Add `units`, `property_type`, `year_built`. Mercer richer on geo (lat/lng, placeId). |
| `contacts` | `contacts` | Keep; employment moves to a dated table (below). |
| `proposals` | `proposals` + `proposal_shares` | Add `number`, `addons`, `revision_of`, `customer_questions`; share state already split into `proposal_shares`. |
| `reports` | `project_updates` | Extend: `title`, `status` (draft/shared/archived), `photo_ids[]`, `viewed_at[]`. Already append-only + `visible_on_public_url`. |

### 🔧 Refine (exists but shape differs)
| AQP entity/field | Mercer today | Change |
|---|---|---|
| `property_mgmt` / `property_owner` (**dated** tables, start/end) | current-state FKs (`management_account_id`/`owner_account_id`, `property_parties`) — the anti-pattern AQP principle #2 warns against | Add dated relationship tables (or `valid_from`/`valid_to` on `property_parties`) + partial-unique "one current" index. Keep current-state FKs as a derived convenience. |
| `contact_employment` (**dated**) | single `contacts.account_id` | New dated table; `account_id` becomes "current employer" derived view. |
| `leads` extras | `leads` (status: new/quoted/won/lost) | Add **`is_large_job`** (the fork driver), `scope_category[]`, `est_value`, richer status enum (needs_takeoff → takeoff_scheduled → quote_sent → approved/denied/no_response/on_hold/expired), `internal_rep_id` (inherited from mgmt co). |
| `takeoffs` | `bids` + `buildings`/`surfaces`/`line_items`/`access_items` + `rate_config` | Large takeoff already modeled. Add `confidence`, `admin_pct`/`commission_pct` (per-org defaults), optional versioning. Small-job (catalog) path is net-new (below). |
| `jobs` | bid delivery facet | Per Model A: add `contract_value` (immutable snapshot). Add schedule progress where missing: `weeks_total`/`current_week`, `days_total`/`current_day`, `buildings_done`/`buildings_total`, sub-team-as-account, `warranty_watch` status. |
| `users` roles | owner/admin/member (`org_memberships`) | Add operational roles (rep/estimator/pm/ops) as needed for assignment + rep inheritance. |

### 🆕 Net-new (the actual build)
| AQP entity | Purpose | Mercer plan |
|---|---|---|
| `expenses` | dated spend by category | New `expenses` (bidId, userId, date, payment_type, vendor, category, amount, tax, receipt_url…). **Derived** budget/burn/profit — never stored (AQP principle #5). |
| `invoices` | draws (large) / deposit+final (small) | New `invoices` (bidId, type, sequence, amount, status, trigger, dates…). |
| `change_orders` | scope adds during a job | New `change_orders` (bidId, amount ±, reason, status, approval…). |
| `price_list_items` | SKU service catalog → **small-job** takeoff | New **org-scoped config** table. |
| `supplier_products` | paint/material pricing → auto-materials (Sherwin-Williams) | New **org-scoped config** table; extends the `rate_config` philosophy. |
| `photos` | polymorphic photo archive (intake/takeoff/progress/completion/damage) | New `photos` table (context_type + context_id), Supabase Storage (the `brand-assets`/proposal-PDF pattern already exists). EXIF preserved. |

## Screen reconciliation (AQP 8 → Mercer routes)
| AQP screen | Mercer | Gap |
|---|---|---|
| Pipeline dashboard | `/dashboard` | Mercer's is action-first composer; reconcile with AQP's pipeline metrics (the metric view can live below the composer). |
| New lead intake | `/leads/new` + dashboard create-lead | Add `is_large_job`, scope tags, est_value, rep inheritance. |
| Takeoff queue | — | **New** `/takeoff-queue` (or a `/leads` filter): leads in needs_takeoff/scheduled/in_progress. |
| Takeoff form (large) | `/bids/[id]` | Exists. Add confidence/admin/commission. |
| Takeoff form (small) | — | **New** catalog/SKU form driven by `price_list_items`. |
| Customer portal | `/p/[slug]` | Exists ✓. Add addons/revisions/questions to match. |
| Jobs list | `/projects` | Exists ✓. |
| Job page (large/small) | `/projects/[id]` | **Money UI net-new**: expense ledger, budget-by-category, draws/invoices, change orders, weeks×buildings (large) / 6-day strip (small) schedule, burn-rate alert. |
| Properties | property detail routes | Add a `/properties` list + units/type/year + dated owner/mgmt history timeline. |

## Config-per-org (multi-tenant generalization)
Everything AQP hardcodes becomes per-org config (extend `rate_config`/`user_defaults`): the **2-week large/small threshold**, **admin % (25/30)** and **commission % (4)**, the **15 expense categories** (+ the 3 small-job categories — and resolve AQP open-question #1: unify the vocabularies), **payment types**, **lead sources**, the **SKU price list**, and the **supplier price list**. None of the model resists multi-tenancy.

## Phased sequence
1. **Money layer (Phase 5 equivalent — highest value, biggest gap).** `bids.contract_value` snapshot at acceptance → `expenses` + budget-by-category + derived burn/profitability → `invoices`/draws → `change_orders`. Job-page money UI. Visual language: cream + deep-blue, restrained pills (matches Mercer + AQP).
2. **Temporal refinements** (fold in alongside — same property/job core): dated `property_mgmt`/`property_owner` + `contact_employment`; `leads.is_large_job` + richer status enum + rep inheritance.
3. **Small-job track** (parallel): `price_list_items` + `supplier_products` config → small takeoff form → `is_large_job` fork in takeoff/job UI.
4. **Photos**, richer **reports**, **analytics** (win rate, margin, vendor, forecast — derived; AQP §5).

## Open decisions (from SCHEMA §9 + pending `BUILD_MAP.md`)
- Unified expense-category vocabulary (15 large vs 3 small) — decide before the money layer ships.
- Soft-delete (`deleted_at`) on financial entities (expenses/invoices) — AQP recommends; Mercer has `audit_log` already.
- Photo storage/CDN/thumbnail pipeline.
- Accounting push (QuickBooks, one-way) — later integration.
- Need `BUILD_MAP.md` for AQP's own phasing + owner-decision list.
