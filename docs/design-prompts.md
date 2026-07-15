# Design prompts — Home · Pipeline · Jobs · Properties · Reports

*2026-07-14. Paste the SYSTEM block plus ONE page block per Claude Design session
(same project as the sidebar: `mercer`, d3b4b34a). Grounded in Jordan's AQP canon
(8 screens / 18 entities — `docs/build-plans/aqp_reconciliation.plan.md`), the
shipped feature set (`docs/features.md`), and the Direction A sidebar. Jordan's
raw files (SCHEMA.md, aqp-alpha.html, AQP-OS-Engineering-Notes.md) aren't in the
repo — re-drop them if you want the money-screen fidelity to go deeper.*

---

## SYSTEM (paste first, every time)

You are designing a page for **Mercer** — the operating system for commercial
multifamily exterior contractors (painting, wood rot, stucco). The user is a
contractor-owner like Jordan at Affordable Quality Painting: he sells repaints
to property-management companies (AvalonBay, Camden, Greystar), walks
properties ("takeoffs"), sends AI-drafted quotes through shareable links, and
runs the won jobs. Design for a busy operator on a laptop — decisive, dense
where it earns density, calm everywhere else.

Design language (must match the shipped "Sidebar Redesign — Direction A Final"
in this project):
- Fonts: Geist (UI), Geist Mono (numbers/kbd), Instrument Serif (brand moments
  only). oklch neutrals: ink 0.205, muted 0.556, border 0.922, page bg 0.991.
- Accent: near-black #18181b for primary actions/active states; blue
  hsl(224.3 76.3% 48%) ONLY for live/unread signals (dots, links); amber for
  "verify/overdue"; emerald for won/accepted. Money is always tabular-nums.
- Cards: 16px radius, 1px border, no shadows at rest. Controls: 9px radius.
  Tables: 1px row separators, generous 10–12px cell padding, muted uppercase
  11px column headers.
- Every list row must carry its ONE next action inline. Mercer's creed:
  action-first, never metric-first. A number you can't act on belongs on
  Reports, nowhere else.
- Frame the page at 1440×900+ inside the app shell: the Direction A sidebar
  (260px, already designed) sits on the left — render it as a low-detail
  placeholder column; the page owns the rest. Include realistic sample data
  (below), light theme, `design_doc_mode: canvas`, and label each frame with
  `data-screen-label`.

Canonical sample data (use these, not lorem): properties **Nona Terrace**
(Orlando, 55 units, Community Management Services, contact **Yvonne Alvarez**),
**Miura Village** ($146,700 quote v1), **Avalon Somerville Station**
(AvalonBay, won $12,080, job not started), Camden Durham, AMLI Cherry Creek.
Quote statuses read like "v2 · Sent · Viewed 3×". Money like $146,700, $84,200,
$1,204,483.

---

## 1 — HOME

The morning screen. It must answer three questions in five seconds: *what
happened while I was gone, what needs me today, what's the fastest way to act.*
It is an **agenda, not a dashboard** — no metric tiles, no charts.

Top to bottom:
1. **Greeting + AI morning brief.** "Good morning, Jordan." followed by a
   2-sentence model-written brief in slightly larger serif-adjacent text:
   *"Two quotes are going quiet ($198k combined) — Yvonne opened Miura Village
   again yesterday, worth a call. Brandon Hill's takeoff is Thursday at 2pm."*
   Subtle "generated 7:02am" timestamp.
2. **Composer.** The existing one-box input ("Ask Mercer to do anything…") —
   it both DOES (create lead, log call, set follow-up) and ANSWERS (inline
   answer bubble when the input is a question). Show one mocked answered
   state. Quick-action pills beneath, smaller than today.
3. **Needs you today** — the heart of the page. Grouped agenda list, each row
   with an inline action button:
   - *Quotes going quiet:* "Nona Terrace — $1.2M · sent 6d ago · viewed 2×,
     silent since Tue" → [Draft follow-up]. Never-opened rows read differently:
     "sent 4d ago · never opened" → [Resend link].
   - *Follow-ups due:* contact + property + due date (overdue in amber) →
     [Log call] [Snooze].
   - *Takeoffs this week:* "Thu 2pm — Post Alexander, Brandon Hill" → [Open].
   - *Expiring links:* "Miura Village quote expires in 4 days" → [Call] chip.
   - *Jobs drifting:* "Avalon Somerville — target start passed, still Not
     started" → [Update schedule].
   Show 2–3 rows per group; groups with nothing collapse to a single muted
   "nothing waiting" line. Total-count chip per group header.
4. **What happened** — compact feed of customer moments (proposal viewed /
   accepted / declined, with relative times), max 5, "view all" link.
5. **Jump back in** — the existing recents row, demoted to the bottom, small.

