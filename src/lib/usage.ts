import "server-only";
import { db } from "@/db";
import { aiUsage } from "@/db/schema";

/**
 * AI usage ledger. Every feature runs on the platform Anthropic key and each
 * call is recorded to ai_usage with its list-price cost frozen at insert.
 * This is Mercer's COGS and abuse instrument, never an invoice line: AI is
 * included in the flat subscription (PRD §4 "Business model and pricing").
 */

export type AiFeature =
  | "quote_engine"
  | "ask"
  | "morning_brief"
  | "follow_up"
  | "composer"
  | "lead_intake"
  | "proposal_writer"
  | "site_report"
  | "additional_work"
  | "closeout"
  | "onboarding";

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  quote_engine: "Quote engine",
  ask: "Ask Mercer",
  morning_brief: "Morning brief",
  follow_up: "Follow-up drafts",
  composer: "Home composer",
  lead_intake: "Lead intake",
  proposal_writer: "Proposal writer",
  site_report: "Weekly site reports",
  additional_work: "Additional work quotes",
  closeout: "Closeout packets",
  onboarding: "Website onboarding",
};

export type TokenRates = {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
};

/**
 * Anthropic list prices, USD per million tokens (cache write is 1.25x
 * input, cache read is 0.1x). Keyed by the model id each call site passes.
 * Unknown models fall back to Opus rates so cost is never under-counted.
 */
export const MODEL_RATES_PER_MTOK: Record<string, TokenRates> = {
  "claude-opus-4-8": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-opus-5": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-sonnet-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
};

const FALLBACK_RATES = MODEL_RATES_PER_MTOK["claude-opus-4-8"];

export type TokenCounts = {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
};

/** List-price cost of one call (or a rollup) in USD. */
export function usageCostUsd(model: string, u: TokenCounts): number {
  const P = MODEL_RATES_PER_MTOK[model] ?? FALLBACK_RATES;
  return (
    (u.inputTokens * P.input +
      u.outputTokens * P.output +
      u.cacheWriteTokens * P.cacheWrite +
      u.cacheReadTokens * P.cacheRead) /
    1_000_000
  );
}

/** The platform Anthropic key; null falls features back to offline mocks. */
export function platformAnthropicKey(): string | null {
  return process.env.ANTHROPIC_API_KEY || null;
}

/** Shape of the SDK's `response.usage` — kept loose so all call sites fit. */
type SdkUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

/**
 * Meter one model call. Never throws — a metering hiccup must not fail the
 * feature that just succeeded; the Anthropic console is the reconciliation
 * source if rows go missing.
 */
export async function recordAiUsage(data: {
  ownerUserId: string;
  /** The seat that triggered the call; omit for background/system work. */
  actorUserId?: string | null;
  feature: AiFeature;
  model: string;
  usage: SdkUsage | null | undefined;
}): Promise<void> {
  try {
    const counts: TokenCounts = {
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      cacheWriteTokens: data.usage?.cache_creation_input_tokens ?? 0,
      cacheReadTokens: data.usage?.cache_read_input_tokens ?? 0,
    };
    await db.insert(aiUsage).values({
      userId: data.ownerUserId,
      actorUserId: data.actorUserId ?? null,
      feature: data.feature,
      model: data.model,
      ...counts,
      costUsd: usageCostUsd(data.model, counts).toFixed(6),
    });
  } catch (err) {
    console.error("[ai-usage] failed to record usage", err);
  }
}
