# Mercer Design System

Source of truth for visual + interaction design across the app. Derived from the actual code — not aspirational. When this file and the code disagree, the code wins; update this file in the same PR.

> **Scope.** The product app under `src/app/(app)/*` is a shadcn / Radix dark+light themed app on a parchment palette. The marketing surface (`(marketing)/*`) shares the brand palette but uses its own typographic and grid motifs (`bg-grid-ink`, `bg-grid-parchment`, `hero-vignette`, `.kicker`, `.font-display-editorial`) layered on top of these tokens. Auth (`(auth)/*`) sits between them — parchment background, shadcn forms.

---

## 1. Tokens

All tokens live in `src/app/globals.css` and resolve to Tailwind utilities via `@theme inline`.

### 1.1 Color (light → dark)

shadcn-style semantic tokens. Always reference by role, never raw color.

| Role | Light | Dark | Tailwind |
|---|---|---|---|
| `background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | `bg-background` |
| `foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | `text-foreground` |
| `card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | `bg-card` |
| `card-foreground` | inherits foreground | inherits foreground | `text-card-foreground` |
| `popover` / `popover-foreground` | matches `card` | matches `card` | `bg-popover` |
| `primary` | near-black `oklch(0.205 0 0)` | near-white `oklch(0.985 0 0)` | `bg-primary` |
| `primary-foreground` | near-white | near-black | `text-primary-foreground` |
| `secondary` | light grey `oklch(0.965 0 0)` | dark grey `oklch(0.269 0 0)` | `bg-secondary` |
| `muted` | same as secondary | same as secondary | `bg-muted` |
| `muted-foreground` | mid-grey `oklch(0.556 0 0)` | light-grey `oklch(0.708 0 0)` | `text-muted-foreground` |
| `accent` | same as secondary | same as secondary | `bg-accent` |
| `destructive` | red `oklch(0.577 0.245 27.325)` | red `oklch(0.704 0.191 22.216)` | `bg-destructive` |
| `border` | `oklch(0.922 0 0)` | translucent white 10% | `border` |
| `input` | matches border | translucent white 15% | (used by inputs) |
| `ring` | mid-grey | mid-grey | focus ring |

**Sidebar** has its own tokens — `--sidebar`, `--sidebar-foreground`, `--sidebar-accent`, `--sidebar-primary`, etc. Light mode uses near-white sidebar; dark mode uses the same ink-near-black as background. Don't reuse `--background` for sidebar surfaces; use `bg-sidebar`.

### 1.2 Brand palette (marketing + accent moments)

Exposed inside `@theme inline` so they're available as Tailwind classes app-wide:

| Token | Hex | Use |
|---|---|---|
| `--color-ink` | `#0b0c0e` | Marketing dark surfaces, deep ink text |
| `--color-ink-soft` | `#15171a` | Secondary ink fields |
| `--color-ink-border` / `--color-ink-rule` | rgba whites at 8% / 14% | Borders on ink surfaces |
| `--color-parchment` | `#efeae0` | Marketing/auth background warmth |
| `--color-parchment-soft` | `#f6f2e9` | Cards and panels on parchment |
| `--color-parchment-border` | rgba(11,12,14,0.1) | Borders on parchment |
| `--color-amber` | `#e85d23` | Primary brand accent — CTAs, kickers, glow |
| `--color-amber-soft` | `#f28a54` | Hover state of `amber`, destructive-on-dark |
| `--color-blueprint` | `#1e3a5f` | Cool accent — used in hero vignette only |

Reach for amber for "this is Mercer's brand moment" (CTAs on auth pages, the dashboard hero glow). Reach for parchment for warm surfaces. Otherwise use the semantic shadcn tokens above.

### 1.3 Radii

```
--radius-sm: 0.25rem    →  rounded-sm
--radius-md: 0.375rem   →  rounded-md
--radius-lg: 0.5rem     →  rounded-lg
--radius-xl: 0.75rem    →  rounded-xl
```

Cards default to `rounded-xl`. Buttons/inputs use `rounded-md`. Pills use `rounded-full`. Icon avatars in the sidebar use `rounded-md` (square-ish), user avatars use `rounded-full`.

### 1.4 Typography

Three Google fonts loaded in `src/app/layout.tsx`:

| Stack | Font | Use | Tailwind |
|---|---|---|---|
| `--font-sans` | **Geist** | Everything in the product app — body, UI, headings | `font-sans` (default) |
| `--font-display` | **Fraunces** (variable: SOFT, WONK, opsz) | Marketing display headlines, auth-page titles | `font-display` |
| `--font-mono` | **JetBrains Mono** | Marketing kickers (`§ 01 · workflow`), code | `font-mono` |

Marketing-specific utility `.font-display-editorial` opts into Fraunces' optical-size + SOFT + WONK axes for hero headlines. Don't use it for body text.

**Type scale used in the wild** (search the app to confirm):