States to mock: the full morning (busy), and the empty state ("Clear morning —
nothing needs you. 3 quotes are out totaling $1.4M.").

---

## 2 — PIPELINE

Every open deal from first contact to signed, one working surface. This is
where Jordan lives between takeoffs. Replaces separate leads/takeoffs/bids
lists (they exist as filters here).

- **Stage rail across the top:** chips with counts AND value — "Needs takeoff
  · 19", "Takeoff scheduled · 2", "Quoting · 1 · $146k", "Sent · 3 · $1.4M",
  "On hold · 1". Active chip inverts to near-black. An "All · 26" chip leads.
- **The table.** Columns: Deal (name + property sub-line), Company, Stage,
  Value, Quote (the "v2 · Sent · Viewed 3×" badge cluster — viewed count in
  blue when >0 and unresponded), Age in stage (amber past thresholds: 7d
  needs-takeoff, 5d sent), **Next** (the one action: [Schedule takeoff] with
  inline date, [Start bid], [Build quote →], [Draft follow-up]).
- **Row affordances:** hover reveals a quiet secondary action (open, snooze).
  Deals that advanced today carry a tiny blue dot on the Deal cell.
- **A "stale" lens:** subtle toggle "Show: All / Going quiet" — the going-quiet
  view sorts sent deals by silence duration, viewed-but-silent flagged
  distinctly from never-opened.
- Header actions: [New lead] ghost + [New bid] solid.
- Mock three states: default All view; the Sent filter with follow-up popover
  OPEN on a row (drafted message + Copy button); empty pipeline.

---

## 3 — JOBS

Won work in delivery. Jordan's AQP canon is explicit here (money layer): a job
carries an immutable contract value, budget-by-category, draws/invoices,
additional work, and a schedule that forks **large** (weeks × buildings grid)
vs **small** (6-day strip).

Two frames:

**3a — Jobs list.** Cards or dense rows (pick what reads faster) each showing:
property + client, contract value, delivery status pill (Not started / In
progress / Punch-out / Warranty watch / On hold), schedule position ("Week 3 of
6 · 4/7 buildings"), **budget burn bar** (spent vs contract, amber when burn
outpaces schedule — AQP's burn-rate alert), days since last update (amber >7d),
and Next action ([Post update], [Start job], [Invoice draw 2]). Group or sort:
needs-attention first. Status filter chips on top.

**3b — Job detail.** Left column: status + schedule card (show BOTH variants:
large = weeks × buildings checkable grid; small = 6-day strip), pre-start
checklist (NTO/legal owner), updates feed (photo thumbnails + text, crew-
authored, customer-visible marker). Right column: **money stack** — contract
value header ($1,204,483 · accepted by Yvonne Alvarez, signature shown small
in script), budget by category with burn bars (Materials, Labor, Housing,
Mobilization…), draws/invoices table (Draw 1 paid, Draw 2 due), additional
work list with [Draft with AI] entry. Keep the quote/bid context one click
away, not embedded.

---

## 4 — PROPERTIES

The durable asset register — buildings outlast every deal and every management
company. This page sells the repeat-business story.

Two frames:

**4a — Properties index.** Rich rows: property name + address, management
company (with "since 2026" tenure), unit count/type when known, portfolio
grouping hint (AvalonBay ×3), deal history spark ("2 jobs · $96k lifetime ·
1 open bid"), last-activity, and the **Repaint due** amber chip (last job 6+
years old) with [Start lead] action right on it. Filters: All / Has open deal /
Repaint due / By management co. Consider a subtle grouped-by-portfolio mode.

**4b — Property hub (detail).** Hero strip: name, address, satellite thumb,
management + tenure, ownership (individual contact OR "HOA / Association").
Then the sections we have — reimagined, not listed: **Deals timeline** (every
lead/bid/job ever, vertical timeline with values and outcomes — make history
feel like an asset), specs card (paintable sqft, breezeways, stair systems,
maintenance notes + spec photos), contacts-at-property with roles, relationship
history (dated mgmt/owner spans as horizontal bands — visualize the rotation),
standing photo record. Next-action banner stays: "Repaint due — last painted
Jul 2019, $84k. [Start lead]".

---

## 5 — REPORTS

The ONE page allowed to be metric-first — but every number should whisper an
action. Audience: Jordan deciding where next month comes from, and Robb
checking the business is healthy.

- **Header stat row (4):** Open pipeline $, Bid win rate, Delivered margin %,
  Awaiting response (count + $) — each with a tiny trend arrow and a
  click-through hint.
- **Win rate by company** — the star of the page. Horizontal bars per PM
  company: win %, won value, and lost count; a quiet insight line under it
  ("AvalonBay accepts 3 of 4 · Greystar has declined twice above $0.17/sqft").
- **Why deals declined** — verbatim reasons list, newest first, property +
  company + date. This is sales ammunition, give it room.
- **Six-month rhythm** — compact combo: bars for bids won, line for contracted
  value, by month. Small, not a hero chart.
- **Funnels** — lead funnel and bid funnel as horizontal stage bars with
  conversion percentages between stages (needs takeoff → scheduled → quoted →
  won).
- **Delivered margin table** — per completed job: contract, spent, profit,
  margin %; totals row. Amber any job under 20%.
- Everything dated "derived live" — no date-range pickers in v1, just a quiet
  "last 6 months" scope note where relevant.

---

*Sync-back note: export each page as `<page>-redesign/<Name>.html` in the
design project and tell Claude Code which files to implement — same flow as
the sidebar.*
