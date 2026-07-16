import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getOrgKnowledgeFiles, type OrgKnowledgeFile } from "@/lib/store";
import { platformAnthropicKey, recordAiUsage } from "@/lib/usage";
import { stripEmDashes } from "@/lib/voice";
import type { SnapshotDocument } from "@/lib/pdf/types";

/**
 * The sales-document copywriter (proposal composer §A2). Runs at stamp time:
 * org knowledge (messaging guide, testimonials, company facts, a winning
 * sample proposal) + the priced scope → the COPY for a fixed proposal
 * template. The model fills slots, never invents structure — Jordan's
 * consistency requirement (notes §6) — and never touches a number except
 * the ones handed to it. Returns null on any failure: the renderers fall
 * back to the pre-A2 layout, a stamp never fails because copy didn't.
 */

const SYSTEM_PROMPT = `You write the customer-facing copy for a painting/exterior-renovation proposal. The document template is FIXED — you only fill its text slots. The buyer is usually a property manager (often an LCAM managing an HOA/condo board) who cares about budget certainty, minimal resident disruption, and looking good to their board.

Rules:
- Write in the company's voice: study the attached messaging guide and sample proposal, and reuse their promises, differentiators, and proof points. Do not invent facts, credentials, insurance figures, warranties, or testimonials — only restate what the org's own material says. Missing material → null that slot or leave the array empty.
- The proposal must read board-forwardable: confident, concrete, zero fluff.
- promises: at most 6, each a short bold title + one supporting sentence, drawn from the org's own standards.
- statChips: 3-5 short proof stats (e.g. value "250+", label "communities completed") ONLY if the org's material states them.
- included: 6-10 bullets covering the actual scope lines provided — bold lead ("Pressure wash.") + one concrete sentence tied to the real spec/products when known.
- paymentSchedule: milestones with sharePct summing to exactly 100, matched to the job size (large jobs: mobilization + draws or mobilization + final; small jobs: deposit + final). Use the org's own billing pattern if their material shows one. amount fields will be recomputed by the app — set them to 0.
- publishedRatesIntro: only if rate-only lines exist — frame published rates as removing leverage ("your board already knows what repairs cost").
- terms: 4-6 bullets, each starting with a bold lead-in word and a period (e.g. "Price. …", "Warranty. …"). State the price-held-through date if given.
- priceHeldThrough: echo the date you were given, or null.
- NEVER use an em dash (—) anywhere. Use a comma, a period, or a hyphen instead.
- Do not address the recipient by name (that is personalized per share link later). Refer to "you" and "your board/community".`;

const DocSchema = z.object({
  coverSubtitle: z.string().nullable(),
  whyUsHeadline: z.string().nullable(),
  whyUsBody: z.string().nullable(),
  promises: z.array(z.object({ title: z.string(), body: z.string() })),
  statChips: z.array(z.object({ value: z.string(), label: z.string() })),
  scopeIntro: z.string().nullable(),
  included: z.array(z.object({ title: z.string(), body: z.string() })),
  durationLine: z.string().nullable(),
  scheduleBody: z.string().nullable(),
  paymentSchedule: z.array(
    z.object({ milestone: z.string(), sharePct: z.number() }),
  ),
  publishedRatesIntro: z.string().nullable(),
  whatToExpect: z.array(z.object({ title: z.string(), body: z.string() })),
  testimonials: z.array(
    z.object({ quote: z.string(), attribution: z.string() }),
  ),
  terms: z.array(z.string()),
  priceHeldThrough: z.string().nullable(),
  acceptanceCta: z.string().nullable(),
});

const TEXTY_KINDS: OrgKnowledgeFile["kind"][] = [
  "messaging",
  "sample_proposal",
  "testimonials",
  "company_facts",
];

function lintDoc(doc: SnapshotDocument): SnapshotDocument {
  const fix = (s: string | null) => (s == null ? null : stripEmDashes(s));
  return {
    ...doc,
    coverSubtitle: fix(doc.coverSubtitle),
    whyUsHeadline: fix(doc.whyUsHeadline),
    whyUsBody: fix(doc.whyUsBody),
    promises: doc.promises.map((p) => ({
      title: stripEmDashes(p.title),
      body: stripEmDashes(p.body),
    })),
    statChips: doc.statChips.map((c) => ({
      value: stripEmDashes(c.value),
      label: stripEmDashes(c.label),
    })),
    scopeIntro: fix(doc.scopeIntro),
    included: doc.included.map((b) => ({
      title: stripEmDashes(b.title),
      body: stripEmDashes(b.body),
    })),
    durationLine: fix(doc.durationLine),
    scheduleBody: fix(doc.scheduleBody),
    publishedRatesIntro: fix(doc.publishedRatesIntro),
    whatToExpect: doc.whatToExpect.map((s) => ({
      title: stripEmDashes(s.title),
      body: stripEmDashes(s.body),
    })),
    testimonials: doc.testimonials.map((t) => ({
      quote: stripEmDashes(t.quote),
      attribution: stripEmDashes(t.attribution),
    })),
    terms: doc.terms.map(stripEmDashes),
    acceptanceCta: fix(doc.acceptanceCta),
  };
}

