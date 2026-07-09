---
name: verify
description: How to runtime-verify Mercer changes — build/launch/login/drive recipe for this repo.
---

# Verifying Mercer

## Launch
- `bun run dev` — Next.js dev server. Port 3000 is often taken; it falls back to 3001. Check the task output for the actual port.
- Needs `.env.local` (DATABASE_URL, Supabase keys, ANTHROPIC_API_KEY). Supabase project `mgytgrxpgjhowvvustry` auto-pauses on inactivity — "tenant not found" from the pooler means restore it in the dashboard first.

## Test login (never drive real users' data)
- Dev user: `claude-test+phase-a@mercer.dev`. Password not stored; reset it directly in `auth.users`:
  `update auth.users set encrypted_password = crypt('<pw>', gen_salt('bf')) where email = 'claude-test+phase-a@mercer.dev'`
- A fresh session may hit `/onboarding` — click "Skip for now" (may take two clicks).

## DB access for setup/assertions
- Direct postgres via DATABASE_URL (pattern: copy `scripts/apply-manual-migrations.ts` env-loading preamble).
- Gotchas: orgs table is `accounts` (those are PM companies, not tenants); data is scoped by `user_id` on each table; `proposals` has no status column — acceptance lives on `proposal_shares`; check constraints on `price_list_items` use `PRICE_LIST_CATEGORIES` and `PRICING_UNITS` from `src/lib/status-meta.ts` (`sf`/`lf`, not `sqft`).
- Manual migrations: apply one file at a time (bulk runner breaks — see worklog 021 note).

## Drive (Playwright)
- `bunx playwright` v1.61+ works; install `playwright` into the scratchpad (`bun add playwright`) — also add `dotenv postgres` there since a scratchpad package.json shadows the repo's node_modules.
- Quote review table cells are click-to-edit: click the cell (`button[title="Click to edit"]`), then fill the focused input, press Enter.
- "Why" on a quote line is an inline drawer toggle, not a popover.
- Public portal accept button stays disabled until the name input is filled.
- Quote generation with a real ANTHROPIC_API_KEY takes ~30–90s; poll page text for "Approve".

## Flows worth driving
- Quote engine: bid page → scope + photo upload (`input[type=file]` in the Quote card) → Build quote → edit lines → Approve & generate → share link is `/p/<proposal_shares.id>` → accept as anonymous context → `/bids` Quote column.
