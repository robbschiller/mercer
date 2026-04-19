# Mercer — Work plan

This document is the **live execution tracker**: what is shipped, what is next, what is paused, and what decisions block progress.

**Strategy, positioning, personas, full product scope, AI principles, data-model vision, and milestone roadmap philosophy** live in **[`docs/prd.md`](prd.md)**. Read the PRD for *why*; read this file for *what we are doing now*.

Session-by-session implementation notes: [`docs/worklog.md`](worklog.md). Contributor workflow: [`AGENTS.md`](../AGENTS.md).

---

## Product snapshot (today)

The deployed app proves **lead → bid → shareable proposal → accept/decline → pipeline visibility** with Places-based lead enrichment, manual overrides, and dashboard funnel metrics. It does **not** yet ship the AI-native agents described in the PRD (qualification agent, capture/takeoff agent, scope reconciliation, negotiation agent, NL reporting). See **PRD §8 — What’s built today** for the authoritative list.

---

## PRD alignment — where engineering should focus next

These rows connect **near-term repo work** to **PRD sections**. “Next” is suggestive ordering; adjust in *Open now* below when priorities change.

| PRD area | § | Shipped (high level) | Gap / next |
|----------|---|----------------------|------------|
| Lead capture & qualification | 5.1 | CSV import, mapping, source tags, Places enrichment, lead list/detail, statuses, manual address override | PRD wants **qualified** pipeline + **ranking/briefs** — today enrichment is Places/satellite, not full qualification agent (`qualification_score`, briefs). |
| Capture & takeoff | 5.2 | Manual bid flow: buildings, surfaces, pricing, PDF proposal | PRD **Milestone 1**: capture-first takeoff agent — not started. |
| Scope reconciliation | 5.3 | — | Not started (structured scope object + agent). |
| Proposal as live surface | 5.4 | Public `/p/[slug]`, accept/decline, share link, status propagation | **mailto:** shortcut (PRD §5.4); photos/hover/comments/negotiation deferred per PRD. |
| Project layer | 5.5 | — | Auto **project on accept** + project UI not built (PRD Phase 1 project slice). |
| Pipeline & reporting | 5.6 | Dashboard funnel, drill-downs, proposal-based $ | NL query surface deferred; **qualified** stage naming vs app’s lead statuses — reconcile when qualification ships. |

---

## Roadmap milestones (PRD §9) — status at a glance

Capability milestones from the PRD — **not calendar sprints**. Update this table when a milestone materially advances.

| Milestone | PRD §9 | Focus | Status |
|-----------|--------|-------|--------|
| M1 Capture-first bidding | §9 | Mobile capture, vision takeoff draft, evals | Not started |
| M2 Scope reconciliation | §9 | Structured scope + gap agent | Not started |
| M3 Lead qualification agent | §9 | Ranked pipeline + briefs | Not started |
| M4 Proposal live surface (full) | §9 | Comments, scope-change negotiation | Partially (basic public proposal + accept/decline shipped) |

---

## Active work — single source of truth

Update this section in the same PR when status changes ([`AGENTS.md`](../AGENTS.md) → Definition of Done).

### Open now (priority order)

1. [ ] **Phase F — demo polish**
   - [ ] Onboarding blurb on `/leads/import`
   - [ ] Empty states and error messages on key views
   - [ ] Seed a clean sample import for Jordan’s account
   - [ ] End-to-end test with a real attendee CSV
   - [ ] Record a backup 3-minute demo video
2. [ ] **Phase D2 — `mailto:` Email Proposal shortcut** on bid detail (aligns with PRD §5.4).
3. [ ] **Phase A2 — sort leads by estimated bid** — gated on footprint/estimate fields (Phase B1). While B1 is paused, optional: explicit **sort by created date** control if product wants sort without estimates.

### Paused / deferred by decision

- **Phase B1 — footprint-based sqft + preliminary bid estimate** (`footprint_sqft`, `est_total_sqft`, `est_bid_amount`, `needs_review`). OSM tuning failed Day-0 plausibility targets; UI hidden until private Overpass (`OVERPASS_API_URL`) + containment strategy. Details: [`docs/worklog.md`](worklog.md) (2026-04-16 OSM tuning).
- **Photos in proposals (Rob’s ask)** — multi-day; post-demo / PRD deferred bucket.
- **XLSX import** — cancelled; CSV-only.

