"use server";

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getOrgContext } from "@/lib/org-context";
import { resolveAnthropicKey } from "@/lib/integrations";
import {
  DashboardIntentSchema,
  type DashboardIntentKind,
  type DashboardIntent,
} from "@/lib/dashboard-intent";

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

// ---------------------------------------------------------------------------
// TEMPORARY local mock — keyword-based intent matching, used ONLY when
// ANTHROPIC_API_KEY is absent. Lets the dashboard composer route to the right
// action sheet during dev before the business provisions an API key. Real
// Claude parsing takes over automatically the moment the key is set; to fully
// retire the stopgap, delete this block and restore the no-key error return
// in parseDashboardIntent (see the branch below).
// ---------------------------------------------------------------------------

function blankIntent(kind: DashboardIntentKind): DashboardIntent {
  return {
    kind,
    confidence: "low",
    summary: null,
    name: null,
    company: null,
    email: null,
    phone: null,
    propertyAddress: null,
    primaryContact: null,
    source: null,
    contact: null,
    outcome: null,
    notes: null,
    about: null,
    dueDate: null,
    note: null,
    scopeSummary: null,
    sourceTag: null,
  };
}

function mockParseDashboardIntent(prompt: string): DashboardIntent {
  const text = prompt.trim();
  const lower = text.toLowerCase();
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null;
  const phone = text.match(/\+?\d[\d\s().-]{7,}\d/)?.[0]?.trim() ?? null;
  // "... at|from|with <Proper Noun phrase>" — a weak company/org guess.
  const company =
    text
      .match(/\b(?:at|from|with)\s+([A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*)*)/)?.[1]
      ?.trim() ?? null;

  if (/\boverdue\b/.test(lower)) {
    const i = blankIntent("show-overdue");
    i.confidence = "high";
    i.summary = "Showing overdue follow-ups";
    return i;
  }

  if (/\bfollow[\s-]?up\b|\bremind(?:er)?\b/.test(lower)) {
    const i = blankIntent("set-follow-up");
    i.confidence = "medium";
    const about =
      text.match(/follow[\s-]?up (?:with|on|about) (.+)/i)?.[1]?.trim() ?? null;
    i.about = about;
    i.summary = about ? `Set a follow-up: ${about}` : "Set a follow-up";
    return i;
  }

  if (/\bcalled?\b|\bvoicemail\b/.test(lower)) {
    const i = blankIntent("log-call");
    i.confidence = "medium";
    const contact =
      text
        .match(/call(?:ed)?\s+(?:with\s+)?([A-Z][\w'.-]*(?:\s+[A-Z][\w'.-]*)*)/)?.[1]
        ?.trim() ?? null;
    i.contact = contact;
    i.notes = text;
    i.summary = contact ? `Log a call with ${contact}` : "Log a call";
    return i;
  }

  if (/\bbid\b|\bproposal\b|\bestimate\b|\bquote\b/.test(lower)) {
    const i = blankIntent("start-draft-bid");
    i.confidence = "medium";
    i.summary = "Start a draft bid";
    return i;
  }

  if (/\blead\b|\bopportunity\b/.test(lower)) {
    const i = blankIntent("create-lead");
    i.confidence = "medium";
    i.summary = "Create a lead";
    return i;
  }

  if (/\bcontact\b|\badd\b|\bnew\b/.test(lower)) {
    const i = blankIntent("add-contact");
    i.confidence = "medium";
    const name =
      text
        .match(/(?:add|contact|new)\s+(?:contact\s+)?([A-Z][\w'.-]*(?:\s+[A-Z][\w'.-]*)*)/)?.[1]
        ?.trim() ?? null;
    i.name = name;
    i.company = company;
    i.email = email;
    i.phone = phone;
    i.summary = name
      ? `Add ${name}${company ? ` at ${company}` : ""}`
      : "Add a contact";
    return i;
  }

  const unknown = blankIntent("unknown");
  unknown.summary =
    "Offline mode (no API key yet) — try a keyword like “add”, “call”, “lead”, “bid”, “follow up”, or “overdue”.";
  return unknown;
}

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

  const apiKey = await resolveAnthropicKey(ctx.ownerUserId);
  if (!apiKey) {
    // No org key and no platform key — local keyword mock keeps the
    // composer usable.
    return { ok: true, intent: mockParseDashboardIntent(trimmed) };
  }

  const client = new Anthropic({ apiKey });
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
