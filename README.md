# Mercer

Bid multifamily exteriors from the parking lot.

Mercer is a web app for exterior renovation contractors bidding multifamily properties. Instead of measuring with a tape and re-entering everything into a spreadsheet at home, Mercer lets you create bids on-site — log measurements per building type, calculate materials and labor, and generate a proposal PDF before you leave the property.

## Current State

Mercer is a working MVP with the full bid-to-proposal workflow complete:

- **Auth** — Sign up and sign in with email (via Supabase)
- **Bids** — Create, list, view, edit, and delete bids with property name, address, client, notes, and status tracking (draft / sent / won / lost). Bid list cards show building count, total sqft, grand total, and last proposal date.
- **Address autocomplete** — On new bid and bid edit, property address uses Google Places when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set (formatted address + optional lat/lng and place ID). Without a key, the field falls back to a normal text input.
- **Buildings** — Add building types to a bid with labels and counts (e.g. "Six unit 3-story x 25"). Expand/collapse to manage surfaces.
- **Surfaces** — Add paintable surfaces per building with dimension factor input (e.g. "90 x 33" = 2,970 sqft). Surface presets for common names (Front, Back, Posts, Porch Ceilings, etc.). Running sqft totals per building and across the bid.
- **Pricing engine** — Enter coverage (sqft/gal), price per gallon, labor rate ($/sqft), and margin (%). Live calculation shows gallons needed, material cost, labor cost, and grand total as you type.
- **Custom line items** — Add per-bid costs like pressure washing, dumpster rental, or scaffolding.
- **Company defaults** — Pricing inputs save back to user defaults automatically. New bids inherit the latest defaults. Optional settings page for direct adjustment.
- **Proposal PDF** — Generate a client-facing PDF with property info, per-building sqft breakdown, scope, and total price. Each proposal is stored with a frozen snapshot so edits to the bid don't change what was sent. Download previous proposals from the bid detail page. Status auto-updates to "Sent" on first generation.
- **Collapsible cards** — Bid detail sections (info, buildings, pricing, proposals) collapse to read-only summaries and expand inline for editing. All sections can be open simultaneously.
- **Error handling** — Loading skeletons, error boundaries, and not-found pages throughout.
- **Analytics** — Vercel Web Analytics

## What's Next

**Property Intelligence** — The headline feature for the next phase:

- Satellite image display from Google Maps to validate the property visually (lat/lng from address autocomplete is stored on bids for this)
- Automated building detection using OpenStreetMap footprint data and AI vision analysis (GPT-4o / Gemini) to suggest building count, types, and similarity grouping
- Pre-populated building list that the contractor reviews and accepts — reducing manual setup time significantly

**Workflow Efficiency** — Duplicate buildings, clone bids, surface set templates, and proposal sharing via email or link.

**Polish** — Mobile responsiveness audit, confirm-before-delete dialogs, numeric validation, and onboarding hints.

See `docs/` for the full [product plan](docs/product-plan.md), [build plan](docs/build-plan.md), and [EagleView integration plan](docs/eagleview-integration-plan.md).

## Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Framework | Next.js 15 (App Router)             |
| UI        | React 19, Tailwind CSS 4, Radix UI  |
| Database  | PostgreSQL via Supabase              |
| ORM       | Drizzle ORM                          |
| Auth      | Supabase Auth                        |
| Validation| Zod                                  |
| PDF       | @react-pdf/renderer                  |
| Storage   | Supabase Storage                     |
| Analytics | Vercel Web Analytics                 |
| Maps      | Google Maps JavaScript API + Places API (New) (optional; address autocomplete) |
| Language  | TypeScript                           |
| Hosting   | Vercel                               |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Bun](https://bun.sh/) (package manager)
- A [Supabase](https://supabase.com/) project (provides PostgreSQL, auth, and storage)

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

You'll need three values from your Supabase project dashboard:

| Variable                         | Where to find it                          |
| -------------------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Project Settings → API → Project URL      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Project Settings → API → anon public key  |
| `DATABASE_URL`                   | Project Settings → Database → Connection string (use the pooler / Transaction mode URI on port 6543) |

Optional, for address autocomplete:

| Variable | Where to find it |
| -------- | ---------------- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → Create API key → restrict to **HTTP referrers** (e.g. `http://localhost:3000/*`, your production origin). Enable **Maps JavaScript API** and **Places API (New)** (address autocomplete uses the new Places Data API, not the legacy Places widget). Billing must be enabled on the project. After changing `.env.local`, restart `bun run dev`. |

### 3. Push the database schema

```sh
bun run db:push
```

This uses Drizzle Kit to create the tables (`bids`, `buildings`, `surfaces`, `line_items`, `user_defaults`, `proposals`) in your Supabase Postgres instance. The `bids` table includes optional `latitude`, `longitude`, and `google_place_id` for Places-backed addresses.

`drizzle.config.ts` loads `.env` then `.env.local` so `DATABASE_URL` is available (Drizzle does not use Next.js env loading). If push fails with a missing URL error, confirm `DATABASE_URL` exists in `.env.local`.

**If `db:push` crashes** with `TypeError: Cannot read properties of undefined (reading 'replace')`, that is a [known drizzle-kit + Supabase introspection bug](https://github.com/drizzle-team/drizzle-orm/issues/3766). Use:

```sh
bun run db:apply-manual
```

That runs every `drizzle/manual/*.sql` file in order (see [drizzle/manual/README.md](drizzle/manual/README.md)). You can also paste SQL into the Supabase SQL editor, e.g.:

```sql
ALTER TABLE bids ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS google_place_id text;
```

### 4. Set up Supabase Storage

In your Supabase dashboard:

1. Go to **Storage** and create a bucket named `proposals` (toggle **Public bucket** on)
2. Add an **INSERT** policy for `authenticated` users with check: `bucket_id = 'proposals'`
3. Add a **SELECT** policy for `anon, authenticated` with using: `bucket_id = 'proposals'`

### 5. Run the dev server

```sh
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script       | Command               | Purpose                              |
| ------------ | --------------------- | ------------------------------------ |
| `dev`        | `next dev`            | Start the development server         |
| `build`      | `next build`          | Create a production build            |
| `start`      | `next start`          | Run the production server            |
| `lint`       | `next lint`           | Run ESLint                           |
| `db:push`         | `drizzle-kit push`                    | Push schema changes to the database  |
| `db:apply-manual` | `bun run scripts/apply-manual-migrations.ts` | Apply `drizzle/manual/*.sql` when `db:push` fails |
| `db:studio`       | `drizzle-kit studio`                  | Open Drizzle Studio for DB inspection|

## Project Structure

```
src/
├── app/                         # Next.js App Router pages
│   ├── auth/callback/           # OAuth redirect handler
│   ├── bids/                    # Bid list, create, and detail pages
│   │   ├── [id]/                # Bid detail with buildings, surfaces, pricing, proposals
│   │   └── new/                 # New bid form
│   ├── login/                   # Login page
│   ├── settings/                # Company pricing defaults
│   └── signup/                  # Signup page
├── components/
│   ├── ui/                      # Reusable primitives (button, card, input, etc.)
│   ├── address-autocomplete.tsx # Google Places address field (optional API key)
│   ├── bid-detail-sections.tsx  # Collapsible buildings/pricing/proposals sections
│   ├── bid-summary.tsx          # Collapsible bid info with dirty tracking
│   ├── building-list.tsx        # Buildings list with add form
│   ├── building-card.tsx        # Expandable building with surfaces
│   ├── pricing-section.tsx      # Pricing form + line items
│   ├── pricing-form.tsx         # Rate inputs with live calculation
│   ├── line-item-list.tsx       # Custom line items CRUD
│   ├── proposal-list.tsx        # Proposal generation + history
│   ├── dimension-input.tsx      # Factor-group dimension entry
│   ├── surface-presets.tsx      # Common surface name dropdown
│   ├── defaults-form.tsx        # Settings page defaults form
│   └── ...                      # Add/edit forms, submit button, nav
├── db/
│   ├── schema.ts                # Drizzle table definitions
│   └── index.ts                 # Database client (singleton)
└── lib/
    ├── actions.ts               # Server actions (auth, CRUD, pricing, proposals)
    ├── store.ts                 # Data access layer
    ├── validations.ts           # Zod schemas for all inputs
    ├── pricing.ts               # Pricing calculation engine
    ├── dimensions.ts            # Sqft computation from dimension groups
    ├── pdf/                     # PDF generation
    │   ├── proposal-template.tsx # React-PDF document layout
    │   ├── generate.tsx         # renderToBuffer wrapper
    │   └── types.ts             # ProposalSnapshot type
    └── supabase/                # Supabase client helpers and middleware
docs/
├── product-plan.md              # Market analysis and phased product plan
├── build-plan.md                # Implementation roadmap
├── eagleview-integration-plan.md # EagleView API integration plan (Phase 3)
└── build-plans/                 # Detailed feature build plans
```
