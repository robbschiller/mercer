# Worklog

Running log of in-flight work on the lead-to-close MVP (docs/plan.md). Chronological, newest at top. For per-feature detail, see `docs/build-plans/`.

---

## 2026-04-20 — Phase F seed script + portfolio count per management company

**Goal:** Knock out two items off `docs/plan.md` → *Open now*: the last non-human Phase F polish item (a clean sample import Jordan's demo account can start from) and the first uncommitted direction in the *Enrichment rethink* backlog (surface a per-management-company portfolio signal on top of the already-shipped office grouping). Both sit on the existing schema — no migration needed.

### Shipped

#### Seed sample import (Phase F)

- **Curated fixture** ([scripts/fixtures/jordan-demo.csv](../scripts/fixtures/jordan-demo.csv)) — 32-row BAAA 2026 subset. Column shape mirrors the live BAAA CSV exactly (`First Name,Last Name,Property/Company,Role with Company,Email,Address,Address #2,City,State,Zip,Management Company`) so it flows through the existing [src/lib/leads/csv.ts](../src/lib/leads/csv.ts) auto-mapper the same way the full list does. Hand-picked to demo well: 6 management companies (Greystar, Highmark Residential, Asset Living, The Bainbridge Companies, RangeWater Real Estate, ZRS Management), varied office cities per company (Greystar alone spans Clearwater / Tampa / Pinellas Park / Winter Park / Sarasota), and role diversity (Community Manager, Regional Manager, Maintenance Supervisor, Assistant Manager, Leasing Manager, Maintenance Technician) so office grouping, role-weighted ranking, and the new portfolio-count line all render with non-trivial values.
- **Seed script** ([scripts/seed-jordan-leads.ts](../scripts/seed-jordan-leads.ts)) — `bun run seed:jordan --user-id=<uuid> [--csv=<path>] [--source=<tag>]`. Imports the CSV directly through Drizzle against `DATABASE_URL`, bypassing the app's `requireUser` session layer. Reuses `parseCsv` + `autoMapColumns` + `mapRowsToLeads` from the production import path so the seed is guaranteed to produce the same `rawRow` shape the UI reads later. Idempotent via source-tag check: re-running with the same `--source` is a no-op (prints a notice, exits 0). Enrichment is **deliberately not run** from the seed — keeps the script independent of Google Places / API-key / referrer restrictions, and Jordan (or a manual run) can trigger per-lead enrichment through the UI after logging in.
- **package.json** — added `"seed:jordan": "bun run scripts/seed-jordan-leads.ts"` alongside the existing `db:*` scripts.
- **Out of scope / deliberate:** no seeded bids, proposals, or projects. The demo flow from lead → bid → proposal → accept is fast enough to run live during the walkthrough, and pre-seeding it would lock in a specific storyline. The seed gets Jordan to "here are 32 enriched-ready attendees across 6 management companies"; the live demo handles everything downstream.

#### Portfolio count per management company

- **Shared helpers module** ([src/lib/leads/office.ts](../src/lib/leads/office.ts)) — extracted `leadCity`, `leadRole`, `rolePriority`, `officeKeyFor`, `officeLabel` out of the leads list page (they were inline). Same behavior; the leads list page now imports them instead of defining them locally. The extraction lets the lead detail page reuse exactly the same `leadCity` semantics the list uses for grouping, so the portfolio count is consistent between the two surfaces.
- **`computeCompanyPortfolios(leads) → Map<company, {offices, properties, leads}>`** (same module) — rolls a lead set up by lowercased company name, counting distinct cities (offices), distinct property names, and total attendees. Display casing is recovered from the first lead seen so "Greystar" doesn't turn into "greystar" in the UI. A `portfolioFor(map, company)` helper handles the null/whitespace edge cases so callers don't have to.
- **Group header signal** ([src/app/(app)/leads/page.tsx](<../src/app/(app)/leads/page.tsx>)) — the office group cards in the grouped view now render, next to the attendee count, a line like "· 5 offices · 7 properties in Greystar". Only appears when the company has >1 office or >1 property, so single-office cases stay quiet. **Portfolio stats are computed over the full pre-filter `leads` array** — the signal intentionally stays stable as Jordan filters by status or source (a management company doesn't shrink just because he's looking at only "new" leads).
- **Lead detail header** ([src/app/(app)/leads/[id]/page.tsx](<../src/app/(app)/leads/[id]/page.tsx>)) — added a small Building2-iconed line below the company/property subtitle: "Greystar: 5 offices · 7 properties · 10 attendees in your imports". Uses a new store helper `getLeadsByCompany(company)` ([src/lib/store.ts](../src/lib/store.ts)) — user-scoped SQL `lower(trim(company)) = lower($1)` match — so the detail page only pulls the company's leads, not the full table. Same visibility gate as the header (no render if the company only has a single office/property/attendee).

### Verification

- `bun install` ran to refresh deps (new worktree); `bunx tsc --noEmit` — clean.
- `bun run build` — green; route table unchanged. All existing routes (`/leads`, `/leads/[id]`, `/p/[slug]`, etc.) render.
- Lint on touched files only (`bunx eslint src/lib/leads/office.ts src/app/\(app\)/leads/page.tsx src/app/\(app\)/leads/\[id\]/page.tsx src/lib/store.ts scripts/seed-jordan-leads.ts`) — no output (clean). The repo-wide `bun run lint` picks up `.claude/worktrees/` with its own `node_modules`, which is unrelated noise and was there before this PR.
- Did not run the seed against a live DB in this session — the script guards on valid UUID and on DATABASE_URL presence, and the insert path shares code with the production importer, so a dry-run would only prove Drizzle is wired up.

### Deliberately out of scope

- **Demo video.** Still open on the plan — human task. Script and seeded data are ready for a live walkthrough.
- **Seeded bids / proposals / projects.** See above — pre-baking the downstream flow locks in a storyline we'd rather demo live.
- **Per-office qualification brief** (PRD §10 Q6 / Milestone 3). Still on the *Enrichment rethink* backlog, gated on the vision-model + evals decisions.
- **Multi-tenant portfolio rollup across all users** (e.g. "Greystar is the most-attended management company across the Mercer install base"). Doesn't belong to any current milestone.

### Next

Backup demo video is the last Phase F checkbox (human). After that, the next open direction in *Enrichment rethink* is the per-office qualification brief — but that's real Milestone 3 territory (qualification agent), so it should wait on the §10 decisions. For now the Phase 1 stack plus the portfolio signal is a complete enough demo surface.

---

## 2026-04-19 — Brand consistency pass: auth pages adopt the marketing surface, light brand accents in the app

**Goal:** Make the product and the marketing site read as one continuous brand. Auth pages get the full marketing treatment (texture + Mercer wordmark linking home) so first impression stays unbroken from `/` → `/signup`. Inside the app, a light touch only — Fraunces editorial display on page titles and amber on the most-primary CTA per surface — so the operator UI doesn't get cosmetically loud at the expense of dense data legibility.

### Shipped

#### Font lifting (Fraunces global)

- **Root layout** ([src/app/layout.tsx](../src/app/layout.tsx)) — moved the `Fraunces` font loader (with the same `axes: ["SOFT", "WONK", "opsz"]` variable axes used on the landing page) up from the marketing-only layout so `--font-fraunces` is now defined for every route. `display: "swap"` keeps it non-blocking, and Fraunces is only fetched when something actually opts into `font-display` / `.font-display-editorial`, so app routes that don't use it still won't pay for the file.
- **Marketing layout** ([src/app/(marketing)/layout.tsx](<../src/app/(marketing)/layout.tsx>)) — dropped its local Fraunces import and the wrapping `${fraunces.variable}` div now that the variable is set at the root.

#### `(auth)` route group + theme-aware shell

- **Route group** — moved `src/app/login/` and `src/app/signup/` into `src/app/(auth)/login/` and `src/app/(auth)/signup/` (`loading.tsx` carried along with each). URLs are unchanged; `/login` and `/signup` still resolve.
- **Layout** ([src/app/(auth)/layout.tsx](<../src/app/(auth)/layout.tsx>)) — three-layer textured shell that mirrors the landing-page hero: blueprint grid, soft amber/blueprint vignette, fractal-noise overlay. The whole surface is theme-aware off the existing `.dark` class — `bg-[var(--color-parchment)] dark:bg-[var(--color-ink)]` for the canvas and `bg-grid-parchment dark:bg-grid-ink` for the grid — so the palette follows the global theme toggle instead of being a fixed dark island. Header carries the Mercer wordmark in `font-display`, with `aria-label="Mercer, home"` and `href="/"` so the post-marketing flow can always retreat back to the public site.
- **Auth pages restyled** ([src/app/(auth)/login/page.tsx](<../src/app/(auth)/login/page.tsx>), [src/app/(auth)/signup/page.tsx](<../src/app/(auth)/signup/page.tsx>)) — same cards, but reading on the textured background: `bg-[var(--color-parchment-soft)]/85` with backdrop blur in light mode, `bg-white/5` translucent panel in dark mode. Each card opens with a `kicker` label in amber (`§ sign in` / `§ create account`), a Fraunces title (`Welcome back` / `Start your account`), and the submit button uses the new `amber` button variant. Forms, error/message handling, and the login ⇄ signup cross-link are otherwise unchanged.
- **Loading skeleton** ([src/components/page-loading.tsx](../src/components/page-loading.tsx)) — `AuthPageSkeleton` rewritten to render only a card-shaped skeleton (no outer `container`, no separate title placeholder) since the auth layout supplies all the page chrome now. Uses the same translucent / parchment-soft surface so the load state matches the loaded state.

#### Amber primary-CTA variant

- **Button variant** ([src/components/ui/button.tsx](../src/components/ui/button.tsx)) — added an `amber` variant: `bg-[var(--color-amber)]` with white text, the same amber glow shadow used on the marketing hero CTA, and a 1px lift on hover into `--color-amber-soft`. Opt-in only — `default` is unchanged so existing buttons stay neutral.
- **Selective rollout** — applied to one button per primary surface so the accent reads as "this is the do-the-thing action," not as a paint job:
  - `/leads` New lead ([src/app/(app)/leads/page.tsx](<../src/app/(app)/leads/page.tsx>))
  - `/bids` New bid ([src/app/(app)/bids/page.tsx](<../src/app/(app)/bids/page.tsx>))
  - `/leads/[id]` Create bid from lead ([src/app/(app)/leads/[id]/page.tsx](<../src/app/(app)/leads/[id]/page.tsx>))
  - Bid detail Generate Proposal ([src/components/proposal-list.tsx](../src/components/proposal-list.tsx)) — the actual "produce the deliverable" action on the bid page.
  - Auth submit buttons (above).
- **Dashboard** has no single primary CTA on the page itself (the three "View leads / View bids / View projects" buttons are equivalent secondary navigation), so it gets no amber accent — leaving it neutral keeps the per-page rule honest.

#### Fraunces page titles

- Swapped `text-2xl font-bold` → `font-display text-3xl font-medium tracking-tight` on every app `<h1>`: dashboard, leads list, lead detail, bids list, projects list, project detail. Editorial display + slightly larger size + tighter tracking, no other layout change.
- **Mobile sidebar header** ([src/app/(app)/layout.tsx](<../src/app/(app)/layout.tsx>)) — the small "Mercer" wordmark in the mobile-only top bar now also uses `font-display`, so it matches the marketing/auth wordmark across every surface a logged-in user can see.

### Verification

- `bun run lint` — 0 errors, 6 pre-existing warnings (unchanged).
- `bun run build` — clean. `/login` and `/signup` resolve through the new `(auth)` route group; the route table shows them at the same URLs as before.
- Manual smoke: auth pages render the grid + vignette + noise textures, parchment in light mode and ink in dark mode, with the Mercer wordmark linking back to `/`. App pages render unchanged except for the headline font and one amber CTA each.

### Deliberately out of scope

- No re-skin of the app shell (sidebar, cards, table chrome stay neutral). User picked "light accents" — anything heavier turns the operator UI into a marketing surface, which would hurt the dense-data flows.
- No changes to the public `/p/[slug]` proposal/status page. It's a customer-facing surface with its own constraints (read by property managers who haven't met the brand) and warrants a separate decision.
- `Button`'s `default` variant still resolves to `--color-primary`; the amber treatment is opt-in per CTA. Avoids a global recolor that would muddy the meaning of the accent.
- `docs/plan.md` not updated — this isn't a tracked roadmap item; it's UX polish layered onto already-shipped surfaces.

