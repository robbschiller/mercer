---
name: MCP server
overview: "Expose Mercer's lead, bid, and project data over the Model Context Protocol so Claude (web, desktop) and ChatGPT (connectors) can read and write against a contractor's tenant. Ships as a remote Streamable-HTTP server inside the Next.js app, authenticated by per-user personal access tokens. Reuses the existing store layer; user context threads through AsyncLocalStorage so no helper signatures change."
todos:
  - id: decide-transport
    content: Lock to Streamable HTTP transport (not stdio, not legacy SSE). Document why in the plan.
    status: completed
  - id: decide-auth
    content: Lock to per-user PAT (`mcp_<hex>`) for v1; defer OAuth 2.1 + DCR to v3.
    status: completed
  - id: schema-tokens
    content: Add `api_tokens` table + manual migration. Hashed token, last-used, revoked-at, name.
    status: pending
  - id: token-helpers
    content: `createApiToken`, `revokeApiToken`, `findApiTokenByHash`, `touchApiTokenLastUsed` in store.ts.
    status: pending
  - id: settings-tokens-ui
    content: `/settings/api-tokens` page — list, create (one-time-reveal), revoke. Server actions wire token store helpers.
    status: pending
  - id: user-context-als
    content: Introduce `src/lib/user-context.ts` — AsyncLocalStorage holding `{ userId, email, source: 'cookie' | 'header' | 'mcp_token' }`. Refactor `requireUser` to read ALS first, fall back to header/cookie.
    status: pending
  - id: mcp-route
    content: `/api/mcp/route.ts` — Streamable HTTP handler that resolves Bearer token, opens ALS scope, dispatches to MCP SDK.
    status: pending
  - id: mcp-server-init
    content: `src/lib/mcp/server.ts` — registers the SDK `Server`, names tools, wires Zod input schemas, points each tool at a thin handler that calls `src/lib/store.ts`.
    status: pending
  - id: read-tools-v1
    content: Implement `list_leads`, `get_lead`, `list_bids`, `get_bid`, `list_projects`, `get_project`, `pipeline_summary`, `list_lead_sources`.
    status: pending
  - id: write-tools-v1
    content: Implement `create_lead`, `update_lead`, `update_lead_status`, `log_lead_contact`, `set_lead_follow_up`, `update_lead_notes`, `update_project_status`, `create_project_update`.
    status: pending
  - id: tool-error-shape
    content: Common error wrapper that maps thrown `Error` / Zod failure / not-found to MCP tool errors with stable codes.
    status: pending
  - id: audit-logging
    content: Structured log per tool call: token id, tool name, duration, outcome. No request bodies. Forward to Vercel logs; defer DB audit table.
    status: pending
  - id: connector-docs
    content: `/settings/api-tokens` includes copy-pasteable setup blocks for Claude.ai connectors, Claude Desktop config, and ChatGPT connectors.
    status: pending
  - id: e2e-claude
    content: Add token, install in Claude.ai, run `pipeline_summary` and `log_lead_contact` against seeded BAAA data, screenshot for the worklog.
    status: pending
  - id: e2e-chatgpt
    content: Same flow against ChatGPT connector. Note any spec divergence for the deferred-fixes list.
    status: pending
  - id: docs-sync
    content: Worklog entry; PRD §7 Tech Stack adds MCP SDK; PRD §8 What's Built Today gains the MCP bullet; plan.md "Shipped (summary)" entry.
    status: pending
isProject: false
---

# MCP server

## Why this, why now

Mercer is positioned as an AI-native workflow engine (PRD §1), but the in-app agents (capture, qualification, scope reconciliation, negotiation) are gated behind the M1–M4 decisions in `docs/plan.md → Decisions blocking Milestone 1 / Phase 1`. Those decisions take weeks to resolve and require ground-truth datasets we don't have yet.

An MCP server is the cheapest way to put real AI in front of real Mercer data without waiting on those decisions. It does three things at once:

1. **Dogfooding.** Robb and Jordan can ask Claude or ChatGPT to triage today's leads, summarize the pipeline, log a contact attempt after a phone call, or set follow-up dates from voice dictation, against their own data. We learn which agent operations actually matter before we commit to building them in-app.
2. **Distribution.** A Mercer customer who already lives in Claude or ChatGPT can do most of their daily list-management work without opening the app. Property-manager-facing flows (proposals) stay in-app; contractor-facing back-office flows can move to chat.
3. **Foundation.** The same tool surface that powers external chat clients is the surface our future in-app agents will call. Building the MCP first forces us to nail the read/write API before we wire it to a Mercer-hosted agent.

The plan is deliberately scoped: read everything important, write the daily-use mutations, defer the heavy multi-step builds (creating bids, generating proposals, importing CSVs) until we have an in-app agent that needs them.

## Architectural decisions

### Transport: Streamable HTTP, hosted in-repo

The MCP transports in scope are stdio (local processes) and Streamable HTTP (remote). Stdio is wrong for Mercer because it would require every user to install a binary and wire it up locally; that breaks the SaaS distribution model. Streamable HTTP is the modern remote transport (replacing the older HTTP+SSE split) and is what both Claude.ai and ChatGPT connectors call.

The server lives in the existing Next.js app at `/api/mcp`. One Vercel deploy, one domain (`https://usemercer.com/api/mcp`), one place where store helpers, auth, and Drizzle live. No separate service.

### Auth: per-user personal access tokens (v1), OAuth deferred (v3)

The MCP spec recommends OAuth 2.1 with Dynamic Client Registration. Both Claude and ChatGPT support OAuth-backed connectors. **We defer OAuth.** Reasons:

- OAuth + DCR is a 1–2 week build by itself (authorization endpoint, token endpoint, refresh, scopes, consent screen).
- A per-user bearer token covers the v1 use cases — Robb and Jordan are the only users; they generate a token in settings and paste it into Claude/ChatGPT once.
- Tokens are revocable and rotatable, which gives us most of OAuth's safety properties without the build cost.
- If Anthropic or OpenAI tighten connector requirements later (currently both accept Bearer in the connector setup), we revisit. Captured as a v3 todo, not a v1 blocker.

Token shape: `mcp_<32-byte hex>`. Generated server-side, shown to the user once, persisted as SHA-256 hash. Prefix lets us detect accidental commits via secret-scanning rules.

### User context: AsyncLocalStorage, no store-layer refactor

The store helpers in `src/lib/store.ts` all call `requireUser()`, which today reads `x-mercer-user-id` from `next/headers` (set upstream by `src/proxy.ts` middleware). MCP requests don't go through that middleware (`/api/mcp` won't be in the matcher), and route handlers can't mutate the headers their own `next/headers()` call returns.

Two options for threading the authenticated user through to store calls:

1. Add a `userId` parameter to every store helper. Big refactor; touches dozens of call sites.
2. AsyncLocalStorage. The MCP route resolves the token, calls `withUserContext(userId, () => dispatchTool(...))`. `requireUser` checks the ALS context first and falls back to the header path for browser-driven requests.

Going with **(2)**. The change is one new file (`src/lib/user-context.ts`) plus a four-line change to `requireUser`. ALS is the right shape for this: it's per-request, transparent to leaf code, can't leak across requests, and cleans up automatically when the async chain ends.

### Multi-tenancy: design now, ship later

Today every owning row in Mercer (`leads`, `bids`, `projects`, etc.) carries a `user_id` and the `requireUser()` check enforces tenancy at the SQL level. There is no `workspaces` or `memberships` table. **The user IS the tenant** — and that's the boundary the MCP layer must respect.

Two future scenarios force a richer model. We don't build them in v1, but we shape the v1 surfaces so neither is a rewrite:

1. **Personal multi-workspace.** One human running two businesses (e.g. AQP plus a side venture) wants two completely separate books under one login. Implementation: `workspaces` table, `workspace_id` on every owning row, a current-workspace selector in the UI.
2. **Shared workspace.** Multiple humans operating one business (e.g. Robb invites Jordan to AQP). Implementation: `memberships(user_id, workspace_id, role)`, `workspace_id` on every owning row, ownership checks pivot from `user_id` to `workspace_id`.

Both scenarios collapse into the same data-model change: introduce `workspace_id` and pivot the boundary check from user to workspace. They differ only in whether `memberships` allows multiple users per workspace.

