# The Yvonne Test — build plan

*2026-07-14. Four features that close the gap between today's quote engine and the
screenshot of Jordan using Claude: aerials + spec PDF + "Type 1 (3) – 700×22" notes +
one messy sentence in → an impressive, branded proposal out — with clarifying questions
when the input has gaps, and unit rates for work he can't quantify yet. See
`docs/features.md` Part 2, Pillar 1–2.*

**Shared migration `036_yvonne_test.sql`** (one file, applied individually per convention):

```sql
-- C: unit-rate ("as found") lines are priced but carry no committed quantity
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS rate_only boolean NOT NULL DEFAULT false;
-- A: lines can cite a document (spec PDF, aerial) the same way they cite photos
ALTER TABLE line_items ADD COLUMN IF NOT EXISTS evidence_attachment_id uuid
  REFERENCES attachments(id) ON DELETE SET NULL;
-- B: clarifying Q&A for the in-flight draft (cleared at approve, like draft_scope_text)
ALTER TABLE bids ADD COLUMN IF NOT EXISTS draft_clarifications jsonb;
-- D: per-share personalization ("Prepared for Yvonne …")
ALTER TABLE proposal_shares ADD COLUMN IF NOT EXISTS recipient_name text;
-- D: company blocks the branded proposal renders
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS about_blurb text;
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS credentials text;   -- license / insurance
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS cover_letter_template text;
```

Ordering: **C → A → B → D**. C is smallest and D renders what A–C produce. Each feature
ships + verifies independently (Playwright drive per the verify skill).

---

## C — Unit-rate lines (~half a day)

**Goal.** Jordan's exact ask: *"include our unit costs for woodrot boards and stucco —
we don't have quantities, I just want them to know what they'll pay."* A line with a
price and no committed quantity, excluded from the total, rendered as a rate card.

**Data.** `line_items.rate_only` (036). Rate lines: `qty = NULL`, `amount = 0`,
`unit_price` + `unit` required. Totals already sum `amount`, so exclusion is free.

**Engine.** `QuoteDraftLineSchema`: `qty` becomes `.nullable()`, add `rateOnly: z.boolean()`.
Prompt (generate-quote-draft.ts): "When the scope names work without quantities
('as found', 'a couple', 'if needed'), emit a rate-only line: unit price from the catalog,
qty null." `replaceAiDraftLines` maps rateOnly → column.

**Review UI (quote-engine.tsx / QuoteReviewCard).** Rate lines render in an
"Unit rates — billed as found" group under the committed lines; qty cell shows "as found";
a toggle converts committed ⇄ rate-only (server action recomputes). Draft-total card notes
"+ N unit rates".

**Snapshot / PDF / portal.** `SnapshotLineItem` gains `rateOnly?: boolean`;
`generateProposal` includes rate lines in `lineItems` but not `grandTotal`. PDF template +
`/p` portal render a separate "Unit rates — as found work" table with footnote: *"Billed at
the listed rate as work is found and approved (see Additional Work)."*

**Verify.** Scope "…include woodrot board replacement and stucco patch rates, no
quantities" → draft has rate lines; total excludes them; PDF + portal show the rate card;
accept → contract value = committed total only.

---

## A — Drop-anything intake (~1–2 days)

**Goal.** The Build Quote card accepts what Jordan actually has: spec PDFs, annotated
aerial screenshots, dimension notes, photos. The engine reads all of it and cites it.