### Decisions needed

- [ ] **Production server-side Places API key** for `enrichLead` (vs dev referrer-restricted key).
- [ ] **Real trade-show CSV from Jordan** vs [`scripts/fixtures/trade-show-sample.csv`](../scripts/fixtures/trade-show-sample.csv).
- [ ] **Supabase email confirmation** — on vs off vs pre-seeded demo account for frictionless demos.

### Pre-work checklist

- [x] Validate enrichment on sample multifamily properties (Places 10/10; OSM poor — Places-only path).
- [ ] **Get real attendee CSV from Jordan.**

### Shipped (summary)

- **Phase A** — CSV import, auto-mapping, leads list (cards + table), filters, lead detail, source tags.
- **Phase B (Places-only)** — `enrichLead`, resolved address + lat/lng + place id, satellite on lead detail, manual property override (`?edit=property`).
- **Phase C** — `bids.lead_id`, lead → bid pre-fill, lead **quoted** on proposal generate, **won/lost** from public share response.
- **Phase D** — `/p/[slug]`, proposal shares, accept/decline, bid/lead status propagation, share + copy link on bid detail.
- **Phase E** — Pipeline on **`/dashboard`** (funnel, source filter, `/leads` drill-down with `?status=` / `?source=`), proposal-based open vs won dollars.
- **Phase F** — (nothing checked yet — see Open now.)
- **Infra** — Next.js 16, `src/proxy.ts`, [`AGENTS.md`](../AGENTS.md).

---

## MVP demo checklist (Jordan / two-week POC)

Historical phases **A–F** below are folded into checkboxes here and in *Open now* so we do not maintain two competing lists.

**Goal (still useful as a demo bar):** CSV → enriched leads → bid → shareable URL → customer accept → visible in pipeline.

1. [ ] Jordan (or proxy) runs a **real** attendee CSV through import.
2. [x] Lead → bid → proposal → share link → accept/decline updates bid + lead.
3. [ ] **`mailto:`** sends proposal URL in one tap from bid detail.
4. [x] Dashboard shows funnel / pipeline story (scoped version on `/dashboard`).
5. [ ] Walkthrough **under five minutes** with polish items in Phase F done.
6. Phase F artifacts: onboarding copy, empty states, seeded demo data, backup video.

---

## Archived: phase breakdown (two-week POC)

The following tracked the original **lead-to-close POC** build. Items are **historical**; authoritative status is *Active work* and *Shipped* above.

### Phase A — Lead ingestion

- [x] `leads` table, CSV upload, **server-side** parse ([`src/lib/leads/csv.ts`](../src/lib/leads/csv.ts)), auto-mapping, source tag, bulk insert.
- [x] `/leads` views, source filter, status editing.
- [ ] Sort by est. bid (blocked on B1) — see Open now.

### Phase B — Enrichment

- [x] Places enrichment path + statuses + lead detail + manual override.
- [~] OSM footprint + est. sqft + est. bid — **paused** (see Paused).

### Phase C — Lead → bid

- [x] All items (FK, pre-fill, linkage, quoted on proposal).

### Phase D — Shareable proposal

- [x] Public page, snapshot UI, accept/decline, propagation, share UI.
- [ ] `mailto:` shortcut — Open now.

### Phase E — Pipeline

- [x] Delivered on `/dashboard` (no separate `/pipeline` route).

### Phase F — Demo prep

- [ ] See **Open now → Phase F**.

---

## Risks & demo notes (short)

- **Enrichment**: Places-only path validated; OSM paused — demo story is “resolved address + satellite,” not footprint-accurate sqft estimates.
- **Data quality**: sparse CSVs still need manual address override on lead detail — keep that visible in demo.
- **Scope creep**: park non-PRD asks in backlog; PRD §5–§9 defines the north star.

For longer narrative (competitive landscape, Jordan walkthrough context, post-demo decisions), see **PRD §4–§7** and **§10** if present.

---

## Success criteria (demo)

1. [ ] Real CSV import demo path confident.
2. [x] End-to-end proposal URL + accept path works.
3. [ ] `mailto:` shortcut for sending URL.
4. [x] Pipeline visible on dashboard.
5. [ ] Five-minute narrated walkthrough + Phase F polish complete.
