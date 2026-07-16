"use server";

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";
import {
  getQuoteDraftContext,
  replaceAiDraftLines,
  saveDraftClarifications,
  type Attachment,
  type DraftLineInsert,
  type LineItem,
  type QuoteDraftContext,
} from "@/lib/store";
import {
  QuoteDraftSchema,
  type DraftClarification,
  type QuoteClarification,
  type QuoteDraft,
  type QuoteDraftLine,
} from "@/lib/quote-draft";
import {
  PRICE_LIST_CATEGORY_LABELS,
  PRICING_UNIT_LABELS,
  type PriceListCategory,
  type PricingUnit,
} from "@/lib/status-meta";
import { platformAnthropicKey, recordAiUsage } from "@/lib/usage";

const SYSTEM_PROMPT = `You are the quote engine for Mercer, a platform for commercial multifamily exterior renovation contractors (painting, wood rot repair, stucco, stair systems, railings).

A salesperson walked a property (a "takeoff"), and now describes the scope of work in their own words — often with photos, aerial screenshots, spec PDFs, and dimension notes attached. Draft the quote as structured line items. A human reviews and edits every line before anything reaches the customer — you propose, they dispose.

Rules:

- PRICE LIST FIRST. When a provided price-list item covers the work, use it: set "sku" to its exact SKU and "unitPrice" to its charge per unit. Only when the scope demands work with no catalog match, propose a manual line: sku null, a conservative market unitPrice, and confidence "low" unless the pricing is genuinely obvious.
- QUANTITIES must be grounded: derive them from the measured square footage, building count, the scope text, dimension notes, and what the photos show. Scale per-building quantities by the building count. If you cannot ground a quantity, still propose the line but set confidence "low" and a short flagNote starting with "Verify" (e.g. "Verify count — photos show damage on 2 elevations"). When the scope text and the photos disagree, flag it and say what each source says.
- DIMENSION NOTES: shorthand like "Type 1 (3) – 700x22" means (count) buildings × perimeter/length ft × height ft — so 3 × 700 × 22 = 46,200 sq ft of wall. Expand this math and SHOW IT in the line's rationale so the reviewer can check it.
- AERIALS: satellite/aerial screenshots may carry annotations — outlines, arrows, counts, red markings. Read them: count buildings, note pool houses/clubhouses/carports, and use visible roof shapes to sanity-check building types.
- DOCUMENTS: attached spec PDFs (paint specifications, RFPs) define required products, surfaces, and exclusions. Follow them over guesses. When a document motivated a line, set evidenceDocumentIndex to that document's 1-based index.
- RATE-ONLY LINES: when the scope names work without committable quantities ("as found", "a couple", "unit costs so they know what they'll pay", "if needed"), emit the line with rateOnly=true, qty=null, and the unit price from the catalog. These render as a rate card, priced per unit and billed as work is found — do NOT guess a quantity for them.
- EVIDENCE: when a specific photo motivated a line or its quantity, set evidencePhotoIndex to that photo's 1-based index. Set rationale to ONE short sentence explaining why the line/quantity is what it is.
- CLARIFYING QUESTIONS: if the inputs leave a gap that would change a line by more than ~10% or add/remove a whole line (unit/building count unknown, occupied vs vacant, color change vs match, which buildings are in scope), respond with kind="questions" and 1-3 pointed questions instead of guessing — each with a one-line "why" and your best-guess suggestion. Only ask when the answer genuinely matters. If a previous Q&A round is provided in the context you may NOT ask again: respond kind="draft" and state any remaining assumptions as flagged lines.
- When kind="draft", "questions" must be an empty array. When kind="questions", "lines" must be an empty array.
- SCOPE DISCIPLINE: quote what was asked. Do not invent scope. Include implied essentials (pressure wash before repaint, staging/lift access for 3-story work) only when the scope or photos support them.
- CATEGORIES: assign each line the best-fitting category from the enum; group your output ordered by category (painting, then repairs, then prep, then access).
- CHANGELOG: if a previous quote version is provided, write changeLog as one sentence describing what this draft changes versus it and why (e.g. "Restored clubhouse stucco per board feedback; trimmed carport scope."). If there is no previous version, changeLog is null.
- "summary": one line describing the draft (e.g. "27 lines across 6 categories for the full exterior repaint").
- Amounts are customer prices. Never output totals — the app computes qty × unitPrice.`;

