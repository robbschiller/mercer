# Mercer — Canonical Feature Map

*Updated 2026-07-14. Part 1 is what exists and works today (verified live). Part 2 is the
roadmap — everything that takes Mercer from "Jordan's CRM/bid tool" to the thing he can't
imagine running AQP without. North star for Part 2: the screenshot of Jordan using Claude —
a pile of aerials, spec PDFs, and building dimensions plus one messy sentence
("create a proposal for Yvonne… include unit costs for woodrot and stucco even without
quantities") in, an impressive proposal out. That whole experience belongs inside Mercer.*

---

## Part 1 — What Mercer does today

### The spine
Property-rooted deal flow: **lead → takeoff → bid → quote → customer link → acceptance →
job**, where the bid row *is* the job after the win. Properties are the durable records;
owners and management companies rotate around them.

### Home (dashboard)
- Action-first composer ("Ask Mercer to do anything…") with working quick-action pills:
  Add contact, Create lead, Log call, Set follow-up, Start draft bid, Show overdue.
- "Jump back in" recents across leads, bids, and jobs.

### Ask
- Entity-scoped AI chat: tag any record (property / bid / lead / contact / company) and ask
  questions grounded in its live data. Offline mock without an API key.

### Pipeline (one view over every open deal)
- Open leads (Needs takeoff / Takeoff scheduled / On hold) unioned with open bids
  (Quoting / Sent); stage chips with counts; no double-counting (a quoted lead is
  represented by its bid).
- Per-row "Next" action: inline schedule-takeoff (date + one click), Start bid (prefilled
  from the lead), Build quote →, Follow up →.
- Bid rows show the live quote badge (v4 · Sent · Viewed 2×) and latest stamped total.

### Leads
- New Lead form: opportunity name, **contact name (the person)**, email/phone,
  company (account autocomplete), property name + address, source, est. value, scope tags,
  large-job flag, notes, **file attachments** (specs/RFPs/emails — PDF, images, Word/Excel/CSV/eml).
- CSV import with alias-based header mapping and an enrichment worker (pending → enriched).
- Lead detail: status transitions, contact attempts, follow-ups, activity, photos
  (intake/walk-through), attachments card.
- Property/contact auto-linking: leads find-or-create the account, property, and contact
  (contacts are only minted from person fields, never the opportunity title).

### Bids (the deal workbench)
- New Bid wizard: address resolve (Places autocomplete + satellite preview), property name,
  **project/opportunity name**, client, notes; prefills from a lead.
- Bid page: buildings & surfaces (dimension math), access items (lift/scaffold/swing),
  pricing config (coverage sqft/gal, price/gal, labor rate, margin %), add-from-catalog
  (SKU × qty), OpenStreetMap footprints (stub), invoicing contact, delete.

### AI Quote Engine (the flagship)
- Scope in plain words (typed or **dictated**) + takeoff photos + catalog + property specs
  + previous version → Claude drafts structured line items with full provenance
  (source ai/catalog/manual, confidence, evidence photo, rationale, SKU match).
- Review-every-line table: click-to-edit cells (edit clears the Verify flag and recomputes
  server-side), inline "Why" rationale, add/remove lines, flagged-count gate before approval.
- **The AI never writes the PDF** — Approve & generate stamps a versioned PDF from the fixed
  template (category-grouped line table, version stamp), auto-writes a changelog.
- Version history rail: every version with status (Ready/Sent/Accepted/Declined), total,
  changelog, view counts, **per-version Copy customer link + PDF** (links are stable —
  copying again returns the same URL).

### Customer link & portal (`/p/<share>`)
- No-login web proposal: quote-version badge, scope & pricing with the **full line-item
  table**, Download PDF, buildings, access, ownership/NTO block, notes.
- Accept (name required, title optional) / Decline (optional reason); view counting;
  invalid links 404.
- On acceptance the same URL permanently pivots to a **live project-status page**
  (schedule targets/actuals, crew, progress updates, original proposal + contract value).
- Guards: a share can only be responded to once; declining a revision never clobbers a won
  job; accepting a revision updates the contract value consistently.

### Jobs (delivery)
- Acceptance auto-creates the job (delivery status on the bid row), snapshots contract value,
  closes the lead, writes the activity trail.
- Job page: status, project details, schedule (targets + auto-stamped actuals), crew/sub +
  crew lead, week/day progress, buildings-done counter, pre-start checklist (legal owner +
  NTO capture), **project updates feed** (visible on the customer status page), **budget**
  (expenses by category incl. housing/mobilization), **additional work** (change orders),
  **invoices & draws**, bid context.

### Properties (the durable records)
- Index: management company, contacts, open deals, jobs, last activity.
- Property hub: pipeline chips, contacts-at-property, ownership (individual owner contact
  or **HOA/association**), specs (paintable sqft non-floor/floors, breezeways, stair systems,
  maintenance history) with **spec photos**, dated relationship history (management + owner,
  auto-seeded from lead creation), standing photo record, **deals-at-this-property** card
  ("2 jobs · 1 open bid · $27k won").

### Contacts & accounts
- People with employment history across companies, preferred contact method, §4 rollups
  (properties managed, lifetime awarded); accounts (PM companies/owners) with reps.

### Reports
- Jobs in flight / delivered, lead funnel, lead sources, six-month trend, bid funnel.

### Settings & platform
- Service catalog (price-list SKUs by category/unit) with **CSV import**; supplier products;
  company profile; team members (org memberships — data scoped per org owner).
- Supabase auth (header-forwarded, one RTT per request), audit log on every mutation,
  activity events, polymorphic photos + attachments archives, versioned manual migrations.

---

## Part 2 — The roadmap: far exceeding expectations

**North star ("the Yvonne test"):** Jordan forwards whatever he has — aerial screenshots
with red scribbles, a Sherwin-Williams spec PDF, "Type 1 (3) – 700×22" dimension notes,
eight photos — types one sentence, answers a couple of clarifying questions, and a
proposal his customer calls *the most professional thing any contractor sent them* goes
out with his branding on it. Then the deal runs itself through the app.

### Pillar 1 — Intake anything (the composer becomes real)
- **Drop-anything quote intake**: the bid's Build Quote card accepts PDFs, aerial/satellite
  screenshots, dimension lists, and photos — not just takeoff photos. Claude reads all of it:
  parses spec PDFs into scope + constraints, reads "700×22" building math into surfaces,
  uses annotated aerials for building counts.
- **Clarifying-questions loop** ("ask me if you need something"): when the draft has gaps,
  the engine asks 2–3 pointed questions inline (units? occupied? color change?) instead of
  guessing — answers flow into the draft and the changelog.
- **Email-in leads**: forward a referral email to leads@… → parsed lead with property,
  contact, scope, and attachments auto-filed. The Sherwin-Williams referral becomes a
  one-forward workflow.
- **Voice everywhere**: dictation (already in the composer) extended to lead notes, project
  updates from the truck, and takeoff walk-and-talk → structured surfaces.

### Pillar 2 — The proposal becomes the artifact (the wow)
- **Web-first branded proposal**: upgrade `/p` from "clean form" to *artifact-quality* —
  AQP branding/colors/logo, cover section with property hero image (satellite or best photo),
  personal cover letter ("Yvonne, thanks for walking the property with us…"), scope story
  with photos placed next to the lines they justify, team/insurance/license block,
  testimonials. PDF stays the print twin.
- **Unit-rate & allowance lines**: line items with a price and *no committed quantity*
  ("Woodrot board replacement — $42/board as found") rendered as a rate card section —
  exactly Jordan's "I just want them to know what they'll pay."
- **Options & alternates**: good/better/best or add-on sections the customer can toggle
  before accepting; acceptance records the chosen configuration.
- **E-signature + deposit**: typed/drawn signature on accept, optional deposit collection
  (Stripe) right on the acceptance screen. Money at the moment of yes.
- **Link intelligence**: notify Jordan on first view ("Yvonne opened the proposal"),
  expiring links, superseded-version guard ("a newer version of this proposal exists").

### Pillar 3 — Takeoff superpowers
- **Aerial takeoff assist**: finish OSM footprints + satellite imagery → building outlines,
  perimeter/height math per archetype ("6-unit 2-story ≈ 600 lf × 22 ft"), one-tap surface
  generation. Jordan's manual "700×22" notes become computed suggestions he confirms.
- **Photo → condition report**: classify uploaded photos (wood rot, stucco cracks, failing
  caulk) into flagged scope suggestions with the evidence photo attached — feeds both the
  quote and a "condition findings" proposal section that justifies the price.
- **Building-type templates**: archetype presets (garden/townhome/mid-rise) with typical
  surface math, refined by every completed takeoff.

### Pillar 4 — Deals that chase themselves
- **Follow-up autopilot**: unviewed after 3 days → drafted nudge email for approval;
  viewed-but-silent → different nudge; every send logged to the activity trail.
- **Outbound email from the app** (proposals, nudges, receipts) on Jordan's domain —
  currently the link leaves the app in a text message we never see.
- **Win/loss intelligence**: decline reasons + close rates by PM company, source, and price
  band; "AvalonBay accepts at $0.19/sqft, Greystar declines above $0.17" is a report,
  then a pricing suggestion inside the quote engine.

### Pillar 5 — Delivery that sells the next job
- **Crew mode**: phone-first daily updates — photos + voice note → structured update on the
  job and the customer status page. The status page becomes a reason PMs hire AQP.
- **Additional-work quotes reuse the engine** (Jordan's explicit ask): scoped to a live job,
  same draft→review→stamp→link→accept flow, accepted amounts roll into contract value and
  invoices.
- **Weekly site report**: auto-drafted from updates/photos/schedule, approved and emailed
  to the PM every Friday.
- **Closeout packet**: final photos, warranty, lien waiver, punch list sign-off — one
  generated artifact that triggers the final invoice.
- **Money loop**: draw schedules from the accepted proposal, invoice PDFs/links, payment
  status, QuickBooks export.

### Pillar 6 — The compounding moat
- **Property memory in the engine**: every quote already reads property specs; add last
  paint date, prior colors/products, prior contract values → "repaint cycle due" alerts
  across the portfolio (the AvalonBay portfolio view: 3 properties, 2 due).
- **Ask across everything**: "what's my win rate with Camden?", "which jobs are over
  budget?", "draft a check-in to every PM I haven't talked to in 60 days" — Ask gains
  write-actions with approval.
- **Price book that learns**: won/lost outcomes and actual job costs feed back into catalog
  rates; the engine cites history in its rationale ("priced like Nona Terrace, won at $1.02M").

### Sequencing (opinionated)
1. **Now (the Yvonne test, ~1–2 weeks):** drop-anything intake + clarifying questions +
   unit-rate lines + branded web proposal upgrade. This is the screenshot, in-app.
2. **Next:** e-sign + deposit, first-view notifications, outbound email, aerial takeoff assist.
3. **Then:** additional-work quotes, crew mode + weekly reports, money loop.
4. **Ongoing:** win/loss intelligence, property memory, price book learning.
