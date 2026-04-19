# AGENTS.md

This file keeps human contributors and AI agents aligned on Mercer.

## Project Snapshot

- Product: Mercer, a lead-to-close sales platform for exterior renovation contractors.
- Current stack: Next.js 16 (App Router), React 19, Tailwind 4, Supabase, Drizzle, Zod.
- Current focus: finish remaining MVP gaps after Phase C and D.

## Source Of Truth

- **Product requirements and vision: `docs/prd.md`.** Strategy, positioning, full scope, milestones, and AI principles.
- **Execution tracker (shipped / open / paused / decisions): `docs/plan.md` → "Active work".** Single source of truth for current engineering status. Do not duplicate status across docs.
- Session-by-session log: `docs/worklog.md`.
- This operating guide: `AGENTS.md`.
- Database schema: `src/db/schema.ts`. Manual migrations: `drizzle/manual/*.sql`.

If this file and another doc conflict, update the docs in the same PR and call it out.

## Team Workflow (Two Contributors)

1. Keep one primary priority at a time. Pull it from `docs/plan.md` → "Active work → Open now."
2. Start each session by reading `AGENTS.md`, then `docs/plan.md` → "Active work" (and skim `docs/prd.md` when the change touches product scope).
3. Before coding, state:
   - what you are changing
   - why now
   - which roadmap checkbox it maps to (quote the line from `docs/plan.md`)
4. When a checkbox flips, update `docs/plan.md` in the same PR. Move the item out of "Open now" into "Shipped" (and adjust the PRD alignment table if the capability meaningfully changed).
5. End each working block with a handoff note (template below).

## Handoff Template (Required)

Use this exact shape in PR description or session handoff note:

- Context: what problem this change addresses
- Done: shipped behavior and files touched
- Verification: commands run and result
- Open: known gaps or follow-ups
- Next 1-3: concrete next actions

## Definition Of Done

A task is not done unless all applicable items pass:

- Typecheck: `bunx tsc --noEmit`
- Lint: `bun run lint` (warnings allowed only if already known and documented)
- Build: `bun run build`
- Data changes include migration in `drizzle/manual/`
- `docs/plan.md` is updated when roadmap status changes

## Database Change Rules

- Never change schema without adding a manual migration SQL file.
- Use additive migrations by default; avoid destructive changes.
- Validate ownership checks for cross-entity links (`user_id` boundaries).
- For status propagation logic, keep lead and bid status transitions explicit.

## Routing And Auth Rules

- Public proposal URLs must stay accessible without auth.
- Protected app pages must remain behind auth checks.
- Keep proxy logic in `src/proxy.ts` (do not reintroduce `src/middleware.ts`).

## UX Consistency Rules

- Preserve existing shadcn patterns and component style.
- Maintain table/card dual view behavior where implemented.
- For new workflow state, favor explicit status badges and lightweight text feedback.

## Agent Execution Rules

- Do not commit unless explicitly asked.
- Do not revert unrelated local changes.
- After substantial edits, run typecheck and build at minimum.
- When a plan checkbox is completed, update `docs/plan.md` in the same change.

## Suggested Session Bootstrap Prompt

Use this at the top of a new AI session:

"Read `AGENTS.md`, then `docs/plan.md` → 'Active work'. Summarize the live state (shipped, open, paused, decisions needed) in 6 bullets max, pick the highest-leverage item from 'Open now', and implement it with verification. Update the matching checkbox in `docs/plan.md` in the same PR."

