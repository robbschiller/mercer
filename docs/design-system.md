# Mercer Design System

Source of truth for visual and interaction design in the product app. Derived
from the code, not aspirational. **If this file and the code disagree, the
code wins — update this file in the same PR.** The operating rules an agent
must follow are the condensed version in `AGENTS.md` → "UI And Design System
Rules"; this file is the reference behind them.

**Canvas:** <https://claude.ai/artifact/Gfic75uS9MfDDUgV2FYhy1> — the
foundations, components and patterns drawn as three artboards. It renders the
real token values, so it is the fastest way to see what a tone or a size
actually looks like. Private to Robb unless shared.

**Scope.** The product app under `src/app/(app)/*` is a shadcn/Radix app on
neutral oklch greys with three status tones. The marketing surface
(`(marketing)/*`) shares the brand palette but owns its own typographic and
grid motifs (`bg-grid-ink`, `bg-grid-parchment`, `hero-vignette`, `.kicker`,
`.font-display-editorial`). Auth (`(auth)/*`) sits between them.

---

## 1. Architecture: three layers

Build downward. A component may import from the layer below it, never above.

| Layer | Path | Owns | Rule |
|---|---|---|---|
| 1. Primitives | `src/components/ui/*` | Styling, a11y, Radix behaviour | No product knowledge. Add one only when shadcn ships it. |
| 2. Chrome | `src/components/chrome/*` | Page structure shared by every section | One concern per file. Import from `@/components/chrome`. |
| 3. Features | `src/components/*` | Product behaviour and data | Composes layers 1 and 2. |

### 1.1 Primitives

`alert` · `avatar` · `badge` · `breadcrumb` · `button` · `calendar` · `card` ·
`command` · `dialog` · `dropdown-menu` · `input` · `label` · `password-input` ·
`popover` · `select` · `separator` · `sheet` · `sidebar` · `skeleton` ·
`sortable` · `table` · `textarea` · `tooltip`

Do not invent a new primitive when one of these fits.

### 1.2 Chrome

| Export | File | Purpose |
|---|---|---|
| `PageContainer` | `page-container.tsx` | Page frame. `wide` = 1240 (tables), `narrow` = 860 (forms). |
| `PageHeader`, `BackLink` | `page-header.tsx` | Eyebrow or back link, title, status badge, description, actions. |
| `PageError`, `PageNotice` | `page-feedback.tsx` | Inline `?error=` / `?notice=` banners. |
| `Segmented`, `SegmentedLink` | `segmented.tsx` | View or time-window toggle. |
| `TableControls` | `table-controls.tsx` | **The control bar above a table.** Search, filters and sort left; view toggle and count right. |
| `ActiveFilters` | `table-controls.tsx` | Removable chips echoing whatever the filter menu has applied. |
| `FilterMenu` | `table-menu.tsx` | Every filter, status included, collapsed into one menu. Client leaf; its options are links. |
| `SortableHeader` | `sortable-header.tsx` | A column header that sorts. Sort lives here, never in the control bar. |
| `FilterChipRow`, `FilterChip` | `filter-chips.tsx` | A stage rail. **Superseded** on tables by the Status group inside `FilterMenu`; still used by Projects. |
| `Toolbar`, `SearchForm`, `ToolbarSelect`, `ResultSummary` | `toolbar.tsx` | `SearchForm` and `ResultSummary` feed `TableControls`. `Toolbar` and `ToolbarSelect` are superseded by `TableControls` and `FilterMenu`. |
| `TableFrame`, `TABLE_HEAD_CELL`, `TABLE_HEAD_ROW` | `table-frame.tsx` | Rounded card around a table or grid list. |
| `Pagination` | `pagination.tsx` | Prev/next plus the range readout. |
| `EmptyState` | `empty-state.tsx` | Icon tile, title, one sentence, the ways forward. |

All are Server Components except `table-menu.tsx`, which is a client leaf
because Radix has to own focus, Escape and click-outside. Its options are
still ordinary links, so a filtered URL stays shareable and the back button
steps through filter history. `SortableHeader` is a link too, for the same
reason.

`src/components/page-chrome.tsx` is a **deprecated** re-export kept so existing
pages compile. Do not add imports to it; migrate a page to
`@/components/chrome` when you next touch it.

### 1.3 Feature components

Keep a feature component under roughly 400 lines. Past that, split its sections
into siblings rather than growing the file. The current outliers
(`new-lead-intake`, `quote-engine`, `property-profile`) predate this rule and
are the standing candidates for a split.

---

## 2. Tokens

