# Mercer

The AI-native sales platform for commercial multifamily exterior renovation.

Mercer takes a contractor from a trade-show attendee list to a signed deal to a closed-out project on one spine: ingest leads, enrich them, build a bid, send a live proposal the customer can sign on the web, and track the resulting project through punch-out — with a public status page the property manager can keep open.

The deployed product today (Phase 0) is the non-AI substrate of that workflow: lead pipeline, manual bid build, public proposal with accept/decline, project tracking. Phase 1 adds the AI-native operations on top of this same data model. See [`docs/prd.md`](docs/prd.md) for the full product vision and [`docs/plan.md`](docs/plan.md) for what is shipped, in flight, and paused.

## Surfaces

| Route group | Purpose | Notable pages |
| ----------- | ------- | ------------- |
| `(marketing)` | Public landing page; redirects to `/dashboard` if signed in | `/` |
| `(auth)` | Branded sign-in / sign-up shell that mirrors the marketing surface, with the Mercer wordmark linking back to `/` | `/login`, `/signup` |
| `(app)` | Authenticated app behind a sidebar shell | `/dashboard`, `/leads`, `/leads/[id]`, `/leads/import`, `/leads/new`, `/bids`, `/bids/[id]`, `/bids/new`, `/projects`, `/projects/[id]`, `/settings` |
| `(onboarding)` | Post-signup branding wizard with website enrichment and theme confirmation | `/onboarding` |
| Public sharing | No-auth proposal/status page | `/p/[slug]` (proposal pre-acceptance, project status page post-acceptance) |
| Auth callback | Supabase OAuth redirect handler | `/auth/callback` |
| Image proxy | Server-side Maps Static fetch (key never reaches the browser) | `/api/maps/satellite` |

## Current capabilities

### Leads
- CSV import with auto-mapping, source tags, and a clean sample fixture for demos.
- **Property-first Niko table (default).** Trade-show CSV rows are property-level (one attendee with five communities shows up five times with five addresses), so `/leads` shows one row per property with embedded contact chips, account/company, pipeline mix, portfolio count, and follow-up. Niko owns search, filter, sort, and pagination; the legacy contact-row table remains available via `view=contact`.
- **Normalized lead domain model.** Imports and manual lead creation normalize into durable `accounts`, `properties`, `contacts`, `property_contacts`, `leads`, and `lead_contacts`, while compatibility fields remain on `leads` during the transition. `activity_events` stores the readable sales timeline and `audit_log` stores structured change history.
- **Property detail side panel.** Clicking a property opens a resizable sidebar with property/account context, contacts at that property, status breakdown, next action, and bid handoff.
- **Per-lead outreach state.** `last_contacted_at`, `follow_up_at`, and `contact_attempts` columns drive an Outreach card on the lead detail (one-click "log contact attempt", follow-up date input with overdue indicator). The property table rolls up earliest follow-up across contacts.
- Lead enrichment via Google Places: the CSV property address is treated as authoritative; Places fills in lat/lng and Place ID, and only resolves a fresh address when the row is `company`-only. Satellite imagery is generated at the bid layer.
- Lead detail with manual override, status workflow (`new` / `quoted` / `won` / `lost`), and a one-click "Create bid from lead" handoff.

### Bids
- Wizard-style new-bid flow: address → confirm with optional satellite snapshot → details.
- Buildings + surfaces with factor-group dimension entry, presets for common surface names, and live sqft rollups per building and per bid.
- Pricing engine: coverage (sqft/gal), price per gallon, labor rate ($/sqft), and margin (%) compute gallons, material, labor, and grand total live as you type.
- Per-bid line items (pressure washing, dumpster rental, scaffolding, etc.).
- Company defaults: pricing inputs auto-save to user defaults; new bids inherit the latest defaults.
- OpenStreetMap building footprints (Overpass) shown on bid detail when coordinates exist.
- Proposal PDFs generated with `@react-pdf/renderer`, stored as frozen snapshots in Supabase Storage so subsequent bid edits don't change what was sent.

### Public proposal + project status page
- Each proposal generates a shareable `/p/[slug]` URL with no login required.
- Pre-acceptance: full proposal view with explicit accept / decline actions that propagate status back through the bid and lead atomically.
- Post-acceptance: the same URL pivots to a **project status page** (status badge, schedule, on-site assignment, public updates only, original-proposal summary) so the property manager can keep one bookmark across the lifecycle.

### Project layer
- `projects` row created **atomically** on bid acceptance (not a separate manual step) and surfaced as a "Project created" badge on the bid page.
- `/projects` list view with status filters and per-status counts.
- `/projects/[id]` detail page with a state-machine UI (`not_started` → `in_progress` → `punch_out` → `complete`, plus `on_hold` and an explicit reopen from `complete` that clears the actual end date).
- `actual_start_date` and `actual_end_date` auto-stamp on first transition into `in_progress` / `complete`.
- Editable target dates, assigned subcontractor, crew lead, and notes.
- Append-only `project_updates` feed with a per-entry `visible_on_public_url` opt-in (internal-by-default).