| Use | Class |
|---|---|
| App-shell base body | `text-sm` (`14px`) — default for sidebar nav, button text, form labels |
| Page H1 (auth, settings) | `font-display text-3xl font-medium tracking-tight` |
| Dashboard hero greeting | `text-[2.125rem] leading-[1.15] font-semibold tracking-tight` |
| Card title | `text-base font-semibold` |
| Eyebrow / kicker | `text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground` (dashboard) or `.kicker` class (marketing) |
| Helper / hint | `text-xs text-muted-foreground` |
| Numeric values | add `tabular-nums` |

---

## 2. Layout

### 2.1 App shell

Lives in `src/app/(app)/layout.tsx` + `src/components/app-sidebar.tsx`.

- `SidebarProvider` + `AppSidebar` + `SidebarInset` + `AppShellHeader`
- Sidebar: `collapsible="icon"` — collapses to a thin icon rail. Collapse trigger is the panel-left icon inside `TeamSwitcher`, NOT a separate `SidebarTrigger` in the header.
- Top header bar (`AppShellHeader`) renders on every page **except `/dashboard`** (the welcome moment has no chrome) and holds breadcrumb + portal slot for per-page actions.
- Use `PageHeaderActions` (a portal target) for per-page top-bar buttons rather than passing them through layout props.

### 2.2 Page container patterns

| Pattern | Where | Class |
|---|---|---|
| **Centered narrow** — auth, dashboard, single-form pages | login, dashboard, settings forms | `container mx-auto max-w-2xl px-4 py-8` (or `max-w-[46rem]` for dashboard) |
| **Wide content** — lists, tables | leads, bids, projects, contacts | `container mx-auto px-4 py-8` |
| **Marketing hero** | `(marketing)/*` | full-bleed + `.bg-grid-*` + `.hero-vignette` + `.noise-overlay` |

Dashboard hero has a soft radial glow behind it: `radial-gradient(60rem 32rem at 50% -8rem, color-mix(in oklab, var(--primary) 18%, transparent), transparent 70%)`. Use `color-mix` against semantic tokens (not raw hexes) so the same hero works in light + dark.

### 2.3 Spacing

Tailwind's default scale. Common shapes:

- Card outer gap: `gap-6` between sibling cards in a page
- Card inner: `px-6 py-5` header, `px-6 py-4 sm:py-6` content
- Form field gap: `gap-4` inside a column form
- Inline label/control: `gap-1.5` or `gap-2`
- Sheet header/body/footer: `px-6` consistently, `py-5` header, `p-6` body, `py-4` footer

---

## 3. Components

### 3.1 Inventory

All in `src/components/ui/*` — shadcn defaults with light edits. **Do not invent a new primitive when one of these fits.**

`alert` · `avatar` · `badge` · `breadcrumb` · `button` · `calendar` · `card` · `command` · `dialog` · `dropdown-menu` · `input` · `label` · `password-input` · `popover` · `select` · `separator` · `sheet` · `sidebar` · `skeleton` · `sortable` · `table` · `textarea` · `tooltip`

### 3.2 Custom shells

Higher-level patterns above the shadcn primitives:

| Component | File | Purpose |
|---|---|---|
| `AppSidebar` | `app-sidebar.tsx` | The product nav shell |
| `TeamSwitcher` | `team-switcher.tsx` | Org switcher + sidebar collapse trigger (panel-left icon) |
| `NavUser` | `nav-user.tsx` | Footer user menu — theme switcher + sign out |
| `AppShellHeader` | `app-shell-header.tsx` | Per-page top bar (hidden on `/dashboard`) |
| `AppBreadcrumb` | `app-breadcrumb.tsx` | Path-derived crumbs; section labels live in `SECTION_LABELS` |
| `PageHeaderActions` | `page-header-actions.tsx` | Portal — child pages call this to inject top-bar buttons |
| `BidDetailSections` | `bid-detail-sections.tsx` | Collapsible 4-section pattern (Buildings → Access → Pricing → Proposals) |
| `BidSummary` | `bid-summary.tsx` | Property/client header on bid detail |
| `DashboardHero` / `DashboardActionPills` / `DashboardRecents` | `dashboard-*.tsx` | The welcome moment |
| `SubmitButton` | `submit-button.tsx` | Form submit w/ pending state — use this for server-action forms |
| `PasswordInput` | `ui/password-input.tsx` | Input w/ eye-toggle for password fields |

### 3.3 Button variants

From `ui/button.tsx`. Default = filled primary (near-black on light, near-white on dark). Variants in use across the app:

| Variant | When | Example |
|---|---|---|
| `default` | Primary action on a page | "Generate proposal", "Save contact" |
| `outline` | Secondary nav / "view all" / cancel | "View leads →", sheet Cancel |
| `ghost` | Tertiary, low-vis, often paired with icon | breadcrumb back, sidebar menu items |
| `destructive` | Irreversible destructive actions | "Delete bid" |
| `amber` *(custom)* | Brand-moment CTAs on parchment surfaces | "Sign in", "Send reset link" |