All tokens live in `src/app/globals.css` and reach Tailwind through
`@theme inline`. Reference by role, never by value.

### 2.1 Semantic color

shadcn neutrals in oklch: `background`, `foreground`, `card`,
`card-foreground`, `popover`, `primary`, `primary-foreground`, `secondary`,
`muted`, `muted-foreground`, `accent`, `destructive`, `border`, `input`,
`ring`. Light mode is a white ground with near-black text; dark mode inverts
and lifts `card` off `background`.

The sidebar owns a parallel set (`--sidebar`, `--sidebar-foreground`,
`--sidebar-accent`, `--sidebar-border`, …). Use `bg-sidebar`, not
`bg-background`, on sidebar surfaces.

### 2.2 Status tones

Three tones, each with three tokens. **These replaced the raw
`emerald`/`amber`/`blue` palette classes across the app** — their values are
Tailwind's own oklch, so the swap was pixel-identical.

| Tone | Means | Fill | Text | Surface |
|---|---|---|---|---|
| `success` | won · accepted · on file | `bg-success` | `text-success-foreground` | `bg-success-soft` |
| `warning` | verify · overdue · low confidence | `bg-warning` | `text-warning-foreground` | `bg-warning-soft` |
| `info` | live · unread · viewed | `bg-info` | `text-info-foreground` | `bg-info-soft` |
| `destructive` | failure · irreversible action | `bg-destructive` | `text-destructive` | `bg-destructive/10` |

`-foreground` already flips for dark mode, so **never pair it with a `dark:`
variant**. Borders take an opacity modifier: `border-success/30`.

Near-black `primary` is the action color. A tone is a signal, not decoration.

### 2.3 Categorical color

Avatar initials and pipeline stage dots use raw palette classes
(`bg-violet-600`, `bg-cyan-600`, `bg-rose-600`, `bg-amber-600`) in
`contacts/page.tsx`, `contacts/[id]/page.tsx`, `pipeline/page.tsx` and
`leads/page.tsx`. Here the hue **is** the meaning — it distinguishes items
rather than ranking them. This is the one sanctioned exception to "no palette
classes"; do not convert these to status tones.

### 2.4 Brand palette

`--color-amber` `#e85d23` (and `--color-amber-soft`), `--color-blueprint`,
`--color-parchment`, `--color-parchment-soft`, `--color-ink`. These are the
marketing and auth brand, plus the `amber` Button variant. Reach for amber
when a screen needs one brand moment (auth CTA, marketing hero). Not for
routine in-app actions.

### 2.5 Typography

Loaded in `src/app/layout.tsx`.

| Stack | Font | Use |
|---|---|---|
| `font-sans` | Geist | Everything in the product app |
| `font-mono` | JetBrains Mono | Numerals, money, `kbd`, marketing kickers |
| `font-display` | Fraunces | Marketing headlines, auth titles |
| `.font-serif-brand` | Instrument Serif | The sidebar wordmark, nothing else |

**The app scale is named. Never write `text-[13.5px]` again.**

| Token | Size | Use |
|---|---|---|
| `text-2xs` | 10.5px | Table column heads, micro-labels (uppercase, `tracking-[0.06em]`) |
| `text-caption` | 11px | Eyebrow field labels, counts (uppercase, `tracking-[0.05em]`) |
| `text-xs` | 12px | Helper text, sublines, result meta |
| `text-ui` | 13px | Dense UI copy, money in rows |
| `text-body` | 13.5px | Page descriptions, filter chips, toolbar controls |
| `text-sm` | 14px | **The app default**: rows, buttons, labels, dialogs |
| `text-base` | 16px | Card titles |
| `text-xl` | 20px | Empty-state titles |
| `text-title` | 27px | Page `h1` (`font-semibold tracking-tight`, `lh 1.25`) |

Money and counts always carry `tabular-nums`, usually `font-mono`.

### 2.6 Radius and elevation

| Token | Value | Use |
|---|---|---|
| `rounded-sm/md/lg/xl` | 4 / 6 / 8 / 12px | shadcn scale. Buttons, inputs and badges are `md`; `Card` is `xl`. |
| `rounded-control` | 9px | Segmented rails, sidebar tool buttons |
| `rounded-chip` | 10px | Filter chips, search input, toolbar selects |
| `rounded-card` | 16px | Table frames, empty states, list cards |
| `rounded-full` | — | Status pills, avatars, dots |

`shadow-card` (`0 1px 2px rgb(0 0 0 / .04)`) at rest, `shadow-card-hover` on
interactive cards. Both darken in dark mode. Cards rest almost flat.