const MODEL_TIMEOUT_MS = 120_000;
const MAX_PHOTOS = 20;
const MAX_SCOPE_CHARS = 4000;
const MAX_DOCUMENTS = 3;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // combined
const TEXT_DOC_MIMES = new Set(["text/plain", "text/csv"]);

export type GenerateQuoteDraftResult =
  | {
      ok: true;
      kind: "draft";
      lines: LineItem[];
      changeLog: string | null;
      summary: string | null;
      nextVersion: number;
    }
  | {
      ok: true;
      kind: "questions";
      questions: QuoteClarification[];
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

function fmtClarifications(clarifications: DraftClarification[]): string {
  return clarifications
    .map(
      (c, i) =>
        `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer.trim() || "(no answer — use your best assumption and flag it)"}`,
    )
    .join("\n");
}

function draftToInserts(
  draft: QuoteDraft,
  ctx: QuoteDraftContext,
  documents: Attachment[],
): DraftLineInsert[] {
  const skuIndex = new Map(ctx.priceList.map((p) => [p.sku, p]));
  return draft.lines.map((line) => {
    const catalogItem = line.sku ? (skuIndex.get(line.sku) ?? null) : null;
    const photo =
      line.evidencePhotoIndex != null
        ? (ctx.photos[line.evidencePhotoIndex - 1] ?? null)
        : null;
    const document =
      line.evidenceDocumentIndex != null
        ? (documents[line.evidenceDocumentIndex - 1] ?? null)
        : null;
    const unitPrice =
      Number.isFinite(line.unitPrice) && line.unitPrice >= 0
        ? line.unitPrice
        : 0;
    const rateOnly = line.rateOnly === true;
    const qty = rateOnly
      ? null
      : line.qty != null && Number.isFinite(line.qty) && line.qty > 0
        ? line.qty
        : 1;
    return {
      name: line.name,
      amount: String(qty == null ? 0 : qty * unitPrice),
      qty: qty == null ? null : String(qty),
      unit: line.unit,
      unitPrice: String(unitPrice),
      rateOnly,
      category: line.category,
      priceListItemId: catalogItem?.id ?? null,
      sku: catalogItem?.sku ?? null,
      confidence: line.confidence,
      evidencePhotoId: photo?.id ?? null,
      evidenceAttachmentId: document?.id ?? null,
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

  const wantsRates = /as found|unit cost|rate|no quantit|couple/i.test(
    scopeText,
  );
  const fromCatalog: QuoteDraftLine[] = ctx.priceList
    .filter((p) => p.chargePerUnit != null)
    .slice(0, 8)
    .map((p, i) => {
      const { qty, unit } = qtyForUnit(p.pricingUnit);
      const low = i % 3 === 2;
      const rateOnly = wantsRates && i >= 6;
      return {
        name: p.name,
        qty: rateOnly ? null : qty,
        unit,
        unitPrice: Number(p.chargePerUnit),
        rateOnly,
        category: (p.category ?? "other") as QuoteDraftLine["category"],
        sku: p.sku,
        confidence: low ? "low" : "high",
        flagNote: low ? "Verify quantity — offline draft (no API key)" : null,
        evidencePhotoIndex:
          ctx.photos.length > 0 ? (i % ctx.photos.length) + 1 : null,
        evidenceDocumentIndex: null,
        rationale: rateOnly
          ? "Rate-only line — billed as found (offline draft)."
          : "Offline draft — quantity estimated from opportunity measurements.",
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
            rateOnly: false,
            category: "painting",
            sku: null,
            confidence: "low",
            flagNote: "Verify — offline draft with empty catalog",
            evidencePhotoIndex: null,
            evidenceDocumentIndex: null,
            rationale: "Offline draft — no catalog items to price against.",
          },
          {
            name: "Pressure wash all elevations",
            qty: sqft,
            unit: "sq ft",
            unitPrice: 0.06,
            rateOnly: false,
            category: "pressure_washing",
            sku: null,
            confidence: "low",
            flagNote: "Verify — offline draft with empty catalog",
            evidencePhotoIndex: null,
            evidenceDocumentIndex: null,
            rationale: "Standard prep before repaint.",
          },
        ];

  return {
    kind: "draft",
    lines,
    questions: [],
    changeLog: ctx.latestProposal
      ? `Re-drafted from new scope (offline mock): "${scopeText.slice(0, 80)}…"`
      : null,
    summary: `Offline draft (no API key) — ${lines.length} lines from your catalog.`,
  };
}

export async function generateQuoteDraft(data: {
  bidId: string;
  scopeText: string;
  /** Answers to a prior questions round; presence forces a draft. */
  clarifications?: DraftClarification[];
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
    return { ok: false, error: "Opportunity not found." };
  }
  const nextVersion = (ctx.latestProposal?.version ?? 0) + 1;
  const clarifications = data.clarifications ?? [];

  // Platform key (token-metered) or the offline mock.
  const apiKey = platformAnthropicKey();
  let draft: QuoteDraft;
  if (!apiKey) {
    draft = mockDraft(ctx, scopeText);
  } else {
    const result = await callClaude(ctx, scopeText, clarifications, apiKey);
    if (!result.ok) return result;
    draft = result.draft;
  }

  // One questions round max: only surface questions when the caller hasn't
  // answered any yet. (The prompt forbids round two; this is the backstop.)
  if (
    draft.kind === "questions" &&
    draft.questions.length > 0 &&
    clarifications.length === 0
  ) {
    const persisted: DraftClarification[] = draft.questions
      .slice(0, 3)
      .map((q) => ({ question: q.question, why: q.why, answer: "" }));
    await saveDraftClarifications(data.bidId, persisted);
    revalidatePath(`/opportunities/${data.bidId}`);
    return {
      ok: true,
      kind: "questions",
      questions: draft.questions.slice(0, 3),
      nextVersion,
    };
  }

  if (draft.lines.length === 0) {
    return {
      ok: false,
      error:
        "No line items could be drafted from that scope — try describing the work more concretely.",
    };
  }

  const lines = await replaceAiDraftLines(
    data.bidId,
    draftToInserts(draft, ctx, pickDocuments(ctx).docs),
    {
      scopeText,
      changeLog: draft.changeLog,
      clarifications: clarifications.length > 0 ? clarifications : null,
    },
  );
  revalidatePath(`/opportunities/${data.bidId}`);

  return {
    ok: true,
    kind: "draft",
    lines,
    changeLog: draft.changeLog,
    summary: draft.summary,
    nextVersion,
  };
}

/**
 * Which bid attachments ride along as model inputs: PDFs become document
 * blocks, small text files inline. Caps keep the request within API limits —
 * anything dropped is named in the context so the reviewer knows.
 */
function pickDocuments(ctx: QuoteDraftContext): {
  docs: Attachment[];
  skipped: Attachment[];
} {
  const docs: Attachment[] = [];
  const skipped: Attachment[] = [];
  let budget = MAX_DOCUMENT_BYTES;
  for (const att of ctx.attachments) {
    const readable =
      att.mimeType === "application/pdf" || TEXT_DOC_MIMES.has(att.mimeType);
    if (
      readable &&
      docs.length < MAX_DOCUMENTS &&
      att.sizeBytes <= budget
    ) {
      docs.push(att);
      budget -= att.sizeBytes;
    } else {
      skipped.push(att);
    }
  }
  return { docs, skipped };
}

async function buildDocumentBlocks(
  docs: Attachment[],
): Promise<Anthropic.ContentBlockParam[]> {
  const blocks: Anthropic.ContentBlockParam[] = [];
  for (const [i, att] of docs.entries()) {
    blocks.push({
      type: "text",
      text: `Document ${i + 1} — ${att.fileName}${att.caption ? ` (${att.caption})` : ""}:`,
    });
    if (att.mimeType === "application/pdf") {
      const res = await fetch(att.url);
      if (!res.ok) {
        blocks.push({
          type: "text",
          text: `(could not fetch this document — HTTP ${res.status})`,
        });
        continue;
      }
      const bytes = Buffer.from(await res.arrayBuffer());
      blocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: bytes.toString("base64"),
        },
      });
    } else {
      const res = await fetch(att.url);
      const text = res.ok ? await res.text() : `(could not fetch — HTTP ${res.status})`;
      blocks.push({ type: "text", text: text.slice(0, 20_000) });
    }
  }
  return blocks;
}

async function callClaude(
  ctx: QuoteDraftContext,
  scopeText: string,
  clarifications: DraftClarification[],
  apiKey: string,
): Promise<{ ok: true; draft: QuoteDraft } | { ok: false; error: string }> {
  const client = new Anthropic({ apiKey });

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

  const { docs, skipped } = pickDocuments(ctx);
  const documentBlocks = await buildDocumentBlocks(docs);

  const specs = ctx.property;
  const contextText = [
    `Property: ${ctx.bid.propertyName ?? "unknown"}${ctx.bid.address ? ` — ${ctx.bid.address}` : ""}`,
    `Record type: ${ctx.isLargeJob ? "Large Job" : "Small Job"}`,
    `Buildings: ${ctx.buildingsCount || "unknown"}`,
    `Measured square footage: ${ctx.totalSqft > 0 ? `${Math.round(ctx.totalSqft)} sq ft` : "not measured"}`,
    specs?.attainableSqftNonfloor != null
      ? `Paintable sq ft — non-floor surfaces: ${Number(specs.attainableSqftNonfloor)}`
      : null,
    specs?.attainableSqftFloors != null
      ? `Paintable sq ft — floors: ${Number(specs.attainableSqftFloors)}`
      : null,
    specs?.breezewayCount != null ? `Breezeways: ${specs.breezewayCount}` : null,
    specs?.stairSystemCount != null
      ? `Stair systems: ${specs.stairSystemCount}`
      : null,
    specs?.maintenanceNotes
      ? `Property maintenance history / known issues: ${specs.maintenanceNotes}`
      : null,
    ctx.bid.notes ? `Bid notes: ${ctx.bid.notes}` : null,
    skipped.length > 0
      ? `ATTACHED BUT NOT READABLE HERE (tell the reviewer to check them manually if they look relevant): ${skipped.map((a) => a.fileName).join(", ")}`
      : null,
    "",
    "PRICE LIST (sku · name · category · charge · description):",
    fmtPriceList(ctx),
    "",
    "PREVIOUS QUOTE VERSION:",
    fmtPreviousVersion(ctx),
    clarifications.length > 0
      ? `\nCLARIFYING QUESTIONS YOU ASKED — WITH THE SALESPERSON'S ANSWERS (you may not ask again; draft now):\n${fmtClarifications(clarifications)}`
      : null,
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
              ...(documentBlocks.length > 0
                ? [
                    {
                      type: "text" as const,
                      text: `ATTACHED DOCUMENTS (${docs.length}):`,
                    },
                    ...documentBlocks,
                  ]
                : []),
              ...(photoBlocks.length > 0
                ? [
                    {
                      type: "text" as const,
                      text: `TAKEOFF PHOTOS & AERIALS (${photoList.length}):`,
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
    await recordAiUsage({
      ownerUserId: ctx.bid.userId,
      feature: "quote_engine",
      model: "claude-opus-4-8",
      usage: response.usage,
    });
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
