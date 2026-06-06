"use server";

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getOrgContext } from "@/lib/org-context";

export const DASHBOARD_INTENT_KINDS = [
  "add-contact",
  "create-lead",
  "log-call",
  "set-follow-up",
  "start-draft-bid",
  "show-overdue",
  "unknown",
] as const;

export type DashboardIntentKind = (typeof DASHBOARD_INTENT_KINDS)[number];

// Flat schema with nullable fields — only the ones relevant to `kind` get
// populated. Discriminated unions over `kind` are harder to land cleanly
// through structured outputs, and the project's prior Claude usage
// (src/lib/onboarding/enrich-from-website.ts) follows this same shape.
export const DashboardIntentSchema = z.object({
  kind: z.enum(DASHBOARD_INTENT_KINDS),
  confidence: z.enum(["high", "medium", "low"]),
  // One-line, friendly explanation. For `unknown`, this is what to show
  // the user; for the action kinds, it's an optional summary like
  // "Add Sarah Chen at Highmark Properties".
  summary: z.string().nullable(),

  // Fields. Each one is null when not applicable to the chosen kind, or
  // when the user didn't mention it.
  name: z.string().nullable(),
  company: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),

  propertyAddress: z.string().nullable(),
  primaryContact: z.string().nullable(),
  source: z.string().nullable(),

  contact: z.string().nullable(),
  outcome: z.string().nullable(),
  notes: z.string().nullable(),

  about: z.string().nullable(),
  // ISO YYYY-MM-DD when resolvable; null otherwise.
  dueDate: z.string().nullable(),
  note: z.string().nullable(),

  scopeSummary: z.string().nullable(),
  sourceTag: z.string().nullable(),
});

export type DashboardIntent = z.infer<typeof DashboardIntentSchema>;

const SYSTEM_PROMPT = `You are an intent parser for Mercer, a sales platform for commercial multifamily exterior renovation contractors.

The user typed a free-form command into a dashboard composer. Classify it into exactly ONE intent and extract any arguments the user mentioned.

Intents:

- add-contact — adding a person or company. Fields: name, company, email, phone.
- create-lead — logging a new sales opportunity. Fields: propertyAddress, primaryContact, source (e.g. "Referral", "Trade show", "Cold call", "Website", "Repeat client").
- log-call — recording a call they made. Fields: contact, outcome (e.g. "Connected", "Left voicemail", "No answer", "Scheduled meeting"), notes.
- set-follow-up — setting a reminder. Fields: about (who/what to follow up on), dueDate (ISO YYYY-MM-DD), note.
- start-draft-bid — starting a new bid/proposal. Fields: propertyAddress, scopeSummary, sourceTag.
- show-overdue — show overdue follow-ups. No fields.
- unknown — request doesn't clearly map to any of the above (greetings, off-topic, jokes, vague questions).

Rules:

- "confidence" is "high" when the intent is unambiguous, "medium" when the user clearly meant SOMETHING actionable but you had to interpret, "low" when you're guessing.
- For any field the user didn't mention, return null. Do NOT invent values, names, addresses, or phone numbers.
- Return null for fields not relevant to the chosen kind (e.g. \`propertyAddress\` on \`add-contact\` is null).
- "summary" — for action intents, a short one-line confirmation phrase ("Add Sarah Chen at Highmark") to display under the composer. For \`unknown\`, a brief friendly note ("I couldn't tell what you wanted — try one of the action pills below").
- Dates: resolve relative phrases ("Friday", "next Tuesday", "tomorrow", "in 3 days") into ISO YYYY-MM-DD using the "Today is …" line in the user message. If the date is genuinely ambiguous, leave dueDate null and note it in summary.
- If the user mentions multiple intents in one message, pick the most concrete actionable one and mention the others in summary.`;

const MODEL_TIMEOUT_MS = 8000;

export type ParseDashboardIntentResult =
  | { ok: true; intent: DashboardIntent }
  | { ok: false; error: string };

export async function parseDashboardIntent(
  prompt: string,
): Promise<ParseDashboardIntentResult> {
  const ctx = await getOrgContext();
  if (!ctx) {
    return { ok: false, error: "Not signed in." };
  }

  const trimmed = prompt.trim();
  if (!trimmed) {
    return { ok: false, error: "Empty prompt." };
  }
  if (trimmed.length > 2000) {
    return { ok: false, error: "Prompt is too long (max 2000 characters)." };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error:
        "ANTHROPIC_API_KEY is not configured. Add it to .env.local to enable the dashboard composer.",
    };
  }

  const client = new Anthropic();
  const today = new Date().toISOString().slice(0, 10);

  try {
    const response = await client.messages.parse(
      {
        model: "claude-opus-4-8",
        max_tokens: 512,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            // No-op below the 4096-token cache minimum on Opus 4.8, but
            // matches the project's existing Claude-call shape and is a
            // forward-compatible placeholder if the prompt grows.
            cache_control: { type: "ephemeral" },
          },
        ],
        output_config: {
          format: zodOutputFormat(DashboardIntentSchema),
        },
        messages: [
          {
            role: "user",
            content: `Today is ${today}.\n\nUser typed:\n"""${trimmed}"""`,
          },
        ],
      },
      { timeout: MODEL_TIMEOUT_MS },
    );

    const parsed = response.parsed_output;
    if (!parsed) {
      return {
        ok: false,
        error: `Model returned no structured response (stop_reason=${response.stop_reason}).`,
      };
    }
    return { ok: true, intent: parsed };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "Invalid ANTHROPIC_API_KEY." };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Rate limited — try again in a moment." };
    }
    if (err instanceof Anthropic.APIError) {
      return { ok: false, error: `Claude API error: ${err.message}` };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
