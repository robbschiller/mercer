# Roadmap — closing the gap between the 2026-09-02 customer meeting and the app as it stands

Source: Jordan's meeting notes (transcribed 2026-09-02 morning), a transcript analysis pass, and an information-architecture audit of the codebase at commit `4c6d628`.

**Status (2026-09-02, end of day): Phase 0 and Phase 1 (1a–1e except the README/Start-lead nits) are shipped and verified — see `docs/plan.md` → "Shipped 2026-09-02" and `docs/worklog.md`. Phase 2 shipped the same afternoon (roadmap §4 → `docs/plan.md` "Shipped 2026-09-02"). Phase 3 (AI inside the opportunity) remains deferred.**

---

## 1. What the customer asked for, in one paragraph

Jordan wants the top of the funnel to match how AQP actually talks about work. A **List** is a raw CSV of people that lives on its own and touches nothing else. A **Lead** is one person from a list (or from anywhere) who has a real work request, created by an explicit **Convert** action. Every lead carries a **Property name** (never just an address) and a separate **Job name** ("Full exterior repaint", "Curb replacement"). "What's the work" should be a **free-text field that remembers what you typed** so it can be picked again and reported on later. The lead page should show "the stuff that matters" and drop the big map. Rough $, job size, and source stay as they are. Underneath all of it: the current deployment becomes **staging**, a **clean production** environment is stood up, and Jordan and Devin share **one org with live real data**.

He gave explicit sequencing:

1. **Now: top of funnel.** Lists → Convert → Leads with property name, job name, work type. Plus the environment split. "Let's just stick with that for now, because he's focused on top of the funnel."
2. **Then: opportunities as fields.** "I'd rather us just have fields. We can still use Claude to make our proposals, 'cause it's so easy. But just getting that tracking down."
3. **Last: AI inside the opportunity.** "Claude, you're just going into the opportunity … and doing everything."

---

## 2. Where the app is today (the parts that matter for this)

Verified in code and in the live database. File references are to `src/`.

**Navigation.** Sidebar has six items: Home, Leads, Opportunities, Jobs, Contacts, Reports (`components/app-sidebar.tsx:54-66`). The "+" menu offers New lead, New opportunity, New contact. CSV import is not in the sidebar or the "+" menu; it is a secondary button on `/leads` and `/contacts` that goes to `/contacts/import`. `/pipeline`, `/properties`, and `/ask` exist but have no nav entry.

**Data model.** Property-rooted: `accounts` → `properties` → `contacts` via `property_contacts`, with `leads` and `bids` hanging off the property (`db/schema.ts`, `docs/lead-data-model.md`).

- `properties.name` exists but is nullable (`schema.ts:81`). No intake form shows a property-name field; `/leads/new` submits whatever label the Places pin or address string had (`components/new-lead-intake.tsx:595`).
- `leads.name` is NOT NULL and is documented as the project title (`lib/store.ts:2952-2954`). The intake form labels it "Name the project", hides it inside a collapsed "Add more — All optional" section, and pre-fills it with the property name (`new-lead-intake.tsx:727-787`). CSV import writes the **person's** name into the same column (`store.ts:4744`). One column, two meanings.
- `leads.scopeCategory` is a `text[]` fed by five hard-coded chips: Full exterior, Breezeways, Stairs, Wood rot, Interior common (`new-lead-intake.tsx:66-72`). Not editable after creation.
- `leads.estValue`, `leads.isLargeJob`, `leads.sourceTag` exist and are captured at intake. Source tags already follow the "remember what you typed" pattern via `getLeadSourceTags()` (`app/(app)/leads/new/page.tsx:15-17`).
- `bids.label` is the opportunity name; `bids.propertyName` is NOT NULL. The opportunity header titles the card by property name and demotes the label to a description line (`components/bid-summary.tsx:283-291`).
- There is **no list entity**. No `lists`, `imports`, or `import_batch_id` anywhere.