---

## 2026-04-19 — Project layer Slice 3: project_updates feed + public status-page pivot, /projects list, complete reopen

**Goal:** Close out the Phase 1 project layer. Slice 3 adds the append-only `project_updates` feed and the public status-page pivot at `/p/[slug]` post-acceptance, which is what closes the loop with the property manager (PRD §3 — they're the load-bearing customer-of-the-customer). Two scope adds on the same PR: a `/projects` list view (so the contractor has a global view of in-flight work without nav-spelunking through bid pages) and an explicit `complete → punch_out / in_progress` reopen path on the state machine (so wrapping a project isn't accidentally one-way).

### Shipped

#### Reopen from `complete` (PRD §5.5 update)

- **State-machine table** ([src/lib/store.ts](../src/lib/store.ts)) — `PROJECT_STATUS_TRANSITIONS.complete` flips from `[]` to `["punch_out", "in_progress"]`. `updateProjectStatus` now clears `actual_end_date` whenever the source state is `complete` and the destination differs, so the next entry into `complete` re-stamps it. `actual_start_date` is preserved through the reopen — the project hasn't suddenly "un-started." The two new transitions render as **Reopen to punch out** / **Reopen to in progress** on the project detail page so the action is unambiguous.
- **PRD updated** ([docs/prd.md](../docs/prd.md) §5.5) — state-machine diagram and `complete` bullet rewritten to describe the explicit reopen, the `actual_end_date` clear-on-reopen behavior, and the `actual_start_date` preservation. Removed the prior "terminal in Phase 1" framing — the reopen is small and natural enough that hiding it behind a Phase 2 milestone wasn't worth it.