What this means for the MCP design *today*:

- **Tokens are scoped to a user (the principal).** Not to a (user, workspace) pair. Today, principal == tenant, so this is unambiguous. When workspaces ship, a token will additionally carry a `workspace_id` column (nullable; NULL == "all workspaces the principal can access"). The `ALTER TABLE` is a single nullable column add, no backfill needed.
- **`UserContext` shape is `{ userId, tenantId? }` from day one.** `tenantId` defaults to `userId` in v1 because there's no separate workspace concept. When workspaces ship, `tenantId` becomes the `workspace_id` and only the resolution logic changes — leaf code keeps reading `tenantId` and stays correct. *This is the only piece of design that survives the v1→workspace migration unchanged, so it's worth getting right now.*
- **Tool inputs do not take a `workspace_id` parameter today.** Adding a parameter once and never using it is worse than adding it later when it has meaning. Tool signatures are part of the connector contract; we'd rather extend cleanly than half-fill an argument now.
- **SQL ownership checks stay on `user_id`.** When `workspace_id` lands, those checks pivot in the same migration that adds the column. Because every store helper already calls `requireUser()` and constrains by the returned id, this is a one-pass refactor — not a per-helper audit.

What we explicitly choose *not* to do in v1:

- No `workspaces` table.
- No `workspace_id` on `api_tokens`.
- No `memberships` table.
- No "switch workspace" UI.
- No PRD §10 Q11 resolution (Reno Base internal vs. external SaaS) — that decision can wait until M5; the MCP layer is forward-compatible with either outcome.

### Validation: reuse existing Zod schemas

`src/lib/validations.ts` already defines schemas for the form-driven actions (`updateLeadSchema`, `logLeadContactSchema`, etc.). MCP tool input schemas should reuse them where shapes match. Where the MCP tool needs a different shape (e.g. richer filters on `list_leads`), define the new schema next to the tool, not in `validations.ts` — those are form-shape schemas and shouldn't get polluted with API-shape concerns.

The MCP SDK accepts JSON Schema for tool inputs; convert Zod via `zod-to-json-schema` (already a transitive dep via shadcn).

## Data model

### `api_tokens` table

New manual migration: `drizzle/manual/011_api_tokens.sql`.

```sql
CREATE TABLE IF NOT EXISTS api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_tokens_token_hash_idx ON api_tokens (token_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS api_tokens_user_id_idx ON api_tokens (user_id);
```

Schema added to `src/db/schema.ts` mirroring the SQL.

Token resolution path on every MCP request:

1. Read `Authorization: Bearer <token>` header. Reject if missing or wrong prefix.
2. SHA-256 the token. Lookup `api_tokens` by `token_hash` where `revoked_at IS NULL`.
3. If hit: stamp `last_used_at`, return `{ userId }`. If miss: 401.

The lookup is a single indexed read; latency is comparable to the existing `getUser()` cookie path.

## Tool surface (v1)

Read tools (8) and write tools (8). All scoped to the authenticated user; no cross-tenant access.

### Read

| Tool | Inputs | Returns |
|---|---|---|
| `list_leads` | `q?`, `status?`, `source?`, `follow_up_due_before?` (date), `has_email?`, `limit?` (default 50, max 200), `offset?` | `{ rows: LeadSummary[], total: number }` |
| `get_lead` | `id` | full `Lead` shape |
| `list_bids` | `status?`, `lead_id?`, `limit?`, `offset?` | `{ rows: BidSummary[], total: number }` |
| `get_bid` | `id` | full bid with `buildings`, `surfaces`, `line_items`, computed totals |
| `list_projects` | `status?`, `limit?`, `offset?` | `{ rows: ProjectSummary[], total: number }` |
| `get_project` | `id` | full project incl. `project_updates` feed |
| `pipeline_summary` | _(none)_ | counts by status × dollar totals; mirrors `/dashboard` |
| `list_lead_sources` | _(none)_ | distinct `source_tag` values for filter UIs |

### Write