### 2.7 Spacing

Tailwind's default scale. The shapes every page shares:

- Page frame: `max-w-[1240px] px-6 pt-7 pb-24` (narrow: `max-w-[860px]`)
- Header → chips → toolbar: `mb-5`, `mb-4`, `mb-3`
- Controls: `h-9` default, `h-8` small, `h-7` segment
- Table row: `py-3 pl-4 pr-10`, `gap-x-2.5`
- Sheet: `px-6 py-5` header, `p-6` body, `px-6 py-4` footer, `gap-5` fields

---

## 3. Page patterns

### 3.1 Index page

```tsx
<PageContainer>
  <PageHeader eyebrow={{ icon, label }} title="Leads" description="…"
              actions={<>…</>} />
  <PageError message={error} />
  <TableControls view={<Segmented>…</Segmented>} summary={<ResultSummary … />}>
    <SearchForm action="/leads" q={q} placeholder="Search leads…" hidden={{…}} />
    <FilterMenu activeCount={n}
                groups={[{ label: "Status", options }, { label: "Source", … }]} />
  </TableControls>
  <ActiveFilters items={…} clearHref={…} />
  <TableFrame minWidth="min-w-[940px]">
    {/* sortable columns only; the rest stay TABLE_HEAD_CELL spans */}
    <SortableHeader label="Follow-up" href={…} direction="asc" />
  </TableFrame>
  <Pagination page={page} limit={limit} total={total} hrefFor={…} />
</PageContainer>
```

### 3.1.1 What goes where in the control bar

This is the part that decays fastest, so the rule is explicit. **Two
controls sit above the table and no more: a search field and one filter
menu.** Sort is not one of them.

| Control | Where | Why |
|---|---|---|
| Free text | Search field, always visible | The one control people reach for without looking. |
| Every filter, status included | Inside `FilterMenu` | One menu, grouped. Status is the first group and keeps its dot and count. |
| Sort | On the column header | It belongs next to the data it orders, not in a control that names columns from a distance. |
| View mode | `Segmented`, right side | Only when there are two or three modes and it changes the row shape. |
| Applied filters | `ActiveFilters` chips | Nothing may filter the table invisibly. |

Five rules the pattern enforces:

1. **Never put a `<select>` of user data in the bar.** Its width is its
   longest option, so real data stretches the row and wraps everything after
   it. This is what broke the leads bar at 313 properties. Options belong in
   a menu, which is a fixed width.
2. **No Apply button.** Every option is a link, so the filter applies on
   click. An Apply button is the tell that a `<select>` is in the bar.
3. **The trigger carries the state.** `FilterMenu` shows a count when
   filters are applied.
4. **Whatever the menu hides, `ActiveFilters` shows.** A filtered table
   always says so on the surface, and each filter lifts off in one click.
5. **A header sorts only where a server order already backs it.** Everything
   else stays a plain `TABLE_HEAD_CELL` span. A header that cannot sort must
   never look like it can.

### 3.1.2 Sortable columns

`SortableHeader` takes the current `direction` for its column (`"asc"`,
`"desc"`, or null when another column is sorted) and the `href` a click goes
to. At rest an unsorted column shows **no arrow**; a two-way arrow appears on
hover and on keyboard focus, which is the only hint the header is
interactive. The arrow reads in the column's own terms, so ascending on a
date column means soonest first.

Where the query has a reverse order, clicking the sorted column flips it.
Where it does not, a second click is a no-op rather than an invented order.

| Page | Sortable columns | Notes |
|---|---|---|
| Leads | Follow-up, Last contact (by property); Follow-up, Age (by contact) | Last contact toggles; its ascending order is what "Stalest" used to be. |
| Opportunities | Opportunity, Total, Age | Age toggles newest against stalest. |
| Lists | List, People, Converted, Uploaded | Everything but Source. |

On a real `<table>` (Lists) the `<th>` also carries `aria-sort`. The
grid-based tables have no table semantics to hang it on, so the link's
accessible name states the direction instead.

Row anatomy: primary cell is a `text-sm font-semibold` name link over a
`text-xs text-muted-foreground` subline; money is `font-mono text-ui
tabular-nums`; age is `font-mono text-xs tabular-nums`, turning
`text-warning-foreground font-semibold` when overdue; status is a pill with a
tone dot. **Every row carries its ONE next action inline**, and a hover-only
open arrow floats at the right edge.

### 3.2 Child page

Same frame, but `PageHeader` takes `back={{ href, label }}` instead of
`eyebrow`, the record's name as `title`, and a status `badge` beside it.

### 3.3 Empty state