The custom **`amber`** variant lives in `submit-button.tsx`'s class composition — it gives the warm orange glow used on auth pages. Use it sparingly (auth, onboarding, the marketing hero) — not on routine in-app actions.

### 3.4 Slide-over `Sheet` pattern

The dashboard action pills, bid edit drawers, and lead detail panels all use `Sheet` from the right. House style:

- `side="right"`, `className="w-full sm:max-w-md gap-0 p-0"` to override the default narrow width and remove the default gap (we manage padding ourselves).
- `SheetHeader` w/ `px-6 py-5 border-b`, `SheetFooter` w/ `px-6 py-4 border-t flex-row justify-end gap-2`.
- Body is `flex-1 overflow-y-auto p-6`.
- Forms inside sheets use `flex flex-col gap-5` for fields.

### 3.5 Collapsible section pattern (heavy detail pages)

Used on `/bids/[id]`. Each section: icon + title + one-line summary, click to expand. Summary string surfaces "what's done / not done" without expanding. The bid page auto-expands a section if it's empty / incomplete. This pattern is reusable — wrap in `CollapsibleSection` from `components/collapsible-section.tsx`.

### 3.6 Status badges

`badge.tsx` + helpers in `src/lib/status-meta.ts` (`leadStatusLabel`, `bidStatusVariant`, etc.). **Never hand-pick a badge color** — always go through these helpers so all status surfaces stay in sync.

---

## 4. Forms

- Server-action forms. `<form action={someAction}>` + `SubmitButton`.
- Inputs from `ui/input.tsx`. Labels from `ui/label.tsx` — always pair `<Label htmlFor>` with an `id` on the input.
- Password fields use `PasswordInput` (eye-toggle baked in).
- Validation is **zod, server-side** (`src/lib/validations.ts`). On failure the action redirects back with `?error=…`.
- Error display: a single `<p className="mb-4 text-sm text-destructive dark:text-[var(--color-amber-soft)]">{error}</p>` block above the form.
- Confirmation / "we sent you an email" states render in the same card slot as the form (don't navigate away).

---

## 5. Iconography

**Lucide-react** is the single icon library. Always:

```tsx
import { Plus } from "lucide-react";
<Plus className="size-4" />
```

Don't use the `<i data-lucide="...">` web pattern from designs (that's the prototype) — translate to the React import.

Common sizes: `size-3.5` (pill chips), `size-4` (most UI), `size-[17px]` (recents row, send button), `size-5` (sidebar collapsed). Lucide icons inside `<button>` get `text-muted-foreground` by default and `text-foreground` on hover — match this.

---

## 6. Motion

- shadcn defaults — `transition-colors` / `transition-opacity` `.15s` for hover, `.2s` for focus/box-shadow.
- Sheet slide-over: Radix default cubic-bezier, ~250ms.
- Buttons get `active:translate-y-px` on press for tactile feedback (used on the dashboard pills).

---

## 7. Accessibility

- Every interactive thing has a `<button>` or `<a>` (or `role="button" tabIndex={0}` with keyboard handlers when nested-button HTML would be invalid — see the team switcher's collapse icon).
- `aria-label` on icon-only buttons.
- `aria-live="polite"` on async status text under the composer.
- `Sheet` close on Esc, overlay click, X — all wired by Radix; don't roll your own.
- Color is never the only signal — pair with text or icon (e.g. status badges have a label + a variant).

---

## 8. Don'ts

- Don't import a raw hex into a component. Add to `globals.css` or use a semantic token.
- Don't use system fonts. The three Google fonts above are the only typefaces.
- Don't add the `dark` class manually — the `ThemeProvider` (`next-themes`) handles it.
- Don't create a new `Sheet`-like primitive. Use `ui/sheet.tsx` with the house styling above.
- Don't put `SidebarTrigger` in the page header — the collapse moved to the team switcher. Use `useSidebar().toggleSidebar()` if you need to trigger it from elsewhere.

---

## 9. Where to look in code

| Looking for | Read |
|---|---|
| All design tokens | `src/app/globals.css` |
| Font setup | `src/app/layout.tsx` (top of file) |
| App shell | `src/app/(app)/layout.tsx` + `src/components/app-sidebar.tsx` |
| shadcn primitives | `src/components/ui/*` |
| Status colors / labels | `src/lib/status-meta.ts` |
| Form action pattern | any of `src/lib/actions.ts` — they're all the same shape |
| A canonical hero | `src/app/(app)/dashboard/page.tsx` + `dashboard-hero.tsx` |
| A canonical detail page | `src/app/(app)/bids/[id]/page.tsx` + `bid-detail-sections.tsx` |
| A canonical auth page | `src/app/(auth)/login/page.tsx` |