| Tool | Inputs | Returns |
|---|---|---|
| `create_lead` | `name`, `email?`, `phone?`, `company?`, `property_name?`, `source_tag?`, `notes?` | created `Lead` |
| `update_lead` | `id`, partial of `{ name, email, phone, company, property_name, notes }` | updated `Lead` |
| `update_lead_status` | `id`, `status` (`new` / `quoted` / `won` / `lost`) | updated `Lead` |
| `log_lead_contact` | `id` | updated `Lead` (timestamp + counter incremented) |
| `set_lead_follow_up` | `id`, `follow_up_at` (`YYYY-MM-DD` or `null`) | updated `Lead` |
| `update_lead_notes` | `id`, `notes` (full replace) | updated `Lead` |
| `update_project_status` | `id`, `status` | updated `Project` |
| `create_project_update` | `project_id`, `body`, `visible_on_public_url` (default `false`) | created `ProjectUpdate` |

### Out of scope for v1

| Capability | Reason | Tracked under |
|---|---|---|
| `create_bid` / `update_bid` | Multi-step (buildings → surfaces → line items → pricing); needs design for how Claude builds these incrementally vs in one shot | Defer to in-app capture-agent work (PRD M1) |
| `generate_proposal` | Server action does PDF render; large response; not a daily-use chat operation | Phase 3 |
| `import_leads_csv` | File upload doesn't fit the chat shape; this is a UI flow, not a tool call | Out indefinitely |
| `accept_proposal_share` / `decline_proposal_share` | Property-manager-facing; should never be invoked by the contractor's chat client | Out indefinitely |
| `update_user_defaults` | Settings; rare; cleaner in the UI | Phase 3 |

## Files

### New

- `drizzle/manual/011_api_tokens.sql` — table + indexes (above).
- `src/lib/user-context.ts` — `withUserContext`, `getUserContext`, `requireUserContext`. Wraps Node's `AsyncLocalStorage`. Context shape is `{ userId, tenantId, source }` from day one; today `tenantId === userId` so leaf code reading `tenantId` stays correct when workspaces ship.
- `src/lib/api-tokens.ts` — `generateToken`, `hashToken`, `resolveTokenToUser`, error types.
- `src/lib/mcp/server.ts` — Server SDK setup: instantiate `Server`, register tools (one `server.tool(name, schema, handler)` call per tool), define error wrapper.
- `src/lib/mcp/tools/leads.ts`, `bids.ts`, `projects.ts`, `pipeline.ts` — tool handlers grouped by entity. Each handler is a few lines: validate input → call store helper → shape response.
- `src/app/api/mcp/route.ts` — Streamable HTTP transport. Resolves token, opens ALS scope, hands the request to the SDK. `runtime = 'nodejs'` (the SDK and ALS need Node, not Edge).
- `src/app/(app)/settings/api-tokens/page.tsx` — list / create / revoke UI. Reuses existing `Card`, `Button`, `Input`, `Label`.
- `src/components/api-token-list.tsx`, `api-token-create-form.tsx`, `api-token-reveal-dialog.tsx` — small client components.

### Edited

- `src/db/schema.ts` — add `apiTokens` table.
- `src/lib/store.ts` — add `createApiToken`, `listApiTokensForUser`, `revokeApiToken`, `findApiTokenByHash`, `touchApiTokenLastUsed`.
- `src/lib/auth.ts` (or wherever `requireUser` lives) — read `getUserContext()` first, fall back to existing header path.
- `src/lib/validations.ts` — add `mcpListLeadsSchema` (richer filter shape) if it doesn't fit existing schemas. Reuse the existing per-action schemas where possible.
- `src/lib/actions.ts` — add `createApiTokenAction`, `revokeApiTokenAction` for the settings UI. These are form actions, not MCP tools.
- `src/components/app-sidebar.tsx` — link to `/settings/api-tokens`.

## Auth + request flow