### Dashboard
- Funnel and source filters drilling down into `/leads?status=…&source=…`.
- Open vs won pipeline dollars derived from latest proposal totals per bid.
- Project rollup card (active, overdue, per-status counts) linking into `/projects?status=…`.

### Brand and theming
- New users pass through a 3-step onboarding wizard that captures a website, uses Anthropic Haiku to extract company profile/brand hints when configured, and confirms the bid theme. Users can skip the wizard.
- Marketing landing page on a custom ink + amber + blueprint palette with a Fraunces editorial display headline.
- Theme-aware `(auth)` shell (parchment in light mode, ink in dark mode) sharing the marketing texture and wordmark.
- Light brand accents in the app: Fraunces page titles and an `amber` button variant on the most-primary CTA per surface; the rest of the app stays neutral so dense data flows stay legible.

For status of every roadmap item (shipped, in flight, paused, decisions blocking the AI-native milestones), see [`docs/plan.md`](docs/plan.md). For the underlying product vision, personas, and the case for AI-native vs system-of-record, see [`docs/prd.md`](docs/prd.md).

## Tech stack

| Layer | Technology |
| ----- | ---------- |
| Framework | Next.js 16 (App Router, RSC, server actions) |
| UI | React 19, Tailwind CSS 4, shadcn-style primitives over Radix UI, Niko table |
| Fonts | Geist (sans), JetBrains Mono, Fraunces (variable display) via `next/font` |
| Database | PostgreSQL via Supabase |
| ORM | Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `postgres` driver) |
| Auth | Supabase Auth |
| Validation | Zod |
| PDF | `@react-pdf/renderer` |
| Storage | Supabase Storage |
| Geospatial | `@turf/area`, `@turf/helpers`; OpenStreetMap via Overpass |
| Maps | Google Maps Platform: Places API (New) for autocomplete, Maps Static API for satellite (server-side, proxied) |
| LLM | Anthropic Haiku for onboarding website enrichment |
| Theming | `next-themes` |
| Analytics | Vercel Web Analytics |
| Language | TypeScript |
| Hosting | Vercel |

## Repository layout

```
src/
├── app/
│   ├── (marketing)/             # Public landing page + marketing layout
│   ├── (auth)/                  # /login, /signup with branded shell + wordmark home link
│   ├── (app)/                   # Authenticated app behind sidebar
│   │   ├── dashboard/
│   │   ├── leads/               # list, [id], import, new
│   │   ├── bids/                # list, [id], new (wizard)
│   │   ├── projects/            # list, [id]
│   │   └── settings/
│   ├── (onboarding)/            # /onboarding website/profile/theme wizard
│   ├── p/[slug]/                # Public proposal → project status page
│   ├── api/maps/satellite/      # Server-side Maps Static proxy
│   ├── auth/callback/           # Supabase OAuth redirect
│   ├── globals.css              # Tailwind + brand tokens (ink/parchment/amber/blueprint)
│   └── layout.tsx               # Root: ThemeProvider, Geist + JetBrains Mono + Fraunces
├── components/
│   ├── ui/                      # Reusable primitives (button with amber variant, card, input, sidebar, …)
│   ├── app-sidebar*.tsx         # Authenticated sidebar nav
│   ├── niko-table/              # Semkoo/Niko data table primitives + filters/sort/pagination
│   ├── new-bid-wizard.tsx       # Address → confirm → details flow
│   ├── bid-*.tsx, building-*.tsx, surface-*.tsx, pricing-*.tsx, line-item-*.tsx
│   ├── property-leads-table.tsx # Property-first Niko table (default /leads view)
│   ├── property-detail-panel.tsx# Property sidebar panel with embedded contacts
│   ├── leads-table.tsx          # Legacy contact-row Niko table (?view=contact)
│   ├── leads-toolbar.tsx        # Leads title + import/new actions
│   ├── lead-detail-body.tsx, lead-detail-aside.tsx, leads-row.tsx, leads-by-property.tsx
│   ├── proposal-list.tsx        # Generate + share + history
│   ├── public-proposal-response.tsx # Accept/decline form on /p/[slug]
│   ├── osm-footprints-section.tsx
│   ├── satellite-preview.tsx    # Reads from /api/maps/satellite
│   ├── theme-provider.tsx, theme-toggle.tsx
│   └── page-loading.tsx         # Per-surface skeletons
├── db/
│   ├── schema.ts                # Drizzle tables: lead domain, bids, proposals, projects, onboarding, etc.
│   └── index.ts
├── lib/
│   ├── actions.ts               # Server actions (auth, lead/bid/project CRUD, share + accept/decline, proposal generation)
│   ├── store.ts                 # Data access layer + state-machine helpers (allowedProjectStatusTransitions, etc.)
│   ├── validations.ts           # Zod schemas for every form
│   ├── status-meta.ts           # LEAD_STATUSES / BID_STATUSES / PROJECT_STATUSES + label/variant helpers
│   ├── pricing.ts               # Pricing calculation engine
│   ├── dimensions.ts            # Sqft from factor groups
│   ├── pdf/                     # React-PDF proposal template + render wrapper + ProposalSnapshot type
│   ├── leads/                   # CSV parsing + enrichment helpers
│   ├── osm/                     # Overpass queries + cached footprint fetch
│   └── supabase/                # Client/server helpers + auth cache
├── proxy.ts                     # Next.js proxy (replaces middleware.ts)
drizzle/
└── manual/                      # Hand-written additive SQL migrations (001 → 013)
docs/
├── prd.md                       # Product requirements: vision, personas, scope, milestones, AI principles
├── plan.md                      # Live execution tracker (shipped / open / paused / decisions)
├── worklog.md                   # Session-by-session implementation notes (newest at top)
└── build-plans/                 # Archived per-feature plans
AGENTS.md                        # Contributor + AI-agent operating guide
```

