import "server-only";
import { db } from "@/db";
import { aiUsage } from "@/db/schema";

/**
 * Token-metered AI: every feature runs on the platform Anthropic key and
 * each call is recorded to ai_usage — the ledger Mercer bills from.
 * (Replaces the BYO-key integration; orgs no longer bring their own key.)
 */

export type AiFeature =
  | "quote_engine"
  | "ask"
  | "morning_brief"
  | "follow_up"
  | "composer"
  | "lead_intake";

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  quote_engine: "Quote engine",
  ask: "Ask Mercer",
  morning_brief: "Morning brief",
  follow_up: "Follow-up drafts",
  composer: "Home composer",
  lead_intake: "Lead intake",
};

/**
 * Mercer's billing rates, USD per million tokens.
 * PLACEHOLDER pricing pending a business decision — change here only;
 * everything downstream (usage page, invoice math) derives from this.
 */
export const TOKEN_PRICING_PER_MTOK = {
  input: 12,
  output: 60,
  cacheWrite: 15,
  cacheRead: 1.2,
} as const;

export function usageCostUsd(u: {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
}): number {
  const P = TOKEN_PRICING_PER_MTOK;
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
 * feature that just succeeded; billing reconciles from Anthropic's side.
 */
export async function recordAiUsage(data: {
  ownerUserId: string;
  feature: AiFeature;
  model: string;
  usage: SdkUsage | null | undefined;
}): Promise<void> {
  try {
    await db.insert(aiUsage).values({
      userId: data.ownerUserId,
      feature: data.feature,
      model: data.model,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      cacheWriteTokens: data.usage?.cache_creation_input_tokens ?? 0,
      cacheReadTokens: data.usage?.cache_read_input_tokens ?? 0,
    });
  } catch (err) {
    console.error("[ai-usage] failed to record usage", err);
  }
}