`EmptyState` — one icon tile, a title, one sentence, and the two ways forward.
Never an empty table with a header.

### 3.4 Sheet

`Sheet` from the right, `side="right" className="w-full sm:max-w-md gap-0 p-0"`.
Header `px-6 py-5 border-b`, body `flex-1 overflow-y-auto p-6`, footer
`px-6 py-4 border-t flex-row justify-end gap-2`. Fields `flex flex-col gap-5`.

### 3.5 Collapsible sections

Heavy detail pages use `CollapsibleSection`: icon, title, one-line summary that
says what is done without expanding. Auto-expand a section that is empty or
incomplete.

### 3.6 App shell

`SidebarProvider` → `AppSidebar` → `SidebarInset` → `AppShellHeader`. There is
**no breadcrumb bar** — the sidebar names the page. Per-page actions portal to
the top-right through `PageHeaderActions`; the notifications bell sits beside
them. The sidebar is `collapsible="icon"` and its collapse trigger lives in the
brand row.

---

## 4. React and forms

- **Server Components by default.** Add `"use client"` only for state,
  effects, event handlers or browser APIs, and push it to the smallest leaf.
- Mutations are server actions: `<form action={someAction}>` plus
  `SubmitButton` (which reads `useFormStatus` for the pending state).
- Validation is server-side Zod in `src/lib/validations.ts`. On failure the
  action redirects back with `?error=` and the page renders `PageError`. No
  toasts.
- Status labels and Badge variants come from `src/lib/status-meta.ts`
  (`leadStatusLabel`, `bidStatusVariant`, `invoiceStatusVariant`, …). The enum
  arrays there are the same ones the Drizzle schema and the Zod validators
  derive from, so the three layers cannot drift. **Never hand-pick a badge
  colour.**
- Compose class names with `cn()`. Use `cva` when a component has real
  variants; a one-off conditional does not need it.
- Confirmation states render in the same card slot as the form. Do not
  navigate away.

---

## 5. Iconography and motion

Lucide is the only icon library: `import { Plus } from "lucide-react"` at
`size-4` (`size-3.5` inside chips and pills, `size-6` in empty-state tiles).
Icons inside a button inherit `text-muted-foreground` and go `text-foreground`
on hover.

Motion is shadcn's defaults: `transition-colors` for hover, Radix's own
cubic-bezier for sheets and dialogs. Buttons take `active:translate-y-px`.
Nothing animates on load except skeletons.

---

## 6. Accessibility

- Real elements only: `<button>`, `<a href>`, `<input>` paired with a
  `<label>`. No `onClick` on a div or span — Tab skips it.
- `aria-label` on icon-only buttons; `aria-current="page"` on the active
  filter chip, segment and nav item; `aria-hidden` on decorative dots and
  icon tiles.
- `role="alert"` on `PageError`, `role="status"` on `PageNotice`.
- Colour is never the only signal. A tone is always paired with a label or an
  icon.
- Text holds 4.5:1 (3:1 at 24px+). The tokens that fail this most easily are
  caption grey on a tinted surface and white on a `-soft` fill — use
  `-foreground` on `-soft`, never the bare tone.
- Sheets and dialogs close on Esc, overlay click and X via Radix. Do not roll
  your own.

---

## 7. Don'ts

- No raw hex in a component. Add a token to `globals.css` instead.
- No Tailwind palette class for status (`text-emerald-700`, `bg-blue-600`).
  Use a tone. The categorical avatar and stage hues in §2.3 are the only
  exception.
- No `dark:` variant paired with a `-foreground` token — it already flips.
- No arbitrary type size (`text-[13.5px]`). The scale in §2.5 is named.
- No new imports from `src/components/page-chrome.tsx`.
- No system fonts. The four families above are the only typefaces.
- No manual `dark` class — `ThemeProvider` (next-themes) owns it.
- No new Sheet-like primitive. Use `ui/sheet.tsx` with the house styling.

---

## 8. Where to look

| Looking for | Read |
|---|---|
| Every token | `src/app/globals.css` |
| Font setup | `src/app/layout.tsx` |
| App shell | `src/app/(app)/layout.tsx`, `src/components/app-sidebar.tsx` |
| Primitives | `src/components/ui/*` |
| Page chrome | `src/components/chrome/*` |
| Status labels and variants | `src/lib/status-meta.ts` |
| A canonical index page | `src/app/(app)/leads/page.tsx` |
| A canonical detail page | `src/app/(app)/opportunities/[id]/page.tsx` |
| A canonical auth page | `src/app/(auth)/login/page.tsx` |