## Getting started

### Prerequisites
- [Bun](https://bun.sh/) (package manager + script runner)
- A [Supabase](https://supabase.com/) project (PostgreSQL, auth, and storage)

### 1. Clone and install
```sh
git clone https://github.com/robbschiller/mercer.git
cd mercer
bun install
```

### 2. Configure environment variables
Copy the example env file and fill in your Supabase credentials:
```sh
cp .env.local.example .env.local
```

Required:

| Variable | Where to find it |
| -------- | ---------------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public key |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (pooler / Transaction mode, port `6543`) |

Optional:

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser-side Places autocomplete on bid address fields. Restrict to **HTTP referrers** in the Google Cloud Console; enable **Maps JavaScript API** and **Places API (New)**. Without it, the address field falls back to a plain text input. |
| `GOOGLE_MAPS_STATIC_API_KEY` | **Server-only** key for [Maps Static API](https://developers.google.com/maps/documentation/maps-static/overview) (satellite thumbnails on bid detail and the new-bid confirm step). Used through `/api/maps/satellite`; never exposed to the client. Without it, satellite previews are skipped. |
| `NEXT_PUBLIC_APP_URL` | Public origin (no trailing slash). Used when generating proposals so the PDF can fetch the satellite image server-side. On Vercel, `VERCEL_URL` is used if unset; set this for a stable canonical URL (e.g. a custom domain). |
| `OVERPASS_API_URL` | Overpass interpreter base URL (default `https://overpass-api.de/api/interpreter`). Use a self-hosted Overpass for heavy traffic. |
| `ANTHROPIC_API_KEY` | Enables onboarding website enrichment with Anthropic Haiku. Without it, onboarding still advances and users can fill the company profile manually. |

### 3. Apply the database schema
We rely on hand-written additive SQL migrations in [`drizzle/manual/`](drizzle/manual/) (one per change, never edited after merge). Apply them all in order:
```sh
bun run db:apply-manual
```

This creates the normalized lead-domain tables (`accounts`, `properties`, `contacts`, `property_contacts`, `leads`, `lead_contacts`, `activity_events`, `audit_log`), bid/proposal/project tables, onboarding/company profile tables, and supporting indexes.

`drizzle-kit push` is also available (`bun run db:push`) but **prefer the manual migrations** — push is known to crash against Supabase introspection on some schemas, and we use additive SQL as the source of truth per [`AGENTS.md`](AGENTS.md) → "Database Change Rules."

### 4. Set up Supabase Storage
In your Supabase dashboard:
1. **Storage** → create a bucket named `proposals` (toggle **Public bucket** on).
2. Add an **INSERT** policy for `authenticated` users with `bucket_id = 'proposals'`.
3. Add a **SELECT** policy for `anon, authenticated` with `bucket_id = 'proposals'`.

### 5. Run the dev server
```sh
bun run dev
```
Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Command | Purpose |
| ------ | ------- | ------- |
| `dev` | `next dev` | Development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Production server |
| `lint` | `eslint . --ext .js,.jsx,.ts,.tsx` | ESLint |
| `db:push` | `drizzle-kit push` | Push Drizzle schema to the database (prefer manual migrations) |
| `db:apply-manual` | `bun run scripts/apply-manual-migrations.ts` | Run every `drizzle/manual/*.sql` in order |
| `db:studio` | `drizzle-kit studio` | Open Drizzle Studio for DB inspection |

## Definition of done

Per [`AGENTS.md`](AGENTS.md), a change is not done until:
- `bunx tsc --noEmit` passes
- `bun run lint` passes (warnings only if already known and documented)
- `bun run build` passes
- Schema changes ship with a new file in `drizzle/manual/`
- [`docs/plan.md`](docs/plan.md) is updated when a roadmap status changes

## Further reading

- [`docs/prd.md`](docs/prd.md) — vision, personas, AI architecture principles, full scope, milestones, open questions
- [`docs/plan.md`](docs/plan.md) — live execution tracker (shipped / open / paused / decisions)
- [`docs/worklog.md`](docs/worklog.md) — session-by-session implementation notes
- [`AGENTS.md`](AGENTS.md) — contributor and AI-agent operating guide
- [`drizzle/manual/README.md`](drizzle/manual/README.md) — manual migration conventions
