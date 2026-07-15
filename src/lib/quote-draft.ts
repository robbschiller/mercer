import { z } from "zod";
import { PRICE_LIST_CATEGORIES } from "@/lib/status-meta";

/**
 * AI quote-draft output (quote engine, Jordan's AQP notes §6).
 * Client-safe module — imported by both the server action and the bid-page
 * UI (same split as dashboard-intent.ts).
 *
 * The model proposes lines; the app computes amount = qty × unitPrice and
 * writes them as bid line items with source='ai'. The AI never writes the
 * customer document — the deterministic proposal template does.
 */

export const QuoteDraftLineSchema = z.object({
  name: z.string(),
  // Null ONLY on rate-only lines (rateOnly=true): priced per unit with no
  // committed quantity ("billed as found"). Excluded from the bid total.
  qty: z.number().nullable(),
  unit: z.string(),
  unitPrice: z.number(),
  rateOnly: z.boolean(),
  category: z.enum(PRICE_LIST_CATEGORIES),
  // Exact SKU from the provided price list, or null for a manual estimate
  // (work the scope demands but the catalog doesn't cover).
  sku: z.string().nullable(),
  confidence: z.enum(["high", "low"]),
  // Short "Verify …" note shown on the amber flag when confidence is low.
  flagNote: z.string().nullable(),
  // 1-based index into the photo list sent with the request; null if no
  // specific photo motivated this line.
  evidencePhotoIndex: z.number().nullable(),
  // 1-based index into the document list (spec PDFs etc.) sent with the
  // request; null if no document motivated this line.
  evidenceDocumentIndex: z.number().nullable(),
  // One sentence: why this line / this quantity (show dimension math here).
  rationale: z.string().nullable(),
});

export type QuoteDraftLine = z.infer<typeof QuoteDraftLineSchema>;

/** One clarifying question the engine may ask instead of guessing. */
export const QuoteClarificationSchema = z.object({
  question: z.string(),
  // Why the answer matters — shown muted under the question.
  why: z.string(),
  // Best-guess answer to prefill the input, or null.
  suggestion: z.string().nullable(),
});

export type QuoteClarification = z.infer<typeof QuoteClarificationSchema>;

/** Persisted on bids.draft_clarifications while a draft is in flight. */
export type DraftClarification = {
  question: string;
  why: string;
  answer: string;
};

export const QuoteDraftSchema = z.object({
  // "draft" delivers lines; "questions" asks ≤3 blocking questions first.
  // The engine allows at most ONE questions round per version.
  kind: z.enum(["draft", "questions"]),
  lines: z.array(QuoteDraftLineSchema),
  questions: z.array(QuoteClarificationSchema),
  // One sentence on what changed vs. the previous version (null on v1).
  changeLog: z.string().nullable(),
  // One-line summary of the draft for the UI.
  summary: z.string().nullable(),
});

export type QuoteDraft = z.infer<typeof QuoteDraftSchema>;
