# Design prompts — Home · Pipeline · Jobs · Properties · Reports · Contacts · New Lead · New Bid

*2026-07-14. Paste the SYSTEM block plus ONE page block per Claude Design session
(same project as the sidebar: `mercer`, d3b4b34a). Grounded in Jordan's AQP canon
(8 screens / 18 entities — `docs/build-plans/aqp_reconciliation.plan.md`), the
shipped feature set (`docs/features.md`), and the Direction A sidebar. Jordan's
raw files (SCHEMA.md, aqp-alpha.html, AQP-OS-Engineering-Notes.md) aren't in the
repo — re-drop them if you want the money-screen fidelity to go deeper.*

---

## SYSTEM (paste first, every time)

**Start from the file `Sidebar Redesign - Direction A Final.html` in this
project.** Open it before designing anything: it is the shipped global
sidebar and the design-language source of truth. Reuse its `<style>` tokens
and its expanded sidebar markup verbatim as the fixed 260px left column of
every frame you produce — the page you're designing renders to its right,
inside the same app shell. Do not restyle or reinvent the sidebar; only set
the correct nav item active for the page at hand.

You are designing a page for **Mercer** — the operating system for commercial
multifamily exterior contractors (painting, wood rot, stucco). The user is a
contractor-owner like Jordan at Affordable Quality Painting: he sells repaints
to property-management companies (AvalonBay, Camden, Greystar), walks
properties ("takeoffs"), sends AI-drafted quotes through shareable links, and
runs the won jobs. Design for a busy operator on a laptop — decisive, dense
where it earns density, calm everywhere else.

Design language (inherited from the sidebar file; restated for emphasis):
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
  from the starter file on the left (real markup, correct item active), the
  page owning the rest. Include realistic sample data (below), light theme,
  `design_doc_mode: canvas`, and label each frame with `data-screen-label`.

Canonical sample data (use these, not lorem): properties **Nona Terrace**
(Orlando, 55 units, Community Management Services, contact **Yvonne Alvarez**),
**Miura Village** ($146,700 quote v1), **Avalon Somerville Station**
(AvalonBay, won $12,080, job not started), Camden Durham, AMLI Cherry Creek.
Quote statuses read like "v2 · Sent · Viewed 3×". Money like $146,700, $84,200,
$1,204,483.

---

## 1 — HOME

*Starter: build on `Sidebar Redesign - Direction A Final.html` — its sidebar
is the left column of every frame, with **Home** active. Save this design as
`Home Redesign - Direction A.html`.*

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

*Starter: build on `Sidebar Redesign - Direction A Final.html` — its sidebar
is the left column of every frame, with **Pipeline** active (count badge 26).
Save as `Pipeline Redesign - Direction A.html`.*

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

*Starter: build on `Sidebar Redesign - Direction A Final.html` — its sidebar
is the left column of every frame, with **Jobs** active (count badge 5).
Save as `Jobs Redesign - Direction A.html`.*

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

*Starter: build on `Sidebar Redesign - Direction A Final.html` — its sidebar
is the left column of every frame, with **Properties** active.
Save as `Properties Redesign - Direction A.html`.*

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

*Starter: build on `Sidebar Redesign - Direction A Final.html` — its sidebar
is the left column of every frame, with **Reports** active.
Save as `Reports Redesign - Direction A.html`.*

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

## 6 — CONTACTS

*Starter: build on `Sidebar Redesign - Direction A Final.html` — its sidebar
is the left column of every frame, with **Contacts** active.
Save as `Contacts Redesign - Direction A.html` (data in `contacts-data.js`,
render logic in `contacts.js`, 5a/5b frame switcher top-right like the
Properties file).*

The people register — the counterpart to Properties. Buildings are the durable
asset; people are the portable one: a PM who says yes moves between management
companies and takes their trust along ("the rep follows the firm"). The page
answers: who says yes, what have they been worth, and who's going cold?

Two frames:

**6a — Contacts index.** Rich rows, not a data table: name + title, company
chip, relationship tag when earned (**Decision maker** / **Champion** for
multiple wins / **New**), preferred-contact-method icon chip (call/text/email —
AQP tracks this). Right rail: lifetime awarded as the big mono figure (default
sort: highest lifetime first), last-touch line (amber when they have open work
and >14d silence), and the ONE next action ([Log a call] / [Open deal] /
[Open contact]). Sparks: N properties touched · N deals · win rate when ≥2
decided. Filters: All / Decision makers / Going cold / By company (grouped
mode with per-company rollups, like Properties). Sample data: ~10 contacts
across the Properties file's fictional companies (Halloran, Oakmont, Cushing &
Vale, Redpoint, Sterling, Vanta); make Yvonne Alvarez the star row (Halloran,
decision maker, $1.49M lifetime) and give one contact a company rotation
("at Halloran since 2019 · previously Pinnacle Living") so portability shows.

