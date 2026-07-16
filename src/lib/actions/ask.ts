"use server";

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getOrgContext } from "@/lib/org-context";
import { platformAnthropicKey, recordAiUsage } from "@/lib/usage";
import {
  buildContextPacks,
  searchUnits,
  type ContextPack,
  type UnitHit,
  type UnitRef,
} from "@/lib/store";

export type AskResult =
  | { ok: true; answer: string; usedModel: boolean; context: ContextPack[] }
  | { ok: false; error: string };

const SYSTEM_PROMPT = `You are Mercer's assistant for a commercial multifamily exterior-painting contractor's CRM.

The user is having a conversation about specific records they've tagged ("units"). Their live data is provided below under CONTEXT. Answer using ONLY that data plus the conversation. If the answer isn't in the context, say so plainly and suggest which record to tag. Be concise and concrete — cite amounts, statuses, and dates from the context. Never invent figures.`;

export async function searchUnitsAction(q: string): Promise<UnitHit[]> {
  const ctx = await getOrgContext();
  if (!ctx) return [];
  const trimmed = q.trim();
  if (!trimmed) return [];
  try {
    return await searchUnits(trimmed);
  } catch {
    return [];
  }
}

function renderContext(packs: ContextPack[]): string {
  const found = packs.filter((p) => p.found);
  if (found.length === 0) return "(no records tagged)";
  return found
    .map((p) => `### ${p.label} (${p.type})\n${p.markdown}`)
    .join("\n\n");
}

// Offline stand-in for the model: returns a grounded summary built straight
// from the resolved context packs, so the whole flow (tag → resolve → answer)
// works before an ANTHROPIC_API_KEY exists. Real Claude takes over
// automatically once the key is set.
function mockAnswer(message: string, packs: ContextPack[]): string {
  const found = packs.filter((p) => p.found);
  if (found.length === 0) {
    return "Tag a record with the + button (a property, opportunity/job, lead, contact, or company) and I'll answer using its live data. Right now I don't have anything in context.\n\n(Offline mode: live AI answers are off until an API key is added.)";
  }
  const body = found
    .map((p) => `${p.label} (${p.type})\n${p.markdown}`)
    .join("\n\n");
  return `Here's what I have on the record${found.length > 1 ? "s" : ""} you tagged:\n\n${body}\n\n(Offline mode: live AI answers are off until an API key is added — but the data above is pulled live from your records. Once the key is in, I'll answer "${message.trim().slice(0, 80)}" in natural language using exactly this context.)`;
}

export async function askMercer(input: {
  message: string;
  refs: UnitRef[];
}): Promise<AskResult> {
  const ctx = await getOrgContext();
  if (!ctx) return { ok: false, error: "You're not signed in." };

  const message = input.message?.trim() ?? "";
  if (!message) return { ok: false, error: "Type a message." };
  if (message.length > 4000) {
    return { ok: false, error: "Message is too long (max 4000 characters)." };
  }

  const refs = Array.isArray(input.refs) ? input.refs.slice(0, 12) : [];

  let context: ContextPack[];
  try {
    context = await buildContextPacks(refs);
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Couldn't load tagged records: ${m}` };
  }

  // Platform key (token-metered) or the offline mock — so the flow is
  // fully exercisable without any key.
  const apiKey = platformAnthropicKey();
  if (!apiKey) {
    return {
      ok: true,
      usedModel: false,
      answer: mockAnswer(message, context),
      context,
    };
  }

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: [
        { type: "text", text: SYSTEM_PROMPT },
        { type: "text", text: `CONTEXT\n\n${renderContext(context)}` },
      ],
      messages: [{ role: "user", content: message }],
    });

    const answer = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    await recordAiUsage({
      ownerUserId: ctx.ownerUserId,
      feature: "ask",
      model: "claude-opus-4-8",
      usage: response.usage,
    });

    if (!answer) {
      return {
        ok: false,
        error: `No response from the model (stop_reason=${response.stop_reason}).`,
      };
    }
    return { ok: true, usedModel: true, answer, context };
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
    const m = err instanceof Error ? err.message : String(err);
    return { ok: false, error: m };
  }
}
