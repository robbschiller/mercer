# The Proposal Composer — gap inventory & build plan

*2026-07-16. Source of truth: Jordan's own claude.ai project (`docs/jordan/` —
instructions, prompt screenshot, Alhambra proposal PDF, Azur takeoff budget
xlsx) plus his engineering notes §6–§8. The thesis: Claude is his estimator;
Mercer is that estimator with a desk, filing cabinet, mail room, and a boss
checking the math. He switches the first morning the same prompt produces the
same two artifacts with fewer steps afterward.*

**The contract:** one takeoff, two faces, zero homework.
- Customer face — a branded, board-forwardable sales document (Alhambra is
  the bar), online and signable.
- Internal face — the takeoff budget (materials with spread-rate bases,
  labor $/SF, +30% admin, +4% commission → build-up, margin vs quote).
- Zero homework — everything the artifact implies (CRM writeback, send,
  telemetry, sign → Job, budget → actuals baseline) happens without Jordan
  leaving the conversation.

---

## Gap inventory

### A. Creating (the opportunity)

| # | Gap | Have today | Build |
|---|-----|-----------|-------|
| A1 | **Conversational composer** on the opportunity — drop pile + one sentence; one round of clarifying questions; ask → estimate → disclose fallback | Quote engine with doc blocks, dimension math, one-round questions (Yvonne test) — but workspace-shaped, not chat-shaped | Chat-thread shell over the existing engine; every generation is a turn; edits by message ("hold the price through December") or by clicking the document |
| A2 | **Sales-document layer** — cover w/ hero photo, Why-AQP/promises, scope narrative, investment page (one number + per-SF/per-door), payment schedule, published rates, what-to-expect + testimonials, terms + validity, acceptance CTA | Proposal snapshot = scope + pricing only; brand-frozen; PDF + share page exist | Templated document sections (consistent every time — his explicit requirement, notes §6) assembled from org knowledge; same sections render on the share page and the PDF |
| A3 | **Internal budget face** — materials plan with bases ("1 gal per 200 SF"), labor $/SF, admin %, commission %, build-up total/per-SF/per-door, margin vs quote | Catalog, supplier products, user_defaults coverage/labor/margin; job-side expenses | `bid_budgets` (or budget block on the proposal snapshot): planned lines by expense category + build-up math; rendered behind a "show the working" fold; exportable xlsx |
| A4 | **Pricing gate** — "never an invented or unconfirmed price in the customer-facing version" (his rule, enforced structurally) | Line provenance (ai/catalog/manual) + confidence (high/low) already stored | Stamp/share blocked while any line is unconfirmed; amber tap-to-confirm chips; market-rate references always flagged |
| A5 | **Margin guardrail** — the –$39k moment | Nothing at stamp time | Banner on the confirm step: quote vs build-up, per-SF and per-door deltas; sending under build-up requires an explicit override |
| A6 | **Org proposal brain** (settings) — the claude.ai "project knowledge" equivalent | company_profiles (brand basics), catalog/supplier tables (structured) | Raw-file knowledge: upload messaging guide, pricing spreadsheet, example takeoff, sample proposal, supplier sheets, testimonials, insurance/license facts, the six promises. Files feed generation context as-is; the engine *maintains* the structured catalog from them, Jordan never does data entry |
| A7 | **Voice lint** — style rules enforced at render, not vibes | Nothing | Org style rules (e.g. the em-dash ban) checked against proposal copy before stamping |

### B. Sending & winning (mostly exists)

| # | Gap | Have today | Build |
|---|-----|-----------|-------|
| B1 | Share page = the sales document | Share page shows scope/pricing/accept + e-signature + view telemetry + expiry (038) | Re-render around the A2 sections; PDF becomes its print form |
| B2 | Price-held-through date | proposal_shares.expires_at | Surface as "price held through {date}" in document + share page |
| B3 | Win → Job | Accept flow flips to won; job created | Keep; add A3 budget cloning (see C1) |

### C. Delivering (the won side — yes, this is in scope; notes §7 verbatim)

| # | Gap | Have today | Build |
|---|-----|-----------|-------|
| C1 | **"Budget clones over from the opportunity"** — live remaining-budget | Expenses by category, invoices/draws, delivery statuses | Budget baseline copied from A3 on win; job page shows planned vs actual per category, live remaining |
| C2 | **Weekly site updates** — PM photos + voice note → AI writes the weekly report → sent to customer | project_updates table (human/crew_auto/agent author types), photos | Voice-note input, AI report generation, customer send (share-page style link or email), auto-cadence |
| C3 | **Additional work** — photos + scope → AI mini-quote in minutes at the published rates; customer approves online | change_orders table (customer-facing label already "Additional work") | AI generation from photos at published rates; shareable approval link; approved quantities flow into budget + invoicing |
| C4 | **Closeout packet** — one button: completion confirmation, colors used + where, care instructions | Nothing | AI-assembled customer document from job data; the property keeps it forever (next repaint starts from it) |
| C5 | Crew assignment | job schedule fields (029) | Light: assigned crew on the job card |

### D. Onboarding Jordan (day one)

1. Collect the three missing knowledge files: **messaging guide**, **example
   takeoff template**, **pricing spreadsheet example** (archive in
   `docs/jordan/`, then upload to his org's proposal brain).
2. Seed the brain with what we hold: Alhambra proposal (sample), supplier
   sheets, testimonials/insurance/license from his PDFs.
3. Acceptance test: replay Azur at Metrowest — same notes screenshot + same
   sentence → proposal ≥ Alhambra quality + budget matching his xlsx within
   rounding, margin banner firing on the –$39k.

---

## Phasing

- **Phase 1 — output parity (make the switch possible):** A2 sales-document
  layer + A3 budget face + A4 pricing gate + A5 margin banner + A6 org brain
  + B1/B2. Entry stays the existing quote engine.
- **Phase 2 — the conversation (make it feel like his project):** A1 chat
  shell on the opportunity, A7 voice lint, D acceptance test end-to-end.
- **Phase 3 — delivery (the moat):** C1 budget baseline → C3 additional work
  → C2 weekly reports → C4 closeout.

Design prompts for the two new surfaces are §9/§10 in
`docs/design-prompts.md`. Phase 1 has no new top-level pages — it deepens the
opportunity detail and share page.
