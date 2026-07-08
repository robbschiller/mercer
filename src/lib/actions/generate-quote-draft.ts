"use server";

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";
import {
  getQuoteDraftContext,
  replaceAiDraftLines,
  type DraftLineInsert,
  type LineItem,
  type QuoteDraftContext,
} from "@/lib/store";
import {
  QuoteDraftSchema,
  type QuoteDraft,
  type QuoteDraftLine,
} from "@/lib/quote-draft";
import {
  PRICE_LIST_CATEGORY_LABELS,
  PRICING_UNIT_LABELS,
  type PriceListCategory,
  type PricingUnit,
} from "@/lib/status-meta";

const SYSTEM_PROMPT = `You are the quote engine for Mercer, a platform for commercial multifamily exterior renovation contractors (painting, wood rot repair, stucco, stair systems, railings).

A salesperson walked a property (a "takeoff"), and now describes the scope of work in their own words. Draft the quote as structured line items. A human reviews and edits every line before anything reaches the customer — you propose, they dispose.

Rules:

- PRICE LIST FIRST. When a provided price-list item covers the work, use it: set "sku" to its exact SKU and "unitPrice" to its charge per unit. Only when the scope demands work with no catalog match, propose a manual line: sku null, a conservative market unitPrice, and confidence "low" unless the pricing is genuinely obvious.
- QUANTITIES must be grounded: derive them from the measured square footage, building count, the scope text, and what the photos show. Scale per-building quantities by the building count. If you cannot ground a quantity, still propose the line but set confidence "low" and a short flagNote starting with "Verify" (e.g. "Verify count — photos show damage on 2 elevations"). When the scope text and the photos disagree, flag it and say what each source says.
- EVIDENCE: when a specific photo motivated a line or its quantity, set evidencePhotoIndex to that photo's 1-based index. Set rationale to ONE short sentence explaining why the line/quantity is what it is.
- SCOPE DISCIPLINE: quote what was asked. Do not invent scope. Include implied essentials (pressure wash before repaint, staging/lift access for 3-story work) only when the scope or photos support them.
- CATEGORIES: assign each line the best-fitting category from the enum; group your output ordered by category (painting, then repairs, then prep, then access).
- CHANGELOG: if a previous quote version is provided, write changeLog as one sentence describing what this draft changes versus it and why (e.g. "Restored clubhouse stucco per board feedback; trimmed carport scope."). If there is no previous version, changeLog is null.
- "summary": one line describing the draft (e.g. "27 lines across 6 categories for the full exterior repaint").
- Amounts are customer prices. Never output totals — the app computes qty × unitPrice.`;

const MODEL_TIMEOUT_MS = 120_000;
const MAX_PHOTOS = 20;
const MAX_SCOPE_CHARS = 4000;

export type GenerateQuoteDraftResult =
  | {
      ok: true;
      lines: LineItem[];
      changeLog: string | null;
      summary: string | null;
      nextVersion: number;
    }
  | { ok: false; error: string };

function fmtPriceList(ctx: QuoteDraftContext): string {
  if (ctx.priceList.length === 0) {
    return "(The price list is empty — every line will be a manual estimate.)";
  }
  const rows = ctx.priceList.map((p) => {
    const unit = p.pricingUnit
      ? PRICING_UNIT_LABELS[p.pricingUnit as PricingUnit]
      : "each";
    const charge =
      p.chargePerUnit == null ? "no price" : `$${Number(p.chargePerUnit)}`;
    const cat = p.category
      ? PRICE_LIST_CATEGORY_LABELS[p.category as PriceListCategory]
      : "Other";
    const desc = p.shortDescription || p.description || "";
    return `- ${p.sku} · ${p.name} · ${cat} · ${charge} ${unit}${desc ? ` · ${desc}` : ""}`;
  });
  return rows.join("\n");
}