export async function composeProposalDocument(input: {
  ownerUserId: string;
  propertyName: string;
  clientName: string;
  grandTotal: number;
  totalSqft: number;
  units: number | null;
  buildings: number | null;
  isLargeJob: boolean;
  lines: { name: string; rateOnly: boolean; category: string | null }[];
  scopeText: string | null;
  brandCompanyName: string | null;
  brandCredentials: string | null;
  brandAbout: string | null;
}): Promise<SnapshotDocument | null> {
  const apiKey = platformAnthropicKey();
  if (!apiKey) return null;

  try {
    const knowledge = (await getOrgKnowledgeFiles()).filter((f) =>
      TEXTY_KINDS.includes(f.kind),
    );
    const knowledgeBlocks: Anthropic.ContentBlockParam[] = [];
    for (const f of knowledge.slice(0, 5)) {
      const res = await fetch(f.url).catch(() => null);
      if (!res?.ok) continue;
      const header = `${f.kind} — ${f.fileName}:`;
      if (f.mimeType === "application/pdf") {
        const bytes = Buffer.from(await res.arrayBuffer());
        knowledgeBlocks.push({ type: "text", text: header });
        knowledgeBlocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: bytes.toString("base64"),
          },
        });
      } else if (
        f.mimeType.startsWith("text/") ||
        f.mimeType === "text/csv"
      ) {
        knowledgeBlocks.push({
          type: "text",
          text: `${header}\n${(await res.text()).slice(0, 15_000)}`,
        });
      }
    }

    // Price held through year-end, Jordan's own convention on Alhambra.
    const yearEnd = `${new Date().getFullYear()}-12-31`;
    const rateOnly = input.lines.filter((l) => l.rateOnly);
    const context = [
      `Company: ${input.brandCompanyName ?? "the contractor"}${input.brandCredentials ? ` (${input.brandCredentials})` : ""}`,
      input.brandAbout ? `About: ${input.brandAbout}` : null,
      `Property: ${input.propertyName} · Client: ${input.clientName}`,
      `Job size: ${input.isLargeJob ? "Large (weeks, phased)" : "Small (days, one crew)"}`,
      `One number: $${Math.round(input.grandTotal).toLocaleString()}`,
      input.totalSqft > 0
        ? `Measured: ${Math.round(input.totalSqft).toLocaleString()} SF`
        : null,
      input.units != null ? `Units: ${input.units}` : null,
      input.buildings != null ? `Buildings: ${input.buildings}` : null,
      `Price held through: ${yearEnd}`,
      "",
      "SCOPE LINES (names only; the template renders prices separately):",
      ...input.lines.filter((l) => !l.rateOnly).map((l) => `- ${l.name}`),
      rateOnly.length > 0
        ? `\nPUBLISHED-RATE LINES (billed as found, need publishedRatesIntro):\n${rateOnly.map((l) => `- ${l.name}`).join("\n")}`
        : null,
      input.scopeText
        ? `\nTHE SALESPERSON'S SCOPE NOTES:\n"""${input.scopeText.slice(0, 2000)}"""`
        : null,
    ]
      .filter((l) => l !== null)
      .join("\n");

    const client = new Anthropic({ apiKey });
    const response = await client.messages.parse(
      {
        model: "claude-opus-4-8",
        max_tokens: 4096,
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        output_config: { format: zodOutputFormat(DocSchema) },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: context },
              ...(knowledgeBlocks.length > 0
                ? [
                    {
                      type: "text" as const,
                      text: "ORG MATERIAL (voice, promises, proof points — restate, never invent):",
                    },
                    ...knowledgeBlocks,
                  ]
                : []),
            ],
          },
        ],
      },
      { timeout: 90_000 },
    );
    await recordAiUsage({
      ownerUserId: input.ownerUserId,
      feature: "proposal_writer",
      model: "claude-opus-4-8",
      usage: response.usage,
    });
    const parsed = response.parsed_output;
    if (!parsed) return null;

    // Normalize the money math the model is not trusted with: percentages
    // must sum to 100 and amounts always derive from grandTotal.
    const pctSum = parsed.paymentSchedule.reduce((n, m) => n + m.sharePct, 0);
    const paymentSchedule =
      parsed.paymentSchedule.length > 0 && Math.round(pctSum) === 100
        ? parsed.paymentSchedule.map((m) => ({
            milestone: m.milestone,
            sharePct: m.sharePct,
            amount: Math.round(input.grandTotal * (m.sharePct / 100)),
          }))
        : [];

    return lintDoc({
      ...parsed,
      paymentSchedule,
      perSf:
        input.totalSqft > 0 ? input.grandTotal / input.totalSqft : null,
      perUnit: input.units ? input.grandTotal / input.units : null,
      unitCount: input.units,
      priceHeldThrough: parsed.priceHeldThrough ?? yearEnd,
    });
  } catch (err) {
    console.error("[compose-proposal-doc] failed — stamping without copy layer", err);
    return null;
  }
}
