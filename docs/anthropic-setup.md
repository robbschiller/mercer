# Anthropic API Setup

The dashboard composer (`/dashboard`) and the onboarding website-enrichment wizard both call Claude. Both surfaces fail gracefully without a key — they return a "not configured" message instead of crashing — but they don't do real work until you wire one up.

## What uses it

| Surface | Where in code | Model | Failure mode without key |
|---|---|---|---|
| Dashboard composer (intent parsing) | `src/lib/actions/parse-dashboard-intent.ts` | `claude-opus-4-8` | Composer shows: "ANTHROPIC_API_KEY is not configured…" under the input. |
| Onboarding wizard step 2 (website enrichment) | `src/lib/onboarding/enrich-from-website.ts` | `claude-haiku-4-5` | Wizard step renders blank fields for the user to fill manually. |

Both go through the official `@anthropic-ai/sdk` (already a dependency) and use **structured outputs via `zodOutputFormat`** with a typed Zod schema, so the model can't return malformed JSON.

## Local dev — first-time setup

### 1. Get an API key

Sign in at **https://console.anthropic.com/** → **Settings → API Keys → Create Key**. Name it `mercer-dev` (or similar). Copy the value immediately — the console only shows it once.

### 2. Add it to `.env.local`

Open `.env.local` at the repo root and add (or uncomment) this line:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...your-key-here...
```

`.env.local` is gitignored — this never reaches the repo. Same variable name is documented in `.env.local.example`.

### 3. Restart the dev server

Next.js reads env vars at process start, so:

```sh
# Ctrl-C the dev server, then:
bun run dev
```

(Or `bunx next dev -p 3010` if you're on the alt port.)

### 4. Verify it works

Open the dashboard composer (`/dashboard`) and try:

| Type this | Expect |
|---|---|
| `Add Sarah Chen at Highmark, sarah@highmark.com` | Add Contact sheet opens, pre-filled with name/company/email |
| `Remind me Friday to follow up with Greystar` | Set Follow-up sheet opens with Friday resolved to an ISO date |
| `Show overdue` | Overdue sheet opens |
| `tell me a joke` | "I couldn't tell what you wanted — try one of the actions below." |

If you get **"Invalid ANTHROPIC_API_KEY"**, the key was rejected — re-copy from the console. If you get **"Claude API error: …"**, check the message; common cause is a key without access to the model (request access for Opus 4.8 in the console if needed).

## Production / preview deploys (Vercel)

The same env var, set in the Vercel dashboard:

1. **Vercel → Project → Settings → Environment Variables**
2. Add `ANTHROPIC_API_KEY` for **Production** + **Preview** (separate values are fine — typically a separate prod key with stricter limits)
3. **Redeploy** the affected branch — Vercel doesn't auto-redeploy on env-var changes

Use a **separate production key** with usage limits set in the Anthropic console (Settings → Spend Limits). The composer fires one API call per user submit, so a busy account with no limits can rack up cost fast.

## Models in use & cost

| Surface | Model | Why |
|---|---|---|
| `parse-dashboard-intent.ts` | `claude-opus-4-8` | Default for new code per the Claude API skill convention. **Interactive cost note:** for an always-on composer, `claude-haiku-4-5` is ~5× cheaper and lower-latency — a defensible swap if you find Opus latency or cost noticeable. One-line model string change in the file. |
| `enrich-from-website.ts` | `claude-haiku-4-5` | Bulk extraction with a tight 8-second timeout, single shot. Haiku is the right fit. |

Per-call cost is roughly:
- **Opus 4.8**: ~$0.005 input + ~$0.005 output per composer submit (back-of-envelope: ~1K input tokens incl. system prompt, ~200 output tokens for structured intent)
- **Haiku 4.5**: ~$0.001 input + ~$0.001 output per call

Both surfaces use prompt-caching markers on the system block (`cache_control: { type: "ephemeral" }`) — these are no-ops below the model's 4096-token cache minimum for short prompts, but they keep the code forward-compatible when the prompt grows.

## Switching the dashboard composer to Haiku

If you want to swap:

```ts
// src/lib/actions/parse-dashboard-intent.ts
const response = await client.messages.parse(
  {
-    model: "claude-opus-4-8",
+    model: "claude-haiku-4-5",
    max_tokens: 512,
    ...
```

No other changes needed — Haiku supports the same `messages.parse()` + structured outputs + `cache_control` API as Opus 4.8.

## When something breaks

| Symptom | Likely cause |
|---|---|
| "ANTHROPIC_API_KEY is not configured." | Env var not set, or the dev server was started before you set it. Restart. |
| "Invalid ANTHROPIC_API_KEY." | Key revoked, typo'd, or copied with extra whitespace. |
| "Rate limited — try again in a moment." | Too many requests; the SDK already retries with backoff. If persistent, raise your usage tier in the Anthropic console. |
| "Model returned no structured response (stop_reason=max_tokens)" | The schema is large and the response hit the per-request token cap. Either tighten the schema or bump `max_tokens` in the call. |
| "Claude API error: …" | Surface-level — read the message. Most often a model-not-enabled or org-permission issue. |

## Reference

- Anthropic console: https://console.anthropic.com/
- Anthropic SDK (TypeScript): https://github.com/anthropics/anthropic-sdk-typescript
- The Claude API skill in this repo's tooling is the authoritative source for SDK conventions, structured outputs, and prompt caching guidance.
