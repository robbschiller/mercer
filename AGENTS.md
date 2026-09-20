# AGENTS.md

This file keeps human contributors and AI agents aligned on Mercer.

## Project Snapshot

- Product: Mercer, a lead-to-close sales platform for commercial multifamily exterior renovation contractors. Standalone business; Affordable Quality Painting (AQP) is the first paying customer on production. A rename to Renobase is under consideration and undecided; do not rename anything until it is.
- Current stack: Next.js 16 (App Router), React 19, Tailwind 4, Supabase, Drizzle, Zod.
- Current focus: finish remaining MVP gaps after Phase C and D.

## Source Of Truth

- **Product requirements and vision: `docs/prd.md`.** Strategy, positioning, full scope, milestones, and AI principles.
- **Execution tracker (shipped / open / paused / decisions): `docs/plan.md` → "Active work".** Single source of truth for current engineering status. Do not duplicate status across docs.
- Session-by-session log: `docs/worklog.md`.
- This operating guide: `AGENTS.md`.
- Database schema: `src/db/schema.ts`. Manual migrations: `drizzle/manual/*.sql`.
- Design tokens, components and page patterns: `docs/design-system.md` (with a
  rendered canvas linked at the top).

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
- UI changes use design tokens, not raw hexes or palette classes (see
  "UI And Design System Rules"), and `docs/design-system.md` is updated when
  a token, a chrome component or a page pattern changes

## Database Change Rules

- Never change schema without adding a manual migration SQL file.
- Use additive migrations by default; avoid destructive changes.
- Validate ownership checks for cross-entity links (`user_id` boundaries).
- For status propagation logic, keep lead and bid status transitions explicit.

## Routing And Auth Rules

- Public proposal URLs must stay accessible without auth.
- Protected app pages must remain behind auth checks.
- Keep proxy logic in `src/proxy.ts` (do not reintroduce `src/middleware.ts`).

## UI And Design System Rules

**Source of truth: `docs/design-system.md`.** Tokens live in
`src/app/globals.css`; the canvas of foundations, components and patterns is
the Mercer Design System artifact linked from that doc. If the code and the
doc disagree, the code wins: fix the doc in the same PR.

### The three layers

Build downward, never sideways. A component may import from the layer below
it, never from the layer above.

1. `src/components/ui/*` — shadcn/Radix primitives. Styling only, no product
   knowledge. Add one only when shadcn ships it; do not invent a primitive
   when one of these fits.
2. `src/components/chrome/*` — page chrome: `PageContainer`, `PageHeader`,
   `BackLink`, `PageError`, `PageNotice`, `Segmented`, `TableControls`,
   `ActiveFilters`, `FilterMenu`, `SortableHeader`, `SearchForm`,
   `ResultSummary`, `TableFrame`, `Pagination`, `EmptyState`. One concern per
   file, re-exported from `@/components/chrome`. Import from there, not from
   the file.
   `src/components/page-chrome.tsx` is a deprecated re-export kept so old
   pages compile; do not add imports to it.
3. `src/components/*` — feature components, which own product behaviour.

### Page composition

Index pages: `PageContainer` → `PageHeader` (with `eyebrow`) →
`TableControls` → `ActiveFilters` → `TableFrame` → `Pagination`. Child pages swap the eyebrow for `back` and add the record's
status `badge`. Every list row carries its ONE next action inline. A number
you cannot act on belongs on Reports.

**Table controls.** Two controls above a table and no more: a search field
and one `FilterMenu`. Every filter goes in that menu, status included, and
whatever is applied comes back out as `ActiveFilters` chips. **Sort belongs
on the column header** (`SortableHeader`), and only on columns a server order
already backs; every other header stays a plain span. **Never put a
`<select>` of user data in the bar**, because its width is its longest option
and real data wraps the row. That also means no Apply button: menu options
are links and apply on click. Full rules in `docs/design-system.md` §3.1.1
and §3.1.2.

### Tokens, not values

- **Never write a raw hex or a Tailwind palette class** (`text-emerald-700`,
  `bg-blue-600`) for status. Use `success`, `warning`, `info`, `destructive`.
  Each has `-foreground` (tinted text, flips for dark on its own, so no
  `dark:` variant is needed) and `-soft` (the surface fill).
  `success` = won/accepted/on file. `warning` = verify/overdue/low
  confidence. `info` = live/unread/viewed. Near-black `primary` is the
  action color.
- The one exception is **categorical** hue (avatar initials, pipeline stage
  dots in `pipeline/page.tsx` and `contacts/page.tsx`), where the palette
  class IS the meaning. Leave those alone.
- `--color-amber` and the parchment/ink tokens are the **marketing and auth**
  brand, plus the `amber` Button variant. Not for routine in-app actions.
- **Never write `text-[13.5px]`.** The app scale is named: `text-2xs`
  (column heads), `text-caption` (eyebrow labels), `text-xs`, `text-ui`
  (dense/money), `text-body` (descriptions, chips, toolbars), `text-sm`
  (default), `text-base`, `text-title` (page h1).
- Radii: `rounded-control` (9px, segmented rails), `rounded-chip` (10px,
  chips/search/selects), `rounded-card` (16px, table frames, empty states),
  plus the shadcn `sm/md/lg/xl`. Elevation is `shadow-card` and
  `shadow-card-hover`; cards rest almost flat.
- Money and counts always get `tabular-nums`, usually `font-mono`.

### React practice

- Server Components by default. Add `"use client"` only for state, effects,
  event handlers or browser APIs, and push it to the smallest leaf.
- Mutations are server actions plus `<SubmitButton>`; validation is
  server-side Zod in `src/lib/validations.ts`. Failures redirect back with
  `?error=` and render through `PageError`, never a toast.
- Status labels and Badge variants come from `src/lib/status-meta.ts`
  (`leadStatusVariant`, `bidStatusLabel`, …). Never hand-pick a badge colour.
- Real elements only: `<button>`, `<a href>`, `<input>` with a `<label>`.
  No `onClick` on a div. `aria-label` on icon-only buttons. Colour is never
  the only signal — pair a tone with a label or an icon.
- Icons are `lucide-react` at `size-4` (`size-3.5` in chips). Compose class
  names with `cn()`; use `cva` when a component has real variants.
- Keep a feature component under ~400 lines. Past that, split the sections
  into siblings rather than growing the file.

### Still true

- Maintain table/card dual view behavior where implemented.
- For new workflow state, favor explicit status badges and lightweight text
  feedback.

## Agent Execution Rules

- Do not commit unless explicitly asked.
- Do not revert unrelated local changes.
- After substantial edits, run typecheck and build at minimum.
- When a plan checkbox is completed, update `docs/plan.md` in the same change.

## Suggested Session Bootstrap Prompt

Use this at the top of a new AI session:

"Read `AGENTS.md`, then `docs/plan.md` → 'Active work'. Summarize the live state (shipped, open, paused, decisions needed) in 6 bullets max, pick the highest-leverage item from 'Open now', and implement it with verification. Update the matching checkbox in `docs/plan.md` in the same PR."

