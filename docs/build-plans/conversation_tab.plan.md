# Build plan — Conversation tab (entity-scoped LLM chat)

**Status:** **P1 shipped 2026-06-09** (read-only Q&A, offline mock). P2 (persistence) + P3 (in-chat actions) remain. Shipped as the **"Ask"** tab (`/ask`).
**Relates to:** PRD §5.6 (NL query/reporting surface, currently "deferred"), Open-now #1 (dashboard prompt command bar / prompt-bidding boundary), [`parse-dashboard-intent.ts`](../../src/lib/actions/parse-dashboard-intent.ts), [`dashboard-quick-actions.ts`](../../src/lib/actions/dashboard-quick-actions.ts).

## Shipped in P1 (2026-06-09)

- `/ask` route + sidebar item; thread UI with "+ Add context" unit search, persistent context chips ([`src/components/ask-chat.tsx`](../../src/components/ask-chat.tsx), [`src/app/(app)/ask/page.tsx`](../../src/app/(app)/ask/page.tsx)).
- 5 unit types: lead, bid/project, property, contact, company. Data layer `searchUnits` + `buildContextPacks` in [`src/lib/store.ts`](../../src/lib/store.ts) (bid pack reuses `getBidPageData` + `calculateBidPricing`).
- `askMercer` server action ([`src/lib/actions/ask.ts`](../../src/lib/actions/ask.ts)): Opus 4.8 when keyed, grounded **offline mock** otherwise. Both run the real search + context resolution.

**Still to do:** P2 persistence, P3 in-chat actions, markdown rendering, streaming, real `ANTHROPIC_API_KEY` (deferred). See the Phasing / Open-questions sections below.

## The idea

A dedicated tab where the user holds a **classic LLM conversation scoped to specific records**. The user **tags "units"** (entities) into the chat; the model answers and reasons with those units' **live data in memory**, and can eventually **perform actions** on them from inside the thread.

Motivating example:

> "What's the amount of the bid the Disney property accepted, again? And how far along are their buildings?"

→ user has tagged the **Disney property** (and/or its accepted bid/project); the model pulls the accepted bid amount + the project's building/delivery progress and answers, grounded in real data. The user can then keep thinking through anything about those records — and (later) act: "bump the margin to 42% and regenerate the proposal."

This is the NL surface the PRD deferred, made concrete and **record-grounded** rather than a generic chatbot — consistent with the prompt-bidding boundary (LLM is the front door; deterministic data/engine is the source of truth).

## The taggable "units" (key data points)

The durable nouns in the graph (see [`data-model`](../lead-data-model.md), [`schema.ts`](../../src/db/schema.ts)):

| Unit | Why it's a conversation target | Context pack (compact) |
|---|---|---|
| **Property** | Jordan's root object; "the Disney property" | address, owner/mgmt accounts, parties/NTO, contacts, child leads + bids/projects (status + $) |
| **Project** (= bid in delivery) | "how far along are their buildings?" | delivery_status, target/actual dates, crew/sub, buildings▸surfaces progress, recent project_updates |
| **Bid** | "what amount did they accept?" | status, computed pricing total, buildings/line items/access, linked lead, proposal/share state |
| **Lead** | pipeline reasoning, outreach history | status, follow-up, contact attempts, activity_events, company/property |
| **Account** (company) | portfolio-level reasoning ("all Greystar work") | type, properties, portfolio count, rolled-up pipeline |
| **Contact** | relationship reasoning | role(s), properties, leads, last contacted |

Stretch: **Proposal** (snapshot + accept/decline trail). Out of scope as a unit: line items/surfaces (reached *through* a bid/project, not tagged directly).

## Mechanism (sketch)

1. **Tag** units via `@`-mention autocomplete (or a picker) → resolve to `{type, id}` refs. Reuse existing search getters (`searchAccounts`, leads/contacts/property queries).
2. **Context packs** — server serializers that turn each tagged ref into a compact, token-bounded JSON/markdown summary (the table above). New code; lean on existing `store.ts` getters + `ProjectView`.
3. **Model call** — Opus 4.8 via the existing Anthropic setup; packs go in a cached system block, the question in the user turn. Stream the answer.
4. **Tool-calling (phase 2)** — expose read tools (fetch more detail on a unit) and act tools (reuse `dashboard-quick-actions` + bid/project mutators) behind the same review/confirmation boundary as the command bar. Deterministic engine still owns pricing.
5. **Persistence** — new `conversations` + `conversation_messages` (+ `conversation_refs`) tables so threads survive reloads and the model has multi-turn memory.

## Phasing

- **P1 — read-only Q&A.** Tab + thread UI, unit tagging, context packs, single-turn grounded answers with citations back to the record. No writes, no persistence (or ephemeral).
- **P2 — multi-turn + persistence.** Conversation tables, history, follow-ups that keep tagged units in scope.
- **P3 — actions in-chat.** Tool-calling for the quick-actions + bid/project mutators, behind confirmation; "do it in chat OR in the UI" parity.

## Open questions

- **Tab name.** Candidates: **Ask**, **Chat**, **Threads**, **Copilot**, **Studio**. Composer already says "Ask Mercer," so **Ask** or **Chat** reads most natural. (Decide before P1.)
- Token budget per tagged unit + max units per thread.
- Persist conversations, or ephemeral until P2?
- Permissions: org-scoped only (tagged units must belong to the caller's org — enforce in the resolver/context-pack layer, same as `getOrgContext`).
- Requires `ANTHROPIC_API_KEY` (deferred until the business provisions one; the keyword mock does not extend to free-form chat).
