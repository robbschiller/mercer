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

/**
 * The internal takeoff budget the engine drafts ALONGSIDE the customer lines
 * (proposal composer Phase 1 — mirrors Jordan's own takeoff spreadsheet).
 * Costs here are what the work costs US (supplier pricing), not customer
 * prices; the margin guardrail compares its build-up to the quote total.
 */
export const BudgetLineSchema = z.object({
  // Best-fitting expense category slug (staging, lifts, primer_sealer,
  // topcoat, caulk, patch, cleaners, supplies, paint_labor, travel,
  // mobilization, housing, other …).
  category: z.string(),
  item: z.string(),
  // The spread-rate basis, stated so a human can check the math — e.g.
  // "1 gal per 200 SF", "1 tube per unit", "20 gal per building".
  basis: z.string(),
  qty: z.number(),
  // OUR unit cost from supplier pricing / org knowledge — not a customer price.
  unitCost: z.number(),
});

export const QuoteBudgetSchema = z.object({
  totalSf: z.number().nullable(),
  units: z.number().nullable(),
  buildings: z.number().nullable(),
  materials: z.array(BudgetLineSchema),
  // Sales tax + fees on materials, percent (default 10 when unknown).
  materialsTaxPct: z.number(),
  laborRatePerSf: z.number().nullable(),
  laborCost: z.number(),
  // Overhead percent on costs (default 30 when the org knowledge is silent).
  adminPct: z.number(),
  // Commission percent on costs + admin (default 4 when silent).
  commissionPct: z.number(),
  // Assumptions and caveats — where rates came from, what was estimated.
  notes: z.string().nullable(),
});

export type QuoteBudget = z.infer<typeof QuoteBudgetSchema>;

export const QuoteDraftSchema = z.object({
  // "draft" delivers lines; "questions" asks ≤3 blocking questions first.
  // The engine allows at most ONE questions round per version.
  kind: z.enum(["draft", "questions"]),
  lines: z.array(QuoteDraftLineSchema),
  questions: z.array(QuoteClarificationSchema),
  // The internal takeoff budget for this draft (null on kind="questions",
  // or when the inputs genuinely can't support one).
  budget: QuoteBudgetSchema.nullable(),
  // One sentence on what changed vs. the previous version (null on v1).
  changeLog: z.string().nullable(),
  // One-line summary of the draft for the UI.
  summary: z.string().nullable(),
});

export type QuoteDraft = z.infer<typeof QuoteDraftSchema>;