#### `/projects` list view

- **`getProjects()`** ([src/lib/store.ts](../src/lib/store.ts)) — single user-scoped query joining `projects` + `bids`, ordered by `projects.updated_at DESC` (uses the `projects_user_id_updated_at_idx` composite index added in Slice 1).
- **List page** ([src/app/(app)/projects/page.tsx](<../src/app/(app)/projects/page.tsx>)) — RSC. Status pill filters across the top (`?status=...`) with per-status counts, then a 2-up grid of project cards: property name + client, status badge, target start / target end / assigned sub / last-updated. Cards link to `/projects/[id]`. Empty state distinguishes "no projects exist yet" from "no projects in this filter."
- **Sidebar nav** ([src/components/app-sidebar-nav.tsx](../src/components/app-sidebar-nav.tsx)) — added `Projects` entry with `HardHat` icon between `Bids` and `Settings`. Active-route highlighting works for both `/projects` and `/projects/[id]`.

#### `project_updates` table + feed UI

- **Schema** ([src/db/schema.ts](../src/db/schema.ts)) — `project_updates` table: `id`, `project_id` (FK with `ON DELETE CASCADE`), `author_type` enum (`human | crew_auto | agent`, default `human` — the latter two are reserved for future agent-authored updates), `author_name`, `body`, `attachments_ref` (jsonb, unused in Phase 1 but reserved per PRD §6.3.1), `visible_on_public_url` (bool, **default false**), `created_at`. The default-false visibility is deliberate: internal-by-default is the safer slip path for a contractor who forgets to think about the property manager on every entry. New `PROJECT_UPDATE_AUTHOR_TYPES` const in [src/lib/status-meta.ts](../src/lib/status-meta.ts) so DB / TS / future UI can't drift.
- **Migration** ([drizzle/manual/009_project_updates.sql](../drizzle/manual/009_project_updates.sql)) — additive table create + two indexes: `(project_id, created_at DESC)` for the detail-page feed, plus a **partial index** on `(project_id, created_at DESC) WHERE visible_on_public_url = true` so the public status-page read stays narrow even as private updates pile up. Applied to dev Supabase; verified columns + both indexes.
- **Store helpers** ([src/lib/store.ts](../src/lib/store.ts)) — `getProjectUpdates(projectId)` (caller is responsible for ownership; the project-detail page calls `getProject` first), `createProjectUpdate(projectId, { body, visibleOnPublicUrl })` (re-checks ownership inline, defaults `author_type = 'human'` and `author_name = user.email`, and bumps `projects.updated_at` so the list view's recency ordering reflects update activity).
- **Validation** ([src/lib/validations.ts](../src/lib/validations.ts)) — `createProjectUpdateSchema` with a body length floor of 1 / cap of 4000, plus a small `formCheckbox` preprocessor (HTML checkboxes only show up in FormData when checked, so missing-or-empty → false; "on" / "true" / "1" / `true` → true).
- **Action** ([src/lib/actions.ts](../src/lib/actions.ts)) — `createProjectUpdateAction(formData)`. Verifies the project belongs to the caller, then posts the update and revalidates `/projects/[id]`, `/projects`, the parent `/bids/[id]`, *and* every `/p/[slug]` for shares tied to that bid (via the new `getShareSlugsForBid()` helper). The same fan-out wraps `updateProjectStatusAction` and `updateProjectDetailsAction` now too — anything that changes data the public status page renders also kicks the public route.
- **Detail-page UI** ([src/app/(app)/projects/[id]/page.tsx](<../src/app/(app)/projects/[id]/page.tsx>)) — new "Project updates" card below the details form. Compose form (textarea + "Visible to property manager" checkbox + submit) sits at the top; below it, an ordered list of existing updates with author, timestamp, and an outline `Visible publicly` badge vs muted `Internal` text so the contractor can tell at a glance which entries the property manager will see.

#### `/p/[slug]` post-acceptance pivot

- **Public view DTO** ([src/lib/store.ts](../src/lib/store.ts) `getPublicProjectByBidId`) — explicit slim shape (`PublicProjectView`) with only the fields safe to render publicly (status, target/actual dates, sub, crew lead, acceptance provenance, and the public updates). Fetched in two cheap queries — the project row by `bid_id`, then the public updates filtered by `visible_on_public_url = true` (uses the partial index).
- **Pivot logic** ([src/app/p/[slug]/page.tsx](<../src/app/p/[slug]/page.tsx>)) — same route, two render branches. Pre-acceptance (no project exists, or share is unaccepted) renders the existing proposal-acceptance view unchanged. Post-acceptance (`share.acceptedAt` set *and* a project exists) renders the new `StatusPage` component. Falling back to the proposal view when no project exists keeps backward compatibility with any historical accepted shares from before Slice 1.
- **Status page** (same file, `StatusPage` component) — header with status badge, then four cards: **Schedule** (target start / target end / actual start / actual end), **On site** (sub + crew lead, only rendered if either is present so we don't show empty state to the customer), **Updates** (just the `visible_on_public_url = true` rows, newest first, with timestamp + author), and a final **Original proposal** card (client, bid status, accepted-by line, contract value). The contract value is read straight from the frozen `ProposalSnapshot.grandTotal` — no recomputation, per PRD §6 ("contract-value numerics are never generated").

### Out of scope (deliberate)

- **No edit / delete on project updates.** Append-only by design — the feed is part of the property-manager-facing audit trail. Typo? Post a corrective update.
- **No agent-authored updates yet.** `author_type` enum has `crew_auto` and `agent` reserved for the eventual ops-layer agents (M5: expense reconciliation, status-page narrative generation, change-order ingest), but Phase 1 only writes `human`.
- **No attachments / photos.** `attachments_ref` (jsonb) is in the schema so we don't migrate it back in later, but no UI for it. Photos in proposals / updates is its own multi-day chunk (deferred per `docs/plan.md`).
- **No structured comments / scope-change requests on the public status page.** Those belong to PRD §5.4 / Milestone 4 (negotiation agent), and they belong on the proposal view, not the post-acceptance status view.
- **No project-level dashboard rollup** (overdue projects, schedule view, sub utilization). The `/projects` list with status filters is enough for the current portfolio size; revisit when there are 20+ active.

### Verification

- Migration applied to dev Supabase; verified `project_updates` table + the two indexes (regular + partial).
- `bunx tsc --noEmit` — clean.
- `bun run lint` — back to the 6 known pre-existing warnings (no new ones).
- `bun run build` — green; route table now includes `/projects` and `/projects/[id]`.
- Manual smoke is up to you — accept a fresh share to land on a project, post a couple of updates with the visibility checkbox toggled both ways, then load `/p/[slug]` from an incognito window and confirm only the opted-in updates appear and the schedule reflects the dates / state-machine you set. Then drive the project to `complete` and back via Reopen and verify `actual_start_date` survives while `actual_end_date` clears and re-stamps.

### Next

Phase 1 project layer is closed out. Next priorities, per `docs/plan.md`: **Phase F demo polish** (onboarding blurb on `/leads/import`, empty states, seeded demo data, backup video). After Phase F, the next *feature* increments belong to PRD Milestone 1 (capture-first bidding) — gated on the vision-model + evals decisions in §10.

---

## 2026-04-19 — Project layer Slice 2: project detail page + state machine UI

**Goal:** Make the `projects` row from Slice 1 something a contractor can actually drive. The accepted-bid → delivery handoff now has a place to live: target dates, assigned sub, crew lead, notes, and a status state machine with `actual_*` timestamps that the system stamps automatically (per PRD §5.5).

### Shipped

- **State machine in the store** ([src/lib/store.ts](../src/lib/store.ts)) — `PROJECT_STATUS_TRANSITIONS` table encodes the PRD §5.5 graph (`not_started → in_progress → punch_out → complete`, with `on_hold` reachable from any non-terminal state and exiting back to `in_progress`; `complete` is terminal in Phase 1). `allowedProjectStatusTransitions(current)` exported so the UI never has to recompute the rules. `updateProjectStatus(id, next)` validates the transition, throws on illegal moves, auto-stamps `actual_start_date` the first time we enter `in_progress`, auto-stamps `actual_end_date` the first time we enter `complete`, and never re-stamps a non-null timestamp (so re-entering `in_progress` after `on_hold` doesn't reset the start date).
- **Detail editor in the store** ([src/lib/store.ts](../src/lib/store.ts)) — `updateProjectDetails(id, { targetStartDate, targetEndDate, assignedSub, crewLeadName, notes })`, user-scoped, single SQL update. `getProject(id)` returns `{ project, bid }` where `bid` is the small slice the page needs (id, propertyName, address, clientName, leadId, status), via inner join — saves a round trip on the page.
- **Validation** ([src/lib/validations.ts](../src/lib/validations.ts)) — `updateProjectStatusSchema` (id + `PROJECT_STATUSES` enum), `updateProjectDetailsSchema` with an `optionalDate` preprocessor that empty-strings → null and rejects anything that isn't `YYYY-MM-DD` (matches the `<input type="date">` payload).
- **Server actions** ([src/lib/actions.ts](../src/lib/actions.ts)) — `updateProjectStatusAction` and `updateProjectDetailsAction`. Both look up the project first to recover `bid.id` for revalidation, then call the store helper. Each revalidates `/projects/[id]` and `/bids/[bid.id]` so the bid detail "Project created" card and the project page both refresh.
- **`/projects/[id]` route** ([src/app/(app)/projects/[id]/page.tsx](<../src/app/(app)/projects/[id]/page.tsx>)) — RSC. Header with property name, project status badge, accepted-by line. Bid-context card with client + bid status + "Open bid" link. Status card that renders one button per allowed transition (driven by `allowedProjectStatusTransitions`) plus a per-state description, with an explicit terminal-state message when no transitions remain. A single "Project details" form covers target start / target end (date inputs), read-only display of `actual_start_date` / `actual_end_date`, assigned sub, crew lead, and notes — one Save button, one server action.
- **Bid detail link** ([src/app/(app)/bids/[id]/page.tsx](<../src/app/(app)/bids/[id]/page.tsx>)) — the existing "Project created" card from Slice 1 now has an "Open project" button that links to `/projects/[id]`.

### Out of scope for Slice 2 (deliberate)

- No `/projects` list view. The path in for now is bid detail → "Open project". A list view shows up when there are enough projects to navigate.
- No `project_updates` feed and no public status-page pivot at `/p/[slug]` — that is Slice 3 in full.
- No edit history / audit trail on status transitions beyond the `actual_*` stamps already in the schema.
- No date-range validation (`target_end_date >= target_start_date`). The form trusts the contractor; can revisit if it bites.
- No reopen flow out of `complete` (PRD calls it terminal in Phase 1; revisit if real workflows need it).

### Verification

- Linter clean on the touched files.
- `bunx tsc --noEmit` — clean.
- `bun run lint` — only the 6 known pre-existing warnings.
- `bun run build` — green; route table now includes `/projects/[id]`.
- Manual smoke is up to you — accept a fresh proposal share to land on a project, then walk it through `not_started → in_progress` (verify `actual_start_date` stamps), `in_progress → on_hold → in_progress` (verify start date is preserved), `→ punch_out → complete` (verify `actual_end_date` stamps and the action buttons disappear).

### Next

Slice 3: `project_updates` table + UI, public status-page pivot at `/p/[slug]` post-acceptance, `visible_on_public_url` flag for what the property manager actually sees.

---

## 2026-04-19 — PRD expansion: project layer + per-entity field specs; bid-to-project Slice 1

**Goal:** Lock the project-layer behavior in the PRD before writing the project UI, then ship a tight first slice of the bid-to-project handoff so the data model is real and the create-on-accept transaction is wired through. Custom fields explicitly stay out (the §2 / §12 no-configurability stance is preserved and reinforced).

### PRD shipped ([docs/prd.md](../docs/prd.md))

- **§5.5 Project Layer** — full rewrite. Subsections: Lifecycle and trigger (auto on acceptance, atomic with bid → won, idempotent via `ON CONFLICT DO NOTHING`); State machine (`not_started → in_progress → punch_out → complete`, plus `on_hold` side state, with `actual_*` auto-stamping); Inherited (immutable bid + proposal snapshot + lead + captures) vs. Owned (schedule, assignment, status, notes, `project_update` feed); Public status-page pivot at `/p/[slug]` post-acceptance (Slice 3); Scope changes after acceptance explicitly out of Phase 1 (change-order workflow is Milestone 5); Deferred list re-anchored to Milestone 5.
- **§6.1 Lead fields** — definitive spec grounded in the live `leads` table. Frames `resolved_address` / lat / lng / `google_place_id` as the *company office* address (not property-to-bid). `satellite_image_url` documented as historical-only, not written for new leads. Qualification fields (`qualification_score`, `qualification_brief`, `agent_run_id`) flagged as Milestone 3 aspirational.
- **§6.2 Bid fields** — definitive spec grounded in the live `bids` / `buildings` / `surfaces` / `line_items` tables. Property fields explicitly distinct from the lead's office address. Derived totals called out as non-stored — computed by [src/lib/pricing.ts](../src/lib/pricing.ts) — re-stating the §6 AI principle that contract-value numerics are never generated. Aspirational child records (`captures`, `scope_items`, `scope_flags`, `spec_documents`, `customer_requests`) flagged with milestones.
- **§6.3 Project fields + §6.3.1 project_update fields** — full spec for the new entity, including `accepted_by_*` provenance, `on_hold` state, and the `visible_on_public_url` flag on updates.
- **§6 table** — `project` and `project_update` rows rewritten to match §6.3 / §6.3.1, with `bid_id (unique)`, the full status enum, and pointers back to the detail subsections.
- **§2 non-goal "Configurability as a core product value"** and **§12 build principle "Domain opinion is the product"** — each lightly reinforced with one clause that points at §6.1-§6.3 as the definitive opinionated field spec, so future readers see the field lists and the no-configurability stance as one coherent argument.

### Tracker updated ([docs/plan.md](../docs/plan.md))

- PRD-alignment §5.5 row updated to reference §5.5 / §6.3 and to call out the named slices: Slice 1 (this PR), Slice 2 (project detail page + state machine UI), Slice 3 (`project_updates` + public status-page pivot).
- New top entry under *Active work → Open now*: **Project layer — Slice 1: bid-to-project handoff**, with the same checklist as below. Slice 2 and Slice 3 added as follow-ups so the thread stays visible.

### Slice 1 code shipped

- **`projects` table** ([src/db/schema.ts](../src/db/schema.ts)) — `bid_id UNIQUE NOT NULL` (cascade on bid delete), `user_id` denormalized, status enum from `PROJECT_STATUSES`, schedule columns, assignment, acceptance provenance, notes, timestamps. Migration: [drizzle/manual/008_projects.sql](../drizzle/manual/008_projects.sql), additive, applied to dev DB; `projects_user_id_updated_at_idx` composite index added for the eventual project-list query.
- **`PROJECT_STATUSES` + helpers** ([src/lib/status-meta.ts](../src/lib/status-meta.ts)) — `not_started | in_progress | punch_out | complete | on_hold`, plus `PROJECT_STATUS_LABELS`, `PROJECT_STATUS_VARIANTS`, `projectStatusLabel`, `projectStatusVariant` mirroring the bid/lead patterns. Schema enum sourced from this single const so the DB / TS / UI layers can't drift.
- **Atomic create-on-accept** ([src/lib/store.ts](../src/lib/store.ts) `respondToProposalShare`) — when `outcome === "won"`, the same `db.transaction` that flips the bid to `won` and the lead to `won` also inserts a `projects` row with `bidId`, `userId` (from the existing share / bid join), and the freshly-stamped `accepted_by_*` / `acceptedAt` from `proposal_shares`. `ON CONFLICT DO NOTHING` on `bid_id` keeps the create idempotent under any race; the function falls back to a select to recover the existing project's id if the insert was a no-op. The function's return shape now includes `projectId` for downstream revalidation.
- **`getProjectByBidId(bidId)`** ([src/lib/store.ts](../src/lib/store.ts)) — user-scoped getter for the bid detail page.
- **"Project created" signal** ([src/app/(app)/bids/[id]/page.tsx](<../src/app/(app)/bids/[id]/page.tsx>)) — fetches the project in parallel with `getBidPageData`; when present, renders a small read-only Card between the BidSummary and the OSM section showing the status badge, signer name + title, and accepted-on date. Deliberately read-only: no state-machine controls, no edit form, no new route.

### Out of scope for Slice 1 (deliberate)

- No `/projects/[id]` route. (Slice 2.)
- No status state-machine UI (no buttons to advance `not_started → in_progress` etc.). (Slice 2.)
- No `project_updates` table or feed. (Slice 3.)
- No public proposal URL pivot to a status page. (Slice 3.)
- No project-list view or dashboard rollup of projects.
- No back-fill SQL for historical accepted shares — the migration is forward-only, and any already-accepted dev shares stay project-less. To smoke-test, accept a fresh share or manually toggle `proposal_shares.accepted_at = NULL` and re-accept.

### Verification

- Migration applied to dev Supabase; verified columns + `projects_bid_id_key` unique constraint + `projects_user_id_updated_at_idx`.
- `bunx tsc --noEmit` — clean.
- `bun run lint` — only the 6 known pre-existing warnings.
- `bun run build` — green; route table unchanged.

### Next

Slice 2 of the project layer: `/projects/[id]` route, status state machine UI with `actual_*` auto-stamping, target-date / assigned-sub / notes editing. After that, Slice 3 (`project_updates` + public status-page pivot at `/p/[slug]`).

---

## 2026-04-19 — Strip satellite from leads + tighten the basic flow

**Goal:** Re-scope the lead surface so "lead address" is conceptually the company's office, not the property to paint. Satellite imagery and property-address capture belong to the bid stage; the lead layer should be rock-solid in its most basic form (contact info, office address from Places, status, fast path to "Create bid from lead").

### Shipped

- **Lead enrichment runner ([src/lib/leads/enrichment-runner.ts](../src/lib/leads/enrichment-runner.ts))** — `runEnrichmentForLead` no longer writes `satelliteImageUrl`; it only persists `resolvedAddress / latitude / longitude / googlePlaceId` on success. Dropped the `buildSatelliteProxyPath` import.
- **Override stack removed** — deleted `overrideLeadProperty` from [src/lib/store.ts](../src/lib/store.ts), `overrideLeadPropertyAction` from [src/lib/actions.ts](../src/lib/actions.ts), `overrideLeadPropertySchema` from [src/lib/validations.ts](../src/lib/validations.ts), and the entire `src/components/lead-property-override-form.tsx` component. The override was a property-being-painted UX bolted onto the lead; that concern belongs to the bid. If Places resolves the wrong office, today's recovery is `Re-run enrichment`.
- **Lead detail trimmed ([src/app/(app)/leads/[id]/page.tsx](<../src/app/(app)/leads/[id]/page.tsx>))** — dropped the `SatellitePreview` card, the `LeadPropertyOverrideForm` branch, the `?edit=property` / `?error` search-param plumbing, and the `AddressAutocomplete` dependency. Renamed the `Property` card to **Office address** with copy that says so explicitly: "Resolved from the company name via Google Places. The property to bid on is captured when you create a bid." Kept `Re-run enrichment` as the sole recovery affordance.
- **Copy updates** — post-import success banner on `/leads` now reads "Office addresses appear on each card where Google Places resolved the company"; `/leads/import` card description and "What happens next" bullets reframed around office-address resolution instead of property + satellite preview.

### Kept intentionally

- **DB columns** — `leads.satellite_image_url`, `leads.latitude`, `leads.longitude`, `leads.google_place_id`, `leads.resolved_address`, `leads.enrichment_status`, `leads.enrichment_error` all remain. No migration. Historical rows keep their satellite URLs; new rows just leave `satellite_image_url` NULL. We'll rethink lead-side Places enrichment later without being blocked by an irreversible schema change.
- **Bid stack untouched** — `SatellitePreview`, `new-bid-wizard`, `bid-summary`, `satellite-pdf.ts`, `/api/maps/satellite`, and `bids.satellite_image_url` continue to work exactly as before.
- **Places resolution logic** — `resolveLeadViaPlaces` in `src/lib/enrichment/enrich-lead.ts` is unchanged; the OSM/footprint code there is dead-but-cached for a future revisit.

### Verification

- `bunx tsc --noEmit` — clean.
- `bun run lint` — only the pre-existing warnings; nothing new.
- `bun run build` — green; route table unchanged.

### Next

Back to Phase F demo polish per `docs/plan.md` → Open now. Lead onboarding / empty states / seeded sample import.

---

## 2026-04-19 — Perf & DX hardening pass

**Goal:** Work through the audit list of refactor / perf items the platform had accumulated. Bias was toward small-to-medium changes that compound (caching correctness, fewer correlated subqueries, leaner client bundle, single source of truth for status enums) over file-splitting refactors that need their own scoping.

### Shipped

- **Cache invalidation correctness ([`src/lib/actions.ts`](../src/lib/actions.ts))** — `createProposalShareAction`, `generateProposal`, and accept/decline now `revalidatePath` the bid detail page, `/bids`, `/dashboard`, and (when a `leadId` is present) `/leads` + the lead detail page. Removed the `console.log` block from `createLeadAction` and added the missing `/leads` + `/dashboard` revalidation there.
- **Defer DB write off the public proposal GET ([`src/app/p/[slug]/page.tsx`](<../src/app/p/[slug]/page.tsx>))** — `markProposalShareAccessed` is now wrapped in `next/server`'s `after()` and short-circuits when `share.accessedAt` is already set, so the customer-facing page no longer eats a write per render.
- **`drizzle/manual/007_perf_indexes.sql`** — added foreign-key + composite indexes Postgres was not auto-creating: `bids(user_id, updated_at desc)`, `buildings(bid_id)`, `surfaces(building_id)`, `line_items(bid_id)`, `proposals(bid_id, created_at desc)`. Verified usage with `EXPLAIN` (had to `SET enable_seqscan = off` because dev DB is too small for the planner to bother — they will engage in production).
- **`getBidsWithSummary` rewritten ([`src/lib/store.ts`](../src/lib/store.ts))** — replaced four correlated subqueries per row with two joined aggregate subqueries (building count + total sqft, latest proposal). Proper multi-tenant scoping inside the subqueries.
- **Dashboard over-fetch fixed ([`src/app/(app)/dashboard/page.tsx`](<../src/app/(app)/dashboard/page.tsx>))** — added `getBidStatusCounts()` and `getLeadStatusCounts({ sourceTag })` SQL aggregates; dashboard no longer pulls every bid + every lead row to compute four counters. When a `?source=` filter is active we only fetch the unscoped lead totals once.
- **Accept/decline atomicity ([`src/lib/store.ts`](../src/lib/store.ts))** — collapsed the four sequential queries inside `acceptProposalShare` / `declineProposalShare` into a single shared `respondToProposalShare` helper wrapped in `db.transaction(...)`, joining `proposals → bids` upfront so the lead-id lookup is in the transaction too.
- **Status enums + UI labels deduplicated ([`src/lib/status-meta.ts`](../src/lib/status-meta.ts))** — single source of truth for `BID_STATUSES`, `LEAD_STATUSES`, `ENRICHMENT_STATUSES` and their badge labels/variants. Drizzle schema (`src/db/schema.ts`), Zod validators (`src/lib/validations.ts`), and four consumer pages now derive from this module instead of redeclaring 4-key maps inline.
- **Bundle: drop `@turf/turf` umbrella** — switched `osm/overpass.ts` and `enrichment/enrich-lead.ts` to scoped `@turf/area` + `@turf/helpers` and removed the umbrella from `package.json`.
- **Bundle: drop `radix-ui` umbrella** — `sheet.tsx`, `separator.tsx`, `tooltip.tsx`, `sidebar.tsx` switched to scoped `@radix-ui/*` packages; the umbrella package (which transitively pulled in *every* Radix primitive) is gone. Added `@radix-ui/react-separator` and `@radix-ui/react-tooltip` as the two scoped deps that weren't already present.
- **Marketing-only Fraunces ([`src/app/layout.tsx`](../src/app/layout.tsx) + [`src/app/(marketing)/layout.tsx`](<../src/app/(marketing)/layout.tsx>))** — Fraunces (variable + 3 axes: SOFT/WONK/opsz) is the heaviest font asset and was loading on every app route despite only being used for the marketing display headline. Moved the `next/font/google` call into the marketing segment layout so `/dashboard`, `/bids`, `/leads`, `/p/*` no longer pay for it.
- **Satellite preview uses `next/image` ([`src/components/satellite-preview.tsx`](../src/components/satellite-preview.tsx))** — swapped raw `<img>` for `next/image` with `unoptimized` (the URL is already a proxied / cached Google Static endpoint), preserving the existing `onError` fallback.

### Verification

- `bunx tsc --noEmit` — clean.
- `bun run lint` — 6 pre-existing warnings (unused lucide icons in marketing, unused vars in `scripts/validate-enrichment.ts`, missing `alt` in `pdf/proposal-template.tsx`); no new ones.
- `bun run build` — green; route table unchanged.
- Spot-checked `getBidStatusCounts()` / `getLeadStatusCounts()` against direct `SELECT status, count(*) GROUP BY status` queries against the dev DB — counts match.

### Deferred (audit items not addressed in this pass)

These are real wins but each needs its own focused PR:

- **Split `src/lib/store.ts` (~1100 lines)** and **`src/lib/actions.ts` (~600 lines)** into per-domain modules. Both are stable but unwieldy; a mechanical split would generate a giant import-rewrite diff that obscures real changes.
- **Marketing landing page is a single ~1010-line RSC** — would benefit from extracting hero / workflow / positioning / footer sections into separate files; tied to icon-tree-shaking.
- **`BidDetailSections` client island receives the full bid graph + `NewBidWizard` + `AddressAutocomplete` heavy client subtree** — should be re-scoped so the DB writes happen in actions and only the form bits are client. Needs UX validation.
- **`components/ui/sidebar.tsx` is ~726 lines of shadcn boilerplate** — low ROI to trim unless we find specific dead code.
- **No `next/image` rollout for content imagery** — no real assets exist yet; revisit when marketing visuals land.

### Next

Highest leverage remaining item in *Open now* (per `docs/plan.md`) is Phase F demo polish. Perf/DX work above does not flip any plan checkboxes; the plan file already abstracts perf work behind the milestone roadmap.

---

## 2026-04-17 — Phase B2 manual override shipped + plan.md promoted to single source of truth

**Goal:** Close the top open item from `docs/plan.md` → Active Work: a manual override for when Places resolved the wrong building. Also: reconcile AGENTS.md and plan.md so status lives in one place.

### Shipped

- `LeadPropertyOverrideForm` ([src/components/lead-property-override-form.tsx](../src/components/lead-property-override-form.tsx)) — client component wrapping the existing `AddressAutocomplete`. Exposed on the Property card via `?edit=property` query flag on the lead detail page.
- `overrideLeadProperty` store function ([src/lib/store.ts](../src/lib/store.ts)) — updates `resolved_address / latitude / longitude / google_place_id`, rebuilds `satellite_image_url` via `buildSatelliteProxyPath`, sets `enrichment_status = 'success'`, clears `enrichment_error`.
- `overrideLeadPropertyAction` ([src/lib/actions.ts](../src/lib/actions.ts)) — redirects back to `/leads/[id]` on success so the edit flag clears; validation errors redirect back with `?edit=property&error=...`.
- `overrideLeadPropertySchema` ([src/lib/validations.ts](../src/lib/validations.ts)) — reuses `formLatLng` + `formPlaceId`, so the same hidden fields that AddressAutocomplete emits elsewhere flow through.
- Lead detail page ([src/app/(app)/leads/[id]/page.tsx](<../src/app/(app)/leads/[id]/page.tsx>)) — Property card now has an "Override address" button; in edit mode swaps to the form with an explanatory copy line.

### Verification

1. Navigated to a lead with an existing resolved address (Jennifer Park / Post Alexander).
2. Opened `?edit=property` — form rendered with the current address preloaded.
3. Typed a new address ("520 W 5th St, Charlotte, NC"). Google Places blocked autocomplete with `PERMISSION_DENIED: Requests from referer http://localhost:59810/ are blocked.` — the dev key is restricted to `http://localhost:3000/*`. This is a dev-environment artifact, not a code issue; autocomplete works when the key's referer list matches the port, and `AddressAutocomplete` is already used in the bid wizard in production.
4. Submitted the form anyway to exercise the degraded path (address-only, no suggestion). Redirect went to `/leads/[id]` without the edit flag — action succeeded.
5. Verified in Postgres: `resolved_address` updated to the new value, `enrichment_status = 'success'`, `latitude / longitude / satellite_image_url` nulled (correct — no coords from Places without a picked suggestion). Restored the row to its original state so the demo data stays clean.

### Plan / docs reconciliation

AGENTS.md had its own "What Is Shipped" / "What Is Still Open" lists that duplicated the checkboxes in plan.md, already drifting. Consolidated:

- plan.md gained a top-level **Active Work — Single Source of Truth** section (Open now / Paused / Decisions needed / Shipped).
- AGENTS.md's duplicate status lists replaced with a pointer to the Active Work section and a rule that checkbox flips land in the same PR.
- B1 footprint/sqft items flipped from `[ ]` to `[~]` Paused with a pointer to the 2026-04-16 OSM tuning entry — they're decided-against, not pending.
- Tech-stack row fixed: CSV parsing is a custom parser in `src/lib/leads/csv.ts`, not Papa Parse.

### Next

Next candidate in "Open now" is **Phase E — /pipeline funnel page**. Phase F demo polish is the smaller follow-up.

---

## 2026-04-16 — Phase A shipped (CSV import + Places enrichment)

**Goal:** Plan Phase A from docs/plan.md — `leads` table + `/leads/import` + enrichment + lead detail — with OSM hidden per the tuning decision.

### Deliverables

- **Schema** — extended `leads` table with `resolved_address`, `latitude`, `longitude`, `google_place_id`, `satellite_image_url`, `enrichment_status`, `enrichment_error`, `raw_row`. Migration at [drizzle/manual/004_leads_enrichment.sql](../drizzle/manual/004_leads_enrichment.sql). Applied cleanly on first run.
- **CSV parser** — minimal RFC-4180-ish parser + column auto-mapper at [src/lib/leads/csv.ts](../src/lib/leads/csv.ts). Supports quoted fields with embedded commas and newlines. Column aliases cover the common trade-show shapes: `name / full name / contact`, `email`, `phone / mobile / cell / tel`, `company / organization / management`, `property / community`.
- **Places-only enrichment runner** — [src/lib/leads/enrichment-runner.ts](../src/lib/leads/enrichment-runner.ts) wraps the pure `resolveLeadViaPlaces` helper (exposed as a separate export in [src/lib/enrichment/enrich-lead.ts](../src/lib/enrichment/enrich-lead.ts) to avoid paying the Overpass call we don't need). Concurrency 3, writes `enrichment_status` back onto each lead.
- **Store** — `createLeadsBatch`, `getLead`, `updateLeadEnrichment`, `updateLeadStatus`, `getLeadSourceTags` in [src/lib/store.ts](../src/lib/store.ts).
- **Actions** — `importLeadsAction`, `enrichLeadAction`, `updateLeadStatusAction` in [src/lib/actions.ts](../src/lib/actions.ts). Enrichment runs inline inside the import action so the redirect lands on a fully-populated list view.
- **Pages** —
  - [src/app/(app)/leads/page.tsx](<../src/app/(app)/leads/page.tsx>) — list with Import CSV button, success banner, source-tag filter chips, enrichment status per card.
  - [src/app/(app)/leads/import/page.tsx](<../src/app/(app)/leads/import/page.tsx>) — file picker + source tag input.
  - [src/app/(app)/leads/[id]/page.tsx](<../src/app/(app)/leads/[id]/page.tsx>) — contact/property cards, re-run enrichment form, satellite preview, inline status dropdown, Create Bid link.
- **Test fixture** — [scripts/fixtures/trade-show-sample.csv](../scripts/fixtures/trade-show-sample.csv). 20 rows covering the real mess: missing phones/emails, quoted names with commas, apostrophes, one nameless row (should be skipped), multiple companies across Camden / AMLI / Cortland / AvalonBay / Greystar.

### End-to-end verification

1. Created dev user `claude-test+phase-a@mercer.dev`, marked confirmed directly in `auth.users` (see the turn above).
2. Uploaded the fixture CSV via `/leads/import` with source tag `NAA Orlando 2026`.
3. `POST /leads/import` returned `303` in 6055ms, redirected to `/leads?imported=19` — 20 rows read, 1 nameless row correctly skipped.
4. List view rendered all 19 leads with resolved addresses, phone/email, and green "Enriched" indicators. Source chip filter working.
5. Lead detail for Jennifer Park resolved to `600 Phipps Blvd NE, Atlanta, GA 30326` and rendered a live Google Static satellite preview. "Resolved via Google Places — confirm on-site." copy shows as expected.

### Notes / open items

- **React warning** on the import form (encType applied alongside a server-action function) — fixed by removing `encType="multipart/form-data"`; React supplies it automatically.
- **Enrichment runs inline.** 19 rows took ~6s. For larger imports (>100 rows) we'll want `waitUntil()` on Vercel or a background job. Not urgent for the MVP demo scale.
- **Prod Places key still TODO.** Dev uses the Referer-spoof workaround on the existing key; production `enrichLead` needs a separate IP-restricted key.
- **Create Bid from lead is not wired yet.** Link goes to `/bids/new?leadId=...` but the bid creation flow doesn't read the `leadId` param and pre-fill. That's Phase C.

### Next

Phase C — lead → bid pre-fill + `lead_id` FK on bids + lead-status auto-update on proposal generation. Or if demo priorities shift: Phase D (public shareable proposal URL) is the bigger unlock for closing deals.

---

## 2026-04-16 — OSM tuning experiment

**Context:** Day-0 validation showed OSM footprint plausibility at 10% (1/10). Spent this session trying to improve it with pipeline tweaks before starting Phase A.

### Variants tested

Implemented in [src/lib/enrichment/enrich-lead.ts](../src/lib/enrichment/enrich-lead.ts). Each ran against the same 10-property set.

| # | Variant | OSM returned | Plausible (±2x expected footprint) |
| --- | --- | --- | --- |
| 1 | **Baseline** — 75m circle, no building tag filter | 6/10 (60%) | 1/10 (10%) |
| 2 | Places viewport bbox + tag whitelist | 7/10 (70%) | 0/10 (0%) |
| 3 | 75m circle + tag whitelist (`apartments\|residential\|dormitory\|yes`) | 8/10 (80%) | **2/10 (20%)** |
| 4 | 75m circle + exclude-list (`garage\|shed\|carport\|...`) | 6/10 (60%) | 1/10 (10%) |

Winner: **variant 3**. Shipped as final config in [src/lib/enrichment/enrich-lead.ts](../src/lib/enrichment/enrich-lead.ts).

### Why viewport (variant 2) lost

Places viewports are zoom-hint-sized, not property-sized. For most addresses the viewport is a multi-block bbox, which pulled in *more* adjacent buildings than the fixed 75m circle. The viewport field is still captured in the pipeline for future use (e.g. paired with `Place.types` or `addressComponents`), but it does not drive the Overpass query.

### Why exclude-list (variant 4) lost

OSM multifamily buildings are often tagged as generic `yes` or even `commercial` (for mixed-use ground floors). Exclude-list keeps those but also keeps lots of true neighbors. Whitelist drops some real buildings but drops even more noise — net positive.

### Why plausibility still fails

- **Urban mid-rises** (AMLI Midtown, Camden Phipps, Camden Cotton Mills, Post Biltmore): 75m radius includes adjacent apartment buildings on the same block that aren't part of the property.
- **Suburban garden-style** (Avalon Arundel, Avalon Morristown): OSM has incomplete coverage — only 2–8 buildings mapped where there are 20+ on the ground.
- **Fuzzy Places resolution** (Avalon Morristown → zip-level match) puts the OSM lookup in the wrong spot entirely.
- **Public Overpass rate limits**: 2–4 of 10 requests still 429 even with 4s spacing. Production needs `OVERPASS_API_URL` → private instance.

No radius / filter combination fixes both urban overcapture AND suburban undercoverage simultaneously with one config. This is a **data quality ceiling**, not a tuning ceiling.

### Conclusion

**Stop tuning. Accept that OSM footprint is an order-of-magnitude signal, not an accurate sqft source.** Reframe the product:

- Lead list shows footprint *count* and *approximate* sqft with a "confirm on-site" label.
- Preliminary bid $ estimate uses a wide confidence band (±50% or more) rather than a precise number.
- Manual sqft override is the primary UI, not an escape hatch.
- Private Overpass instance is still a production requirement.

### Next

Start Phase A — `leads` table, `/leads/import`, `/leads` list — with the above reframing baked into the UI copy from day one.

---

## 2026-04-16 — Day-0 enrichment pipeline validation

**Goal:** Before building any Phase A/B UI, prove or disprove the plan's core enrichment premise — *"given a trade-show CSV row with `{company, propertyName}` and no address, we can enrich it with property data and a preliminary bid estimate."*

### Scope of this session

- Picked 10 real multifamily properties (Camden, AMLI, Cortland, AvalonBay).
- Built a pure enrichment function independent of the app shell so we could test the pipeline without UI.
- Built a validation runner that reports resolution rate and footprint plausibility against the plan's thresholds (≥60% resolution, ≤25% off on accuracy).

### Deliverables

- [src/lib/enrichment/enrich-lead.ts](../src/lib/enrichment/enrich-lead.ts) — `enrichLead({company, propertyName}, apiKey, opts)` pure function. Places Text Search (New) + Overpass footprint lookup. No I/O side effects. Ready to be wrapped as the Phase B1 `enrichLead(leadId)` server action.
- [scripts/validate-enrichment.ts](../scripts/validate-enrichment.ts) — runnable with `bun run scripts/validate-enrichment.ts`. Prints per-property detail, summary tallies, and a PASS/FAIL verdict.

### Result

| Metric | Result | Threshold | Status |
| --- | --- | --- | --- |
| Places resolution | 10/10 (100%) | ≥ 60% | ✅ strong |
| OSM footprints returned | 6/10 (60%) | — | ⚠️ rate-limited |
| Footprint plausibility (±2x) | 1/10 (10%) | ≥ 60% | ❌ weak |

**Verdict:** Mixed. Places lookup is reliable; OSM footprint as an accurate sqft source is not.

### Failure modes identified

1. **Urban overcapture** — 75m radius in [src/lib/osm/overpass.ts:5](../src/lib/osm/overpass.ts:5) includes neighboring buildings for mid-rise / dense urban properties (e.g. AMLI Midtown: 4× expected).
2. **Suburban coverage gaps** — some properties (Avalon Arundel Crossing) only have 1–2 building polygons in OSM even though they have dozens on-site.
3. **Public Overpass rate limits** — even with 4s pacing, 4/10 requests returned "service is busy." Production deployment will require a private Overpass (env var `OVERPASS_API_URL` already wired).
4. **Fuzzy Places resolution** — for one property (Avalon Morristown Station) Places returned only a zip-level match, not a street address. Coords still usable but footprint lookup lands in the wrong spot.

### Implementation note — Google key restrictions

The existing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is restricted to HTTP referrers (browser calls only). Server-side Places Text Search requires either (a) a separate server-restricted key, or (b) a whitelisted Referer header. The script passes `Referer: http://localhost:3000/` for local dev. Production will need approach (a).

### Decisions

- **Ship Places-first enrichment in Phase B; treat OSM footprints as optional enhancement.** The "find-the-property-from-a-name" pitch is strong enough to justify the feature. Treating OSM sqft as authoritative would mislead the user on 9/10 properties today.
- **Manual sqft override promoted from escape-hatch to primary UI.** The contractor is the ground truth; enrichment seeds their work rather than replacing it.
- **Private Overpass instance is a production blocker** for any OSM-dependent UI in the demo.

### Next step

Phase A from [docs/plan.md](plan.md) — CSV upload + leads table + list view — is unblocked. See "Open questions" below before starting.

### Open questions for Tim

1. **Separate server-side Places key?** Ok to create a second Google Maps API key with IP-based restriction for server-side Places calls (production `enrichLead` action), or prefer another approach?
2. **CSV from Jordan** — plan's other Day-0 item. Do we have one yet, or should we build Phase A against a synthetic CSV and swap later?
3. **OSM in the MVP demo** — show it behind a "approximate / confirm on-site" label, or hide it entirely until we have a private Overpass?