**CSV import.** `/contacts/import` takes a file and a source tag with no preview or mapping UI. The page copy says "A contact becomes a lead later, when there is an actual work request." The write path does the opposite: `createLeadsBatch` inserts a `leads` row per CSV row at status `takeoff` (`store.ts:4698-4783`). It has no idempotency guard, so re-uploading a file duplicates every lead. Result in the shared database: 1,389 leads, of which roughly 98% are un-worked CSV rows from three files.

**Lead detail page.** The whole page is `PropertyProfile` with the lead workflow injected as a slot (`app/(app)/leads/[id]/page.tsx:167-179`). Top to bottom: a hero with a 176px satellite tile and a ledger rail (Lifetime value, Win rate, which read "$0" and "—" for any new lead), then the lead panel, then Projects timeline, Relationship history, Standing photo record, Specs & takeoff, Contacts at property. For an imported lead that is roughly a full screen of empty panels before anything lead-specific. The intake page also shows a 288px aerial card once a building is locked (`components/property-finder.tsx:509-540`).

**Conversion paths.** The only conversion in the app is lead → opportunity (`components/lead-detail-body.tsx:288`). There is no contact → lead or property → lead action that carries context. "Start lead" on a property links to bare `/leads/new`.

**Org and environments.**

- Org model already supports a shared account: `org_memberships` with owner/admin/member roles and email-keyed invite auto-accept (`lib/org-context.ts:31-102`), invite UI at `/settings/members`. But **no invite has ever been accepted**. The table has two rows, both still `invited`. Every user on the database, including Jordan and Devin, is a solo owner of an isolated tenant.
- **One Supabase project serves local dev, Vercel preview, and Vercel production.** Verified by pulling Vercel env: production's `NEXT_PUBLIC_SUPABASE_URL` is `mgytgrxpgjhowvvustry`, the same ref as `.env.local`. The preview environment has no Supabase variables at all. `bun run db:push` from a laptop writes the database production reads.
- The database holds ten auth users: three AQP staff, Jordan's two accounts, Robb's three, Tim, and the Claude test account. Test, demo, and real data are interleaved. The dominant account (Robb's gmail) holds 1,230 leads from the BAAA trade-show import.

---

## 3. The gaps, ranked by how load-bearing they are

"Load-bearing" means: does it change the data model, does it unblock other items, does it decide what data gets captured from day one in production. Size is a rough engineering estimate (S = hours, M = a day or two, L = several days).

| # | Ask | Customer words | Today | Change | Load-bearing | Size |
|---|-----|----------------|-------|--------|--------------|------|
| 1 | Clean production + staging; Jordan and Devin in one org | "turn everything right now into the staging environment and make a clean, fresh production environment … where you and Devin can be in the same account … live real data" | One Supabase project for everything; no accepted org invites; test and real data mixed | New Supabase project for prod; current one becomes staging; Vercel production env → new project, preview env → staging; one AQP org with Devin invited | Highest. Every schema change below should land before real data enters prod | M |
| 2 | Lists as a standalone object with Convert | "lists … just raw CSV of people … unrelated object to anything else … a convert button" | Import mints a lead per row; no list entity; no convert action; re-import duplicates | New `lists` + `list_rows` tables; import creates a list only; per-row Convert creates contact + property + account + lead through the existing `createLead` path | High. Inverts import semantics; decides whether prod's leads table is clean | L |
| 3 | Job name separate from property name | "we need the ability to put a job name … I think it's good if we just separate those" | `leads.name` is the job title but labeled "Project name", optional, hidden, defaulted to the property name; CSV rows put a person's name in it | Relabel to Job name, make it visible and required, stop defaulting from the property, keep it flowing into `bids.label`; never write a person's name into it again | High. Semantics must be right before prod accumulates rows | S |
| 4 | Property name always present, next to address | "I need the name of the property … There's never a time where we do something where there's not a name, or the address" | `properties.name` nullable and never shown as an input at intake | Visible, required Property name field at intake and on the lead header, prefilled from Places, editable; backfill then `NOT NULL` | High | S/M |
| 5 | Work type as free text that remembers itself, reportable | "a text field for what's the work … it saves it too, so that you can select it again … run a report later" | Five hard-coded chips; not editable after create; no report | Replace chips with a type-ahead over the org's previously used values (same pattern as source tags); keep `scopeCategory text[]`; make it editable; add "work by type" to `/reports` | Medium-high. Cheap, but the vocabulary must be org-saved for the report | S/M |
| 6 | Lead header like the opportunity header; drop the big map | "we don't need this big map … I just want to see the stuff that matters"; "is the header … more like what you want from the Leads header? Yes. Exactly." | Lead page is a property profile with the lead inside it; aerial card on intake; satellite tile in the hero | Compact shared header (property name, job name, status, contact, company, address) used on both lead and opportunity; remove the aerial card from intake; move property panels below or behind a disclosure | Medium. UI only, but gives #3 and #4 a home | M |
| 7 | Company comes with the contact; still addable if missing | "The company should ideally come with that … if they don't, you still wanna add it" | Works: contact pick shows company; account autocomplete with free-text fallback | Ensure Convert from a list row carries company through; no other change | Low | — |
| 8 | Keep rough $, job size, source | "rough number. We want that. Job size is fine, and then where did it come from? All that's good." | All three exist | Keep. Make them editable after creation (they aren't today) | Low | S |
| 9 | Straight-to-opportunity without a lead | "what if they just go straight to an opportunity … I guess it's fine. We just look up the name." | Works; `/opportunities/new` looks up properties by name | Depends on #4 so the lookup has real names to match | Low | — |
| 10 | Opportunities as fields, proposals still via Claude externally | "I'd rather us just have fields … just getting that tracking down" | Opportunity page leads with the AI quote engine; plain fields are in the header | Phase 2: make the opportunity a tracking record first (amount, sent date, expected close, status, contact); collapse the quote engine by default; title the card by job name | Medium, sequenced second | M |
| 11 | AI does everything in the opportunity | "the last piece … Claude … doing everything" | Quote engine and AI actions exist as scaffolding | Phase 3. No work now | Low now | — |

Also worth fixing while in this code, not asked for but surfaced by the audit:

- `importLeadsAction` redirects errors to `/leads/import`, which does not exist (`lib/actions.ts:1274-1276`).
- `bids` has no `is_large_job`; the wizard collects it and writes it to the lead, so a standalone opportunity loses it (`lib/actions/create-bid.ts:30,52-56`).
- New-opportunity's Client field is free text while new-lead's is an account autocomplete (`components/new-bid-intake.tsx:437-449`).
- `docs/plan.md:23,151` already records the "promote contact to lead so imports stop masquerading as leads" gap. This roadmap supersedes that line.
- `README.md` route table still lists `/bids` and `/takeoff-queue`.

---

## 4. Phased plan

### Phase 0 — Environments (do first; nothing else is safe to ship into prod until this is done)

Goal: current database becomes staging; a fresh production database with only AQP's real data; Jordan and Devin share one org.

1. Create a new Supabase project for production. Apply `drizzle/manual/*.sql` one file at a time (the bulk runner is known broken, see worklog note 021), or `drizzle-kit push` from a clean schema, then verify with the drift check that every column in `schema.ts` exists.
2. Re-point Vercel: production env vars → new project; preview env vars → the existing project `mgytgrxpgjhowvvustry` (today preview has none). Keep `.env.local` on staging. Consider a `.env.production.local` pattern so a laptop can never accidentally `db:push` to prod.
3. Create the AQP org in prod. Decide the owner (Jordan, presumably). Invite Devin by email from `/settings/members`. The invite auto-accepts on Devin's first sign-in as long as he has no active membership row, which is the case today.
4. Seed prod: company profile, pricing defaults, the catalog (Jordan's price list CSV importer already exists at `/settings/catalog`). Do not migrate the 1,389 leads. If Jordan wants the BAAA or Tampa lists in prod, they should enter as Lists under Phase 1, not as leads.
5. Deployment hygiene already flagged in docs: server-side Places key and a private Overpass instance are listed as production blockers in the worklog. Confirm whether they still block, since enrichment is not in this phase's critical path.

Open decision: wipe-and-reseed prod (recommended, matches "clean, fresh") versus migrating Jordan's and Morgan's existing rows. If migrating, only the AQP-domain accounts' rows, and only after Phase 1 schema changes land.

### Phase 1 — Top of funnel (the "now" work)

Ship in this order so each step gives the next one a home. Land the schema pieces before prod gets real data.

**1a. Property name and job name on the lead (items 3, 4).**
- Intake (`components/new-lead-intake.tsx`): after the building is locked, show two visible required inputs above "Who's it for?": **Property name** (prefilled from the Places name if it isn't just an address, otherwise blank) and **Job name** (blank, placeholder "Full exterior repaint"). Remove the property-name default from the job field. Remove the collapsed "Add more" wrapper for these two; the rest of the optional fields can stay collapsed.
- Validation (`lib/validations.ts` `createLeadSchema`): require both.
- Store: `createLead` already writes `properties.name`; keep `leads.name` as the job name (no column rename, to avoid touching the bid handoff at `new-bid-intake.tsx:89-95`). Add a manual migration to backfill null `properties.name` from address, then `NOT NULL`.
- Edit form (`components/lead-detail-body.tsx`): relabel "Project name" to "Job name"; keep the Property name input.
- Stop CSV import from writing a person's name into `leads.name`. Once 1b lands, import no longer creates leads at all, so this resolves itself; until then, guard it.

**1b. Lists and Convert (item 2).** The biggest piece.
- Schema (new manual migration): `lists` (id, user_id, name, source_tag, file_name, row_count, created_at) and `list_rows` (id, list_id, first_name, last_name, email, phone, company, property_name, address, raw_row jsonb, converted_lead_id nullable, converted_at nullable, created_at). Org-scoped by `user_id` like everything else.
- Import: rewrite `importLeadsAction` and `/contacts/import` to create one list and its rows, nothing else. Move the page to `/lists/import` or `/lists/new`. Keep the existing header auto-mapper (`lib/leads/csv.ts`); add a small preview of the first five mapped rows so the user can see the mapping before committing. Add a per-file idempotency check (same file name and row count for the same org → warn).
- Pages: `/lists` (one row per list, with converted/unconverted counts) and `/lists/[id]` (a table of rows with search and a **Convert** button per row). Add "Lists" to the sidebar between Home and Leads, and "Import list" to the "+" menu.
- Convert: a server action that takes a list row, opens `/leads/new` prefilled with contact, company, property name, and address from the row, and on submit stamps `converted_lead_id` on the row. Reuse `createLead`, which already does find-or-create for account, property, contact, and `property_contacts`. The row stays in the list, marked "Converted → lead" with a link.
- Contacts: decide whether list rows should also become `contacts` on import. Recommendation: no. Jordan said the list is "unrelated to anything else." A contact is minted at Convert time.
- Existing data: in staging, optionally back-fill import-sourced leads (source tag present, no bid, status still `takeoff`, never contacted) into lists so `/leads` stops showing 1,200 raw rows. In prod this never arises.

**1c. Work type as remembered free text (item 5).**
- Replace the `SCOPE` chips with a type-ahead input that suggests distinct values the org has used before (query `unnest(scope_category)` grouped, mirror `getLeadSourceTags`). Allow multiple values. Keep the column as is.
- Make work type, rough $, job size, and source editable on the lead detail edit form (item 8).
- `/reports`: add a "Work by type" panel (count and estimated value per work type), next to the existing "Lead sources" panel.

**1d. Slim the lead page and share the header (item 6).**
- New `LeadHeader` component: property name, job name, status badge, primary contact, company, address, one-line. Use it on `/leads/[id]` and make `BidSummary` render the same shape on `/opportunities/[id]` (title by job name, property name second).
- `/leads/[id]`: render the header, then the lead panel (status, outreach, follow-up, Convert to opportunity), then attachments and photos. Move the `PropertyProfile` panels (relationship history, specs, contacts at property, ledger rail) under a "Property" disclosure or a tab. Drop the satellite tile from the lead hero.
- `/leads/new`: remove `AerialBuildingCard`; replace with a one-line "Pinned: {address}" confirmation with a change link. Leave the opportunity page's satellite and OSM sections alone; he did not ask for those to go.

**1e. Small fixes alongside.** The `/leads/import` 404, the "Start lead" button on a property carrying the property through as a prefill, README route table.

Exit criteria for Phase 1: Jordan can upload a trade-show CSV, see it as a list, convert one person into a lead with a property name and job name, tag the work type from his own vocabulary, log a contact attempt, and see the work-type report, all in prod with Devin on the same account.

### Phase 2 — Opportunities as a tracking record (item 10)

Only after Jordan says the top of funnel feels right.

- Title the opportunity by job name (`bids.label`), property name second.
- Add the tracking fields he needs: quote amount (manual, not computed), sent date, expected decision date, contact. Confirm the list with him first (open question below).
- Collapse `QuoteEngine`, buildings, access, and pricing sections by default. Do not remove them.
- Carry `isLargeJob` onto `bids` so standalone opportunities keep it.
- Account autocomplete on the new-opportunity Client field for parity with new-lead.
- Consider folding `/pipeline` into either `/leads` or `/opportunities` so there is one place to see in-flight work.

### Phase 3 — AI inside the opportunity (item 11)

Not now. The scaffolding (`lib/actions/generate-quote-draft.ts`, `job-ai.ts`, `QuoteEngine`) stays in place behind Phase 2's collapsed sections. Revisit once Phase 2 fields have a few months of real quotes to learn from.

---

## 5. Proposed data-model changes, summarized

| Table | Change | Migration |
|-------|--------|-----------|
| `lists` | New. One row per uploaded CSV | 044 |
| `list_rows` | New. Raw people rows with `converted_lead_id` | 044 |
| `properties.name` | Backfill from address, then `NOT NULL` | 045 |
| `leads.name` | No schema change. Semantics fixed to "job name"; required and visible in UI; never a person's name | none |
| `leads.scope_category` | No schema change. Fed by type-ahead over org history instead of fixed chips | none |
| `bids.is_large_job` | New nullable boolean, written by `createBidAction` | Phase 2 |
| `bids` tracking fields | Quote amount, sent date, expected decision date | Phase 2, after confirming with Jordan |

Everything additive, per `AGENTS.md`. Apply migrations one file at a time.

---

## 6. Questions to confirm with Jordan before building

1. **Convert semantics.** Convert creates contact + property + account + lead in one go (recommended). Should the row disappear from the list, or stay marked converted with a link? Can the same person be converted twice for two different properties?
2. **Is a list the same thing as contacts?** Recommendation is that list rows are *not* contacts until converted. Confirm he does not expect list people to show up under `/contacts`.
3. **Job name versus work type.** "Full exterior repaint" and "curb replacement" were examples of both. Recommendation: job name is free text and unique to this lead; work type is the remembered vocabulary and can have several values. Confirm.
4. **Property name requiredness.** Both name and address required (recommended), or either one?
5. **Which map.** The intake aerial card, the lead hero tile, or both? Plan removes both from lead surfaces and leaves the opportunity page alone.
6. **Production cutover.** Wipe-and-reseed (recommended) or migrate the AQP accounts' existing rows? Who owns the org, Jordan or Devin?
7. **Phase 2 fields.** Which handful of fields does he need to track a quote so the AI engine can be tucked away?
8. **The report.** Is count and dollars by work type on `/reports` enough, or does he want an export?

---

## 7. Explicitly not doing now

- Removing the quote engine, buildings, access, or pricing sections. They get collapsed in Phase 2, not deleted.
- Multi-tenant SaaS work. `docs/plan.md` recorded on 2026-05-29 that this is an AQP-specific app. One shared org is all that is needed and the model already supports it.
- Re-architecting `store.ts`. It is 9,000 lines and will be tempting; not this cycle.
- Dashboard prompt command bar (current item 1 in `docs/plan.md` "Open now"). Jordan's priorities move it below Phase 1.