```
Claude.ai sends:
  POST /api/mcp
  Authorization: Bearer mcp_abc123…
  Content-Type: application/json
  { "jsonrpc": "2.0", "method": "tools/call", "params": { "name": "log_lead_contact", "arguments": { "id": "..." } } }
       │
       ▼
src/app/api/mcp/route.ts
  1. Extract bearer; resolveTokenToUser → { userId, tokenId }
  2. Touch last_used_at (fire-and-forget, no await)
  3. withUserContext({ userId }, () => sdk.handleRequest(req))
       │
       ▼
src/lib/mcp/server.ts → tool handler for "log_lead_contact"
  4. Zod-parse args
  5. Call store.logLeadContact(id)
       │
       ▼
src/lib/store.ts → logLeadContact(id)
  6. requireUser() reads ALS, returns { id: userId }
  7. UPDATE leads SET last_contacted_at = now(), contact_attempts = contact_attempts + 1
     WHERE id = $1 AND user_id = $2 RETURNING *
       │
       ▼
SDK serializes response back to Claude as { content: [{ type: "text", text: "Contact logged: 3 attempts, last 14:32 today" }] }
```

The user-id check on the SQL side (`AND user_id = $2`) is the critical defense-in-depth. Even if the ALS context were somehow corrupted, no row from another tenant can come back.

## Phasing

**Phase 1 — wire (target: 1 evening).**
Hardcoded token via env var, no DB table, no UI. One read tool (`pipeline_summary`), one write tool (`log_lead_contact`). Goal is to confirm the transport works against Claude.ai and ChatGPT before investing in the rest.

**Phase 2 — full v1 (target: ~3 days).**
`api_tokens` table + UI, AsyncLocalStorage user context, all 16 tools, error shape, audit logging via Vercel logs, connector setup docs in `/settings/api-tokens`.

**Phase 3 — later (no commitment).**
- OAuth 2.1 + DCR if connector requirements change.
- Resources surface — expose the PRD, the dashboard snapshot, per-lead briefs as MCP resources.
- Prompts surface — pre-built triage / outreach-plan / overrun-explainer templates.
- Per-tool rate limiting and a real `mcp_tool_calls` audit table.
- Tools deferred from v1 (`create_bid`, `generate_proposal`).

## Risks

- **Connector spec drift.** Claude and ChatGPT have both shipped MCP connector support but their UX and tolerated quirks differ. Mitigation: lock to MCP spec defaults, test both clients in Phase 1, capture any divergence as deferred fixes before declaring v1 shipped.
- **Token exposure.** The bearer token has full read/write to a user's tenant. A leaked token is the same severity as a leaked Supabase password. Mitigations: SHA-256 storage, no logging of token values, prefix lets secret-scanners catch commits, one-time reveal in UI, easy revoke. Not a blocker but it's the right thing to call out before promising users that we hold their keys.
- **`requireUser` regression.** Refactoring auth threading is the highest-risk change in this plan. A mistake makes either browser sessions break (high blast radius, immediate rollback) or MCP requests authenticate as the wrong user (silent, dangerous). Mitigation: AsyncLocalStorage context is checked *first*, so existing browser flows fall back to the header path unchanged. Add a test that hits `/leads` over a normal browser session post-deploy.
- **Tool shape stability.** Once Claude/ChatGPT users start composing prompts that depend on tool inputs/outputs, renames are breaking changes. Mitigation: design all tool shapes in this plan before writing code; treat `tools/list` output as a versioned API.
- **Cost.** Each MCP call is a Vercel function invocation plus Supabase reads. Daily-use volume is low (one operator using a chat client) so this is not a practical concern at v1 scale.

## Verification

- `bun run lint`, `bunx tsc --noEmit`, `bun run build` clean.
- Generate a token in `/settings/api-tokens`. Add it to Claude.ai connectors. Confirm `tools/list` returns 16 tools.
- Run `pipeline_summary` and `log_lead_contact` against the seeded BAAA data; screenshot the Claude conversation for the worklog.
- Repeat with ChatGPT connectors; capture any divergence.
- Confirm a revoked token returns 401 within one request.
- Confirm `/leads` browser session still authenticates after the `requireUser` refactor (regression smoke test).

## Out of scope (explicit)

- Stdio transport / local install paths.
- Multi-user / team tokens.
- File upload via MCP.
- Real-time push notifications from server to client (`notifications/*` MCP methods).
- Anything that mutates another user's data.
- Surfacing the proposal-share `/p/[slug]` accept/decline flows; those belong to the property manager, not the contractor's chat client.