function fmtPreviousVersion(ctx: QuoteDraftContext): string {
  const prev = ctx.latestProposal;
  if (!prev) return "(none — this will be v1)";
  const snapshot = prev.snapshot as {
    lineItems?: { name: string; amount: number }[];
    grandTotal?: number;
  } | null;
  const lines = (snapshot?.lineItems ?? [])
    .map((li) => `  - ${li.name}: $${li.amount}`)
    .join("\n");
  return [
    `v${prev.version} (${prev.createdAt.toISOString().slice(0, 10)})`,
    prev.scopeText ? `Scope it was drafted from: ${prev.scopeText}` : null,
    snapshot?.grandTotal != null ? `Total: $${snapshot.grandTotal}` : null,
    lines ? `Lines:\n${lines}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function draftToInserts(
  draft: QuoteDraft,
  ctx: QuoteDraftContext,
): DraftLineInsert[] {
  const skuIndex = new Map(ctx.priceList.map((p) => [p.sku, p]));
  return draft.lines.map((line) => {
    const catalogItem = line.sku ? (skuIndex.get(line.sku) ?? null) : null;
    const photo =
      line.evidencePhotoIndex != null
        ? (ctx.photos[line.evidencePhotoIndex - 1] ?? null)
        : null;
    const qty = Number.isFinite(line.qty) && line.qty > 0 ? line.qty : 1;
    const unitPrice =
      Number.isFinite(line.unitPrice) && line.unitPrice >= 0
        ? line.unitPrice
        : 0;
    return {
      name: line.name,
      amount: String(qty * unitPrice),
      qty: String(qty),
      unit: line.unit,
      unitPrice: String(unitPrice),
      category: line.category,
      priceListItemId: catalogItem?.id ?? null,
      sku: catalogItem?.sku ?? null,
      confidence: line.confidence,
      evidencePhotoId: photo?.id ?? null,
      aiRationale: line.rationale,
      flagNote: line.confidence === "low" ? line.flagNote : null,
    };
  });
}

// ---------------------------------------------------------------------------
// TEMPORARY local mock — used ONLY when ANTHROPIC_API_KEY is absent (same
// stopgap convention as parseDashboardIntent). Drafts plausible lines from
// the org's own catalog so the review UI is drivable during dev; real Claude
// takes over the moment the key is set.
// ---------------------------------------------------------------------------

function mockDraft(ctx: QuoteDraftContext, scopeText: string): QuoteDraft {
  const sqft = ctx.totalSqft > 0 ? ctx.totalSqft : 4200;
  const bldgs = ctx.buildingsCount > 0 ? ctx.buildingsCount : 1;
  const qtyForUnit = (unit: string | null): { qty: number; unit: string } => {
    switch (unit) {
      case "sf":
        return { qty: Math.round(sqft * 0.6), unit: "sq ft" };
      case "lf":
        return { qty: 180 * bldgs, unit: "lin ft" };
      case "bldg":
        return { qty: bldgs, unit: "building" };
      case "system":
        return { qty: 2 * bldgs, unit: "system" };
      case "unit":
        return { qty: 12 * bldgs, unit: "unit" };
      default:
        return { qty: 4 * bldgs, unit: "each" };
    }
  };

  const fromCatalog: QuoteDraftLine[] = ctx.priceList
    .filter((p) => p.chargePerUnit != null)
    .slice(0, 8)
    .map((p, i) => {
      const { qty, unit } = qtyForUnit(p.pricingUnit);
      const low = i % 3 === 2;
      return {
        name: p.name,
        qty,
        unit,
        unitPrice: Number(p.chargePerUnit),
        category: (p.category ?? "other") as QuoteDraftLine["category"],
        sku: p.sku,
        confidence: low ? "low" : "high",
        flagNote: low ? "Verify quantity — offline draft (no API key)" : null,
        evidencePhotoIndex: ctx.photos.length > 0 ? (i % ctx.photos.length) + 1 : null,
        rationale: "Offline draft — quantity estimated from bid measurements.",
      } as QuoteDraftLine;
    });

  const lines: QuoteDraftLine[] =
    fromCatalog.length > 0
      ? fromCatalog
      : [
          {
            name: "Exterior repaint — body & trim, 2 coats",
            qty: Math.round(sqft * 0.6),
            unit: "sq ft",
            unitPrice: 0.65,
            category: "painting",
            sku: null,
            confidence: "low",
            flagNote: "Verify — offline draft with empty catalog",
            evidencePhotoIndex: null,
            rationale: "Offline draft — no catalog items to price against.",
          },
          {
            name: "Pressure wash all elevations",
            qty: sqft,
            unit: "sq ft",
            unitPrice: 0.06,
            category: "pressure_washing",
            sku: null,
            confidence: "low",
            flagNote: "Verify — offline draft with empty catalog",
            evidencePhotoIndex: null,
            rationale: "Standard prep before repaint.",
          },
        ];

  return {
    lines,
    changeLog: ctx.latestProposal
      ? `Re-drafted from new scope (offline mock): "${scopeText.slice(0, 80)}…"`
      : null,
    summary: `Offline draft (no API key) — ${lines.length} lines from your catalog.`,
  };
}

export async function generateQuoteDraft(data: {
  bidId: string;
  scopeText: string;
}): Promise<GenerateQuoteDraftResult> {
  const scopeText = data.scopeText.trim();
  if (!scopeText) {
    return { ok: false, error: "Describe the scope first." };
  }
  if (scopeText.length > MAX_SCOPE_CHARS) {
    return {
      ok: false,
      error: `Scope is too long (max ${MAX_SCOPE_CHARS} characters).`,
    };
  }

  const ctx = await getQuoteDraftContext(data.bidId);
  if (!ctx) {
    return { ok: false, error: "Bid not found." };
  }

  let draft: QuoteDraft;
  if (!process.env.ANTHROPIC_API_KEY) {
    draft = mockDraft(ctx, scopeText);
  } else {
    const result = await callClaude(ctx, scopeText);
    if (!result.ok) return result;
    draft = result.draft;
  }

  if (draft.lines.length === 0) {
    return {
      ok: false,
      error:
        "No line items could be drafted from that scope — try describing the work more concretely.",
    };
  }

  const lines = await replaceAiDraftLines(data.bidId, draftToInserts(draft, ctx));
  revalidatePath(`/bids/${data.bidId}`);

  return {
    ok: true,
    lines,
    changeLog: draft.changeLog,
    summary: draft.summary,
    nextVersion: (ctx.latestProposal?.version ?? 0) + 1,
  };
}

async function callClaude(
  ctx: QuoteDraftContext,
  scopeText: string,
): Promise<{ ok: true; draft: QuoteDraft } | { ok: false; error: string }> {
  const client = new Anthropic();

  const photoList = ctx.photos.slice(0, MAX_PHOTOS);
  const photoBlocks: Anthropic.ContentBlockParam[] = photoList.flatMap(
    (photo, i) => [
      {
        type: "text" as const,
        text: `Photo ${i + 1}${photo.caption ? ` — ${photo.caption}` : ""} (${photo.kind}):`,
      },
      {
        type: "image" as const,
        source: { type: "url" as const, url: photo.url },
      },
    ],
  );

  const contextText = [
    `Property: ${ctx.bid.propertyName ?? "unknown"}${ctx.bid.address ? ` — ${ctx.bid.address}` : ""}`,
    `Record type: ${ctx.isLargeJob ? "Large Job" : "Small Job"}`,
    `Buildings: ${ctx.buildingsCount || "unknown"}`,
    `Measured square footage: ${ctx.totalSqft > 0 ? `${Math.round(ctx.totalSqft)} sq ft` : "not measured"}`,
    ctx.bid.notes ? `Bid notes: ${ctx.bid.notes}` : null,
    "",
    "PRICE LIST (sku · name · category · charge · description):",
    fmtPriceList(ctx),
    "",
    "PREVIOUS QUOTE VERSION:",
    fmtPreviousVersion(ctx),
    "",
    "SCOPE (the salesperson's words):",
    `"""${scopeText}"""`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  try {
    const response = await client.messages.parse(
      {
        model: "claude-opus-4-8",
        max_tokens: 8192,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        output_config: {
          format: zodOutputFormat(QuoteDraftSchema),
        },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: contextText },
              ...(photoBlocks.length > 0
                ? [
                    {
                      type: "text" as const,
                      text: `TAKEOFF PHOTOS (${photoList.length}):`,
                    },
                    ...photoBlocks,
                  ]
                : []),
            ],
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
    return { ok: true, draft: parsed };
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
