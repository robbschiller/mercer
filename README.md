# Mercer

Bid multifamily exteriors from the parking lot.

Mercer is a web app for exterior renovation contractors bidding multifamily properties. Instead of measuring with a tape and re-entering everything into a spreadsheet at home, Mercer lets you create bids on-site — log measurements per building type, calculate materials and labor, and generate proposals before you leave the property.

## Current State

Mercer is an early MVP. What's working today:

- **Auth** — Sign up and sign in with email or Google (via Supabase)
- **Bid CRUD** — Create, list, view, edit, and delete bids
- **Bid status tracking** — Draft, sent, won, lost

What's planned but not yet built:

- Building types and measurement templates (garden-style, stacked flat, townhome, breezeway)
- Specs and pricing engine (materials, labor, margin)
- Scope flags (breezeways, patio ceilings, catwalks)
- Proposal PDF generation
- EagleView aerial measurement integration

See `docs/` for the full product plan, build plan, and EagleView integration design.

## Tech Stack

| Layer     | Technology                          |
| --------- | ----------------------------------- |
| Framework | Next.js 15 (App Router)             |
| UI        | React 19, Tailwind CSS 4, Radix UI  |
| Database  | PostgreSQL via Supabase              |
| ORM       | Drizzle ORM                          |
| Auth      | Supabase Auth                        |
| Language  | TypeScript                           |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Bun](https://bun.sh/) (package manager)
- A [Supabase](https://supabase.com/) project (provides PostgreSQL and auth)

### 1. Clone and install

```sh
git clone <repo-url>
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

This uses Drizzle Kit to create the `bids` table in your Supabase Postgres instance.

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
├── app/                    # Next.js App Router pages and routes
│   ├── auth/callback/      # OAuth redirect handler
│   ├── bids/               # Bid list, create, and detail pages
│   ├── login/              # Login page
│   └── signup/             # Signup page
├── components/
│   ├── ui/                 # Reusable UI components (shadcn/Radix)
│   └── nav-auth.tsx        # Header auth controls
├── db/
│   ├── schema.ts           # Drizzle table definitions
│   └── index.ts            # Database client
└── lib/
    ├── actions.ts          # Server actions (auth, bid CRUD)
    ├── store.ts            # Data access layer
    └── supabase/           # Supabase client helpers and middleware
docs/
├── product-plan.md         # Market analysis and phased product plan
├── build-plan.md           # MVP implementation roadmap
└── eagleview-integration-plan.md
```