**6b — Contact detail.** Two-column like the property hub. Hero: avatar
initials, name + title + relationship tag, employment line ("Halloran since
2019, previously Pinnacle Living"), contact-method row with preferred badge;
right ledger: first met · deals won with them · **lifetime awarded** (big
mono) · win rate. Left column: **deals timeline through this person** (same
timeline vocabulary as the property hub — node icons, outcome pills, values,
linked), then **properties they touch** (rows with their role at each:
Decision maker / Site access / AP contact, plus that property's status pill).
Right column: channels & preferences panel, relationship notes ("prefers
texts, hates voicemail; golf on Fridays"), and a one-track employment-history
band chart (same visual as the property hub's rotation bands). Next-action
banner variant when they have an open deal and have gone quiet: amber,
"Yvonne hasn't been contacted in 16 days while a $128k quote sits open —
[Draft follow-up] [Log call]".

Implementation notes (for Claude Code, not the designer): everything maps to
real data except "previously at X" — we track current `accountId`, not
employment history, so render tenure only when known; days-since-touch derives
from `contact_attempts`. Neither blocks the design.

---

## 7 — NEW LEAD

*Starter: build on `Sidebar Redesign - Direction A Final.html` — its sidebar
is the left column of every frame (Pipeline active). Save as
`New Lead Redesign - Direction A.html` (data in `intake-data.js`, logic in
`intake.js`, 7a/7b frame switcher top-right).*

This is the front door of the entire system — every dollar Mercer ever tracks
enters through this screen or New Bid. Today it's a ten-field vertical form
with a bare text input for the address. Kill the form. The redesign has ONE
organizing idea: **finding the building must feel exactly like using Google
Maps.** Type, see the building, done.

**THE PROPERTY FINDER (the shared pattern — design it once, both intake
screens reuse it).** A single oversized search field is the hero of the page —
Maps-style: pill-shaped, prominent, auto-focused, placeholder "Property name
or address…". As the user types, one merged suggestion dropdown:
- **Buildings we know** (top, marked with a small history chip): "Westgate
  Commons — Winter Park · 2 jobs · $181k lifetime · Repaint due". Picking one
  attaches the existing property record — never a duplicate.
- **Google Maps results** below (pin icon, address lines, exactly the Places
  suggestion feel — that's the muscle memory we're borrowing).
Picking either one flips the hero into the **building card**: a wide
satellite/aerial view with the pin dropped (use `image-slot`), the resolved
name + formatted address over it, and a quiet "not it? ⌫ search again"
escape. If we know the building, the aerial is bannered with its history
("Painted Jul 2019 · $84k · Yvonne Alvarez decided") — the moment of delight:
*Mercer already knows this building.* No separate name/address/lat/lng
fields anywhere; the card IS the value.

Two frames:

**7a — Finder open.** The page at first paint: big search hero mid-viewport,
suggestions dropdown open on a half-typed query ("nona ") showing 1 known
building + 3 Maps results, and below the fold a ghost row of what comes next
(Who / What / Send-off, dimmed). Header eyebrow: "New lead · the front door".

**7b — Building locked, 20 seconds to done.** Aerial building card on top
(known-building banner variant), then ONE compact band each for:
- **Who**: contact autocomplete (existing contacts surface with their company
  chip + "3 deals" spark), else free name + phone/email inline; company
  autocomplete beside it.
- **What**: scope as toggle chips (Full exterior · Breezeways · Stairs ·
  Wood rot · Interior common), rough $ (mono input), Large-job toggle
  (≥ 2 weeks — drives templates), source chip-select (recent sources as
  chips + free text).
- **Notes & files**: one quiet drop zone line ("Drop the RFP, paint spec, or
  referral email — they ride along"), collapsed textarea.
Primary action bottom-right: solid [Add lead]; secondary [Add & schedule
takeoff]. The whole 7b should read as ~20 seconds of work: pick building,
pick person, tap two chips, done.

---

## 8 — NEW BID

*Starter: build on `Sidebar Redesign - Direction A Final.html` — sidebar left,
Pipeline active. Save as `New Bid Redesign - Direction A.html` (reuse
`intake-data.js`/`intake.js` patterns from §7; frames 8a/8b).*

The other front door — and the on-ramp to the quote engine, which is the crux
of the product. Same PROPERTY FINDER pattern as §7 (identical component,
identical feel — a user who's used one has used both). What differs is what
happens after the building locks.

**8a — Finder, bid flavor.** Same Maps-style search hero. The known-building
suggestions here surface bid-relevant history ("Miura Village · quote v1
$146,700 · declined Mar" / "Nona Terrace · won $1.2M · specs on file").
Arriving from a lead (?leadId=) skips 8a entirely — show that as a note.

**8b — Confirm & launch.** The aerial building card locked on top. Below it,
two bands and a launchpad:
- **The deal**: client/company autocomplete (prefilled from the property's
  management company with a "from property record" hint), bid label
  (defaulting to "<Property> – Full Exterior Repaint"), small/large fork as
  two fat radio cards (Small · days, deposit+final vs Large · weeks,
  draw billing) — not a checkbox.
- **What we already know** (only when the property has history): specs strip
  pulled from the property record — paintable sqft, breezeways, stair
  systems, last colors — each as a chip with a "reuses takeoff" note. This is
  the repeat-business payoff rendered at the exact moment it saves work.
- **Launchpad**: the primary action is not "Create bid" — it's
  [Create & draft quote with AI] (solid, with a sparkle icon and a sub-line
  "scope + photos → priced lines in ~60s"), with a quiet secondary
  [Create empty bid]. The screen should make the AI path feel like the
  default on-ramp, because it is.

Interactions (preview-only): typing filters the merged dropdown; picking a
suggestion animates the search hero into the building card; the ⌫ escape
returns to search; the small/large cards toggle; toasts on the primary
actions.

Implementation notes (for Claude Code, not the designer): the Places
autocomplete, geo fields, enrichment runner, and `satellite_image_url` all
exist (`address-autocomplete.tsx`, `enrichment-runner.ts`) — the finder is a
re-skin + merged-suggestions layer, not new infrastructure. Known-building
matches come from `properties` (name/address ILIKE + trigram later); specs
strip from the AQP property fields; EagleView measurement
(docs/eagleview-integration-plan.md) slots into the specs strip later.

---

## 9 — OPPORTUNITY: THE PROPOSAL COMPOSER

*Starter: build on `Sidebar Redesign - Direction A Final.html` — sidebar left,
**Opportunities** active. Save as `Proposal Composer - Direction A.html`
(frames 9a/9b/9c). Companion plan:
`docs/build-plans/proposal_composer.plan.md`; Jordan's own artifacts are the
fidelity bar — `docs/jordan/Alhambra_Village_No_1_Exterior_Repaint_Proposal.pdf`
(customer face) and `docs/jordan/Azur_at_Metrowest_Take_Off_Budget.xlsx`
(internal face).*

The crux screen of the whole product. Jordan already prototyped this UX in a
claude.ai project: he drops a pile (notes screenshot with shorthand takeoff
math like "Style 1 (23) – 10222", aerials, ground photos, a prior proposal)
plus one casual sentence ("proposal for Gaston, 311 units, include wood rot
and stucco rates, ask me if you need something") and gets back a 7-page
branded sales document AND an internal takeoff budget. Mercer's version is
that conversation with consequences: CRM writeback, an enforceable pricing
gate, a signable link, and a budget that becomes the job's baseline. Design
rule: **creating is always the conversation; pages are for finding and
reviewing.** He should never fill out a form.

**9a — The composer thread.** The opportunity detail's primary surface is a
chat thread (not a wizard, not a form): a big drop-friendly input at the
bottom ("Drop the takeoff notes, photos, spec — then tell me who it's for"),
turns above it. Show a mid-conversation state: Jordan's pile of thumbnails +
his one sentence, then Mercer's single round of clarifying questions as
compact chips/inline answers (his rule: ask once; what he can't answer
becomes a labeled best-estimate). Generation is a turn: a progress card
("Reading the notes… pricing 34 buildings… checking supplier costs") that
resolves into 9b.

**9b — The package, two faces.** The generated result rendered as a document
preview card stack — the PROPOSAL first (cover with hero photo, "one number"
investment block with per-SF/per-door stats in mono, payment schedule,
published-rates section, acceptance CTA — visually the Alhambra PDF, in-app),
with a quiet fold beneath it: **"Show the working" → the takeoff budget**
(materials table with basis column "1 gal per 200 SF", labor $/SF, admin 30%,
commission 4%, build-up total / per SF / per door). Two governance elements
must be unmissable:
- **Amber unconfirmed-price chips** on any line the AI estimated or pulled
  from market reference ("$36/SF — market ref, tap to confirm"). The Stamp &
  send button is disabled while any remain, with a count ("2 prices need
  your confirmation").
- **The margin banner** across the top of the budget fold: quote vs build-up
  ("Quote $251,129 · Build-up $290,210 · **–$39,081 under your cost**") in
  red/amber/emerald states. Sending under build-up needs an explicit
  override. This exact scenario is real — use these numbers.
Edits happen two ways, both shown: a message in the thread ("hold the price
through December") and click-to-edit on the document itself.

**9c — Stamp & send.** The confirm step: version chip (v1 → v2 with a change
log line, his versioning ask), price-held-through date, recipient (Gaston H.
Correa · GrandManors, from the CRM), and one primary action [Stamp & send
link]. After: the telemetry state on the opportunity — "Sent · viewed 3× ·
last opened 2h ago" with the signature status. The win moment ("Signed ✓")
shows the handoff: "Job created — budget carried over as the baseline."

Sample data: property **Azur at Metrowest** (6432 Raleigh St, Orlando · 311
units · 34 buildings), contact **Gaston H. Correa** (GrandManors), quote
$251,129, build-up $290,210. Secondary: Alhambra Village No 1 (Yvonne
Kamara · Soaring Management · $81,273 · 55 units · $0.90/SF · $1,478/door).

Implementation notes (for Claude Code, not the designer): the quote engine
already does doc blocks, dimension math, one-round clarifications, rate-only
lines, and line provenance/confidence — 9a is a chat shell over it, 9b's gate
is enforcement over existing flags, the budget is new (`bid_budgets`), and
the document sections come from org knowledge (settings upload: messaging
guide, pricing spreadsheet, example takeoff, sample proposal — the claude.ai
"project knowledge" equivalent).

---

## 10 — JOB: DELIVERY COMMAND

*Starter: build on `Sidebar Redesign - Direction A Final.html` — sidebar left,
**Jobs** active. Save as `Job Delivery - Direction A.html` (frames 10a/10b).
Source: Jordan's notes §7 (`docs/jordan/AQP-OS-Engineering-Notes.md`) — his
words: "Budget clones over from the opportunity"; "do NOT call these change
orders, only additional work."*

The won side of the same loop — where the proposal's internal budget becomes
the job's baseline and the AI keeps working after the sale.

**10a — The job page, money spine.** Header: contract value, draws timeline
(Draw 1 paid · Draw 2 sent · Final pending) against the total, assigned PM +
crew. The centerpiece: **budget vs actual by category** — planned (cloned
from the opportunity's build-up) vs spent (live expenses) per category
(paint, primer, caulk, lifts, labor, housing, mobilization…), with a
remaining-budget number that reads at a glance and ambers when a category
runs hot. This is the live view his notes ask for ("expenses deduct against
budget in real time").

**10b — The AI keeps working.** Three cards, all composer-shaped (photos +
a sentence in, document out — same interaction grammar as §9):
- **Weekly site update**: PM drops site photos + a voice note → AI drafts
  the weekly report → [Send to customer]. Show one drafted report inline.
- **Additional work** (never "change order"): PM drops damage photos +
  "found rot on building 4 rafter tails, about 60 LF of 2×6" → AI prices it
  at the PUBLISHED rates from the proposal ($12/LF × 60 = $720) → approval
  link to the customer; approved quantities flow into the budget and
  invoicing. The published-rates page from §9 is the contract here — show
  that continuity.
- **Closeout packet**: one button at completion — confirmation, colors used
  and where, care instructions — filed to the property forever (the next
  repaint quote starts from it).

Sample data: **Avalon Somerville Station** (AvalonBay, won $12,080, in
progress, Draw 1 paid) and a large job at Azur at Metrowest ($251,129,
budget cloned, paint category at 62% with 55% of schedule elapsed).

---

*Sync-back note: export each page as `<page>-redesign/<Name>.html` in the
design project and tell Claude Code which files to implement — same flow as
the sidebar.*
