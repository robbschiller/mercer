# Property-rooted data model

Mercer's object graph is rooted at the **property** — the physical asset
("the crop we're harvesting" in Jordan's words). Leads, projects, and parties
all hang off a property; contacts are a parallel object that links to both
property and project. This replaces the earlier lead/bid-rooted shape (one bid
per property) — a property can now carry many projects, of which ≤1 actually
proceeds (Pura Vita: a blue-section bid and a whole-building bid are two
projects on one property; only one will happen).

See [`docs/build-plans/property_rooted_remodel.plan.md`](build-plans/property_rooted_remodel.plan.md)
for the migration sequence (Phases 1–5) and the rationale.

## Object graph

```
account            (company; accounts.type = owner | management_company | other)
property  ── ROOT
  ├─ owner_account_id        → account     (legal owner — the lienable party)
  ├─ management_account_id   → account     (manager)
  ├─ property_parties[]      (property ↔ account/contact + role + is_nto_recipient,
  │                           plus free-text legal_owner_name/address fallback)
  ├─ property_contacts[]     (M:N people ↔ property; role / influence)
  ├─ leads[]                 (top-of-funnel; one per pursuit)
  └─ projects[]              (scoped opportunities — many per property, ≤1 proceeds;
                              implemented on the `bids` table — see note below)
        ├─ primary_contact_id → contact
        ├─ lead_id            → lead (originating)
        ├─ SCOPE
        │    ├─ buildings[] → surfaces[]   (surfaces measured in PAINTABLE sqft)
        │    │      └─ buildings.archetype (garden | townhome | mid_rise | high_rise | other)
        │    ├─ access_items[]              (lifts / scaffold / swing stage / safety;
        │    │                               sibling to buildings; scales by height/archetype)
        │    └─ line_items[]
        ├─ pricing (stored config the deterministic engine reads)
        ├─ proposals[] → proposal_shares[]  (frozen priced snapshot + public /p/[slug])
        ├─ project_updates[]                (delivery feed, public opt-in)
        └─ status: estimating → quoted → won | lost
                   └─ if won → not_started → in_progress → punch_out → complete (+ on_hold, reopen)

contact  ── parallel object ── links to property (property_contacts)
                                 AND project (primary_contact_id, lead_contacts)

rate_config  (stored rates the deterministic pricing engine reads — never LLM-invented)
   coverage_sqft_per_gallon · price_per_gallon · labor_rate_per_sqft · default_margin_percent
   access_rates (jsonb): swing_stage / lift / scaffold pricing keyed by archetype
```

## Note on the `bids` table

Phase 3 of the remodel collapsed the separate `projects` delivery table into
the `bids` row: the bid row **is** the project, carrying both the opportunity
lifecycle (`status`: draft → sent → won/lost) and the delivery lifecycle
(`delivery_status`: not_started → in_progress → punch_out → complete). A
cosmetic table rename was intentionally skipped (high churn, low value), so
the table is still named `bids` in schema and SQL. New code uses
`getProjectByBidId` / the `ProjectView` mapper to talk to it as a project.

## Core entities

- `accounts` — companies. `accounts.type` is `owner` | `management_company` | `other` and drives NTO routing.
- `properties` — physical assets with address, geocoding, satellite, and explicit `owner_account_id` / `management_account_id` (plus a legacy `account_id` retained as a compatibility field).
- `property_parties` — owner / management / billing / nto_recipient / other roles per property. Two roles are wired into the app today: the `owner` row carries the **owner contact** (the contact at the property who represents the owner — set at the lead/property layer), and the `nto_recipient` row carries the legal owner free-text (`legal_owner_name` / `legal_owner_address`) plus the contact NTO is served to. `is_nto_recipient` (partial-unique, one per property) flags the NTO row. Split this way because Notice to Owner is a project-pre-start concern (captured on `/projects/[id]`), while owner-contact is a sales concern (captured on the property card).
- `contacts` — people with name, email, phone, title, source, optional relationship tier.
- `property_contacts` — M:N contact ↔ property with role, decision influence, source, provenance, active state.
- `leads` — top-of-funnel pursuits; `property_id` links to the property, with compatibility flat fields retained during the no-address pool transition.
- `lead_contacts` — contacts involved in a specific opportunity, including the primary contact.
- `bids` (== projects) — scoped opportunities under a property. Carries scope (via FKs from `buildings` / `line_items` / `access_items` / `proposals`), pricing snapshot fields, status (draft → sent → won/lost), and post-acceptance delivery fields (`delivery_status`, target/actual dates, assigned_sub, crew_lead, accepted_*, delivery_notes).
- `buildings` — children of a bid. `archetype` (`garden` | `townhome` | `mid_rise` | `high_rise` | `other`) drives access scaling.
- `surfaces` — children of a building. `total_sqft` is **paintable** square feet, not gross footprint.
- `access_items` — sibling scope dimension to buildings: how crews reach surfaces (`lift` | `scaffold` | `swing_stage` | `safety` | `other`). Cost scales by height/archetype, not sqft; `amount` is explicit (or computed from `rate_config.access_rates` once auto-derivation lands).
- `line_items` — bid line items (pressure washing, dumpster, etc.).
- `rate_config` — stored rates (keyed by `ownerUserId`): scalar paint rates mirror `user_defaults` plus `access_rates` jsonb for per-archetype access pricing. The deterministic pricing engine reads these; rates are config, never values the model invents.
- `proposals` / `proposal_shares` — frozen priced snapshot + public `/p/[slug]` share. Snapshot includes a party block (management / legal owner / owner address / NTO recipient), access items, and per-building archetype as of generate time.
- `project_updates` — delivery feed; `bid_id` is the project identity. Per-entry `visible_on_public_url` opt-in.

## Tenant scoping

Every tenant-scoped query is keyed on `ownerUserId` (resolved by `getOrgContext`).
Existing `user_id` columns semantically hold the org owner's id; members share
the owner's bids/leads/projects via `org_memberships`. Do not regress this guard
when refactoring data access — it is the multi-tenant safety invariant.

## Activity and audit

Sales history and operational notes live in `activity_events`. The default
attachment is `lead_id`, with optional links to contact, property, account, or
bid.

Structured data changes live in `audit_log`. Core create/update paths write the
entity type, entity id, action, changed fields, previous values, new values,
actor, source, and timestamp. `setPropertyOwnership` writes an audit entry on
every owner/NTO edit.

## Product rules

- The **property is the root**; everything else hangs off it.
- A property has one legal owner and (usually) one management company, distinguishable as separate accounts.
- At the lead/property layer, ownership = "which contact at this property is the owner-rep." Nothing more. Captured via the slim Ownership card on the property detail page.
- At the project pre-start checklist (`/projects/[id]` while `delivery_status='not_started'`), capture the legal owner name + mailing address + NTO recipient contact. The `not_started → in_progress` transition is gated on all three being set, client-side and server-side. NTO is a lien-rights instrument; serving the manager or starting work without one on file forfeits lien rights.
- A property has exactly one NTO recipient (the partial-unique `is_nto_recipient` index enforces this).
- A property has many leads over time and many projects; **≤1 project proceeds** to delivery.
- A property has many contacts; a contact links to many properties.
- A project (`bid`) must point at one property; scope (buildings/surfaces/access/line items) lives **inside** the project, not on the property.
- Surface measure is **paintable square feet**, not gross footprint.
- Access (lifts / scaffold / swing stage / safety) is a sibling scope dimension to surfaces — never folded into sqft.
- Rates live in `rate_config` (or `user_defaults` during transition). The deterministic engine multiplies inputs against stored rates; the LLM parses asks into inputs but never invents a rate.
- Important contacts surface from portfolio breadth plus optional manual relationship tier.

## Migration history

- `013_lead_domain_model.sql` — initial additive normalization (accounts, properties, contacts, property_contacts, lead_contacts, activity_events, audit_log).
- `015_property_root.sql` — `accounts.type`, `properties.owner_account_id` / `management_account_id`, `property_parties` table, backfilled `management_account_id = account_id`.
- `016_scope_access.sql` — `access_items` table + `buildings.archetype`.
- `017_rate_config.sql` — `rate_config` keyed by `ownerUserId`, backfilled from `user_defaults`.
- `018_project_spine.sql` — folded the separate `projects` delivery fields onto the bid row.
- `019` — `project_updates.project_id` made nullable during cutover to `bid_id`.
- `020_drop_projects.sql` (destructive) — dropped `project_updates.project_id` and the `projects` table; set `project_updates.bid_id` NOT NULL.
