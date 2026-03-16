# Mercer

Bid multifamily exteriors from the parking lot.

Mercer is a web app for exterior renovation contractors bidding multifamily properties. Instead of measuring with a tape and re-entering everything into a spreadsheet at home, Mercer lets you create bids on-site — log measurements per building type, calculate materials and labor, and generate proposals before you leave the property.

## Current State

Mercer is in active MVP development. What's working today:

- **Auth** — Sign up and sign in with email (via Supabase)
- **Bids** — Create, list, view, edit, and delete bids with property name, address, client, notes, and status tracking (draft / sent / won / lost)
- **Buildings** — Add building types to a bid with labels and counts (e.g. "Six unit 3-story x 25"). Expand/collapse to manage surfaces.
- **Surfaces** — Add paintable surfaces per building with dimension factor input (e.g. "90 x 33" = 2,970 sqft). Surface presets for common names (Front, Back, Posts, Porch Ceilings, etc.). Running sqft totals per building and across the bid.
- **Pricing engine** — Enter coverage (sqft/gal), price per gallon, labor rate ($/sqft), and margin (%). Live calculation shows gallons needed, material cost, labor cost, and grand total as you type.
- **Custom line items** — Add per-bid costs like pressure washing, dumpster rental, or scaffolding.
- **Company defaults** — Pricing inputs save back to user defaults automatically. New bids inherit the latest defaults. Optional settings page for direct adjustment.
- **Error handling** — Loading skeletons, error boundaries, and not-found pages throughout.
- **Analytics** — Vercel Web Analytics

What's planned next:

- Proposal PDF generation with per-building breakdowns
- Mobile responsiveness polish
- Drag-to-reorder buildings and surfaces

See `docs/` for the full product plan and build plan.

## Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Framework | Next.js 15 (App Router)             |
| UI        | React 19, Tailwind CSS 4, Radix UI  |
| Database  | PostgreSQL via Supabase              |
| ORM       | Drizzle ORM                          |
| Auth      | Supabase Auth                        |
| Validation| Zod                                  |
| Analytics | Vercel Web Analytics                 |
| Language  | TypeScript                           |
| Hosting   | Vercel                               |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Bun](https://bun.sh/) (package manager)
- A [Supabase](https://supabase.com/) project (provides PostgreSQL and auth)

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

### 3. Push the database schema

```sh
bun run db:push
```

This uses Drizzle Kit to create the tables (`bids`, `buildings`, `surfaces`, `line_items`, `user_defaults`) in your Supabase Postgres instance.

### 4. Run the dev server

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
| `db:push`    | `drizzle-kit push`    | Push schema changes to the database  |
| `db:studio`  | `drizzle-kit studio`  | Open Drizzle Studio for DB inspection|

## Project Structure

```
src/
├── app/                         # Next.js App Router pages
│   ├── auth/callback/           # OAuth redirect handler
│   ├── bids/                    # Bid list, create, and detail pages
│   │   ├── [id]/                # Bid detail with buildings, surfaces, pricing
│   │   └── new/                 # New bid form
│   ├── login/                   # Login page
│   ├── settings/                # Company pricing defaults
│   └── signup/                  # Signup page
├── components/
│   ├── ui/                      # Reusable primitives (button, card, input, etc.)
│   ├── bid-summary.tsx          # Editable bid header
│   ├── building-list.tsx        # Buildings section with grand total
│   ├── building-card.tsx        # Expandable building with surfaces
│   ├── pricing-section.tsx      # Pricing form + line items
│   ├── pricing-form.tsx         # Rate inputs with live calculation
│   ├── line-item-list.tsx       # Custom line items CRUD
│   ├── dimension-input.tsx      # Factor-group dimension entry
│   ├── surface-presets.tsx      # Common surface name dropdown
│   ├── defaults-form.tsx        # Settings page defaults form
│   └── ...                      # Add/edit forms, submit button, nav
├── db/
│   ├── schema.ts                # Drizzle table definitions
│   └── index.ts                 # Database client (singleton)
└── lib/
    ├── actions.ts               # Server actions (auth, CRUD, pricing)
    ├── store.ts                 # Data access layer
    ├── validations.ts           # Zod schemas for all inputs
    ├── pricing.ts               # Pricing calculation engine
    ├── dimensions.ts            # Sqft computation from dimension groups
    └── supabase/                # Supabase client helpers and middleware
docs/
├── product-plan.md              # Market analysis and phased product plan
├── build-plan.md                # MVP implementation roadmap
└── build-plans/                 # Detailed feature build plans
```