**Files in.** Extend the existing quote-card dropzone to route by type: images →
`photos` (kind `takeoff`, unchanged); PDFs/docs/text → `attachments` (context `bid`,
infra shipped in Jordan fix-list #1). Card shows both: "3 photos · 2 documents will be
referenced." Add paste-target for raw text notes (appends to scope with a divider).

**Engine assembly (generate-quote-draft.ts).**
- Images: already sent as vision blocks by URL. Aerials are just images — prompt gains
  "aerial/satellite screenshots may carry annotations (arrows, outlines, counts); read them."
- PDFs: fetch from the attachments bucket, send as Anthropic **document content blocks**
  (base64). Caps: ≤3 documents, ≤10 MB total, else fall back to filename mention +
  flag "spec PDF too large — summarize manually."
- Dimension math: prompt gains "dimension notes like 'Type 1 (3) – 700×22' mean
  (count) × length ft × height ft; derive sqft (3 × 700 × 22 = 46,200) and show the math
  in the rationale."
- Provenance: request gains a numbered document list; `QuoteDraftLineSchema` gains
  `evidenceDocumentIndex: z.number().nullable()` → `line_items.evidence_attachment_id` (036).
  Review card's "Why" drawer shows the document chip next to the photo chip.

**Verify.** Upload a small spec PDF + an aerial + dimension text; draft lines cite the
document; qty math matches the note; review drawer shows citations.

---

## B — Clarifying questions (~1 day, after A)

**Goal.** "Ask me if you need something." When inputs have blocking gaps the engine asks
2–3 pointed questions instead of guessing.

**Contract.** `QuoteDraftSchema` becomes a union:
`{ kind: "draft", lines, changeLog, summary }` |
`{ kind: "questions", questions: [{ question, why, suggestion? }] }` (≤3).
Prompt: "Ask ONLY when an answer would change a line by >10% or add/remove a line
(unit count, occupied vs vacant, color change, which buildings are in scope).
Never ask twice — if answers are still incomplete, draft with stated assumptions and
flag those lines."

**State.** `bids.draft_clarifications` jsonb `[{question, why, answer}]` (036), persisted
so an interrupted session resumes; cleared at approve alongside `draft_scope_text`.
`generateQuoteDraft` appends prior Q&A to the context on the second pass. **Hard cap: one
round** — the second call must return `kind: "draft"` (schema for round 2 omits the
questions arm).

**UI (quote-engine.tsx).** New phase `clarify` between `generating` and `review`:
question cards (question + muted "why it matters" + input, prefilled with `suggestion`),
one primary button "Answer & draft", secondary "Skip — draft with assumptions".
Version rail shows the round: "v2 · Asked 2 questions".

**Verify.** Scope deliberately omitting unit count on a multi-building property → engine
asks; answering changes the drafted quantities; skipping yields assumption-flagged lines;
approve clears `draft_clarifications`.

---

## D — Branded proposal upgrade (~2–3 days)

**Goal.** The `/p` page a PM forwards to their board: AQP branding, a cover letter for
Yvonne, property imagery, scope with evidence photos, credentials — artifact quality.
The PDF stays the print twin.

**Company profile (exists, extend).** `company_profiles` already has logo_url,
primary/accent color, fonts, tagline, address, phone (+ website enrichment). Add
`about_blurb`, `credentials`, `cover_letter_template` (036) + fields on
Settings → Company, and a logo *upload* (bucket `photos` or a small `branding` prefix in
`attachments`) for when enrichment found nothing.

**Personalization.** "Prepared for" name on the post-stamp panel and the version-rail
copy control → `createProposalShare(proposalId, { recipientName })` (036). Cover letter =
template with `{recipient}`, `{property}`, `{total}` merge fields; editable per share
before copying.

**Snapshot additions (frozen at stamp, per immutability rule).** `brand: { companyName,
logoUrl, primaryColor, accentColor, tagline, aboutBlurb, credentials, phone, email }`,
`coverPhotoUrl` (picker: property/bid photos + satellite; default = satellite if coords),
`preparedBy`. Older snapshots render exactly as today (all optional).

**Portal (`/p/[slug]/page.tsx`) — new layout, old data guarded.**
1. Branded header: logo + company name, accent-colored rule; hero cover photo with
   property name/address overlaid.
2. Cover letter card ("Prepared for Yvonne — …", signed with preparedBy + phone/email).
3. Scope story: line groups by category, each group showing its evidence photos
   (`evidencePhotoId` → thumbnails) beside the lines they justify.
4. Committed lines table → total; **unit-rate card** (C).
5. About / credentials block (license, insurance, tagline).
6. Respond (unchanged mechanics: accept/decline, one response per share, status pivot).
   Accent color drives the accept button. Dark-mode safe; print stylesheet decent.

**PDF (proposal-template.tsx).** Logo + accent color on the header, cover page with hero
photo + prepared-for, credentials footer. Keep the fixed-template principle — branding is
data, not layout freedom.

**Verify.** Stamp on the test bid with a filled company profile → portal shows logo/colors/
cover letter with recipient name; snapshot from BEFORE the feature still renders; accept
still pivots to status page; PDF carries the branding.

---

## Explicitly out of scope (this tranche)
E-signature/deposits, outbound email, first-view notifications, aerial takeoff assist,
options/alternates — all in `docs/features.md` Pillar 2–4, sequenced "Next."

## Risks
- **PDF document blocks**: request size limits with base64 PDFs — enforce the ≤3 docs /
  10 MB cap and degrade gracefully (named-but-unread files get a visible warning chip).
- **Two-phase generation cost/latency** (B): the questions round is cheap (no lines), but
  the UX must make "Skip" effortless so speed-sensitive users never feel taxed.
- **Snapshot bloat** (D): brand block is small; cover photo stored by URL, not bytes.
- **Old snapshots** (C/D): every new snapshot field optional; portal/PDF branch on presence.
