"use server";

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createChangeOrder,
  createProjectUpdate,
  getBid,
  getLatestProposalSnapshotForBid,
  getPhotos,
  getProjectUpdates,
} from "@/lib/store";
import { platformAnthropicKey, recordAiUsage } from "@/lib/usage";
import { stripEmDashes } from "@/lib/voice";
import type { SnapshotLineItem } from "@/lib/pdf/types";

/**
 * The AI keeps working after the sale (Jordan's notes §7b–7d, plan C2–C4):
 * weekly site reports from PM photos + a note, "additional work" quotes
 * priced at the PUBLISHED rates the customer already approved (never called
 * change orders in customer copy), and the closeout packet. Same grammar as
 * the composer: photos + a sentence in, document out. Everything lands as a
 * draft/record the PM controls — nothing is sent silently.
 */

const MODEL = "claude-opus-4-8";
const MAX_PHOTOS = 10;

function publishedRates(snapshot: Record<string, unknown> | null): string {
  const lines = (snapshot?.lineItems ?? []) as SnapshotLineItem[];
  const rates = lines.filter((l) => l.rateOnly && l.unitPrice != null);
  if (rates.length === 0) return "(none on the accepted proposal)";
  return rates
    .map((l) => `- ${l.name}: $${l.unitPrice} per ${l.unit ?? "unit"}`)
    .join("\n");
}

async function photoBlocks(
  bidId: string,
  kinds: string[],
): Promise<Anthropic.ContentBlockParam[]> {
  const photos = await getPhotos("bid", bidId);
  const picked = photos
    .filter((p) => kinds.length === 0 || kinds.includes(p.kind))
    .slice(0, MAX_PHOTOS);
  return picked.flatMap((p, i) => [
    {
      type: "text" as const,
      text: `Photo ${i + 1}${p.caption ? ` — ${p.caption}` : ""} (${p.kind}):`,
    },
    { type: "image" as const, source: { type: "url" as const, url: p.url } },
  ]);
}

function apiError(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError)
    return "Rate limited — try again in a moment.";
  if (err instanceof Anthropic.APIError)
    return `Claude API error: ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}

// ── C3: Additional work (never "change orders" in customer copy) ───────────

const AdditionalWorkSchema = z.object({
  // One customer-facing line naming the work, e.g. "Wood rot repair —
  // building 4 rafter tails".
  description: z.string(),
  items: z.array(
    z.object({
      item: z.string(),
      qty: z.number(),
      unit: z.string(),
      // MUST come from the published rates when one covers the work.
      rate: z.number(),
      fromPublishedRate: z.boolean(),
    }),
  ),
  // Customer-facing detail paragraph: what was found, where, the fix.
  detail: z.string(),
  // Anything the PM should verify before sending.
  verifyNote: z.string().nullable(),
});

export async function generateAdditionalWorkAction(data: {
  bidId: string;
  note: string;
}) {
  const note = data.note.trim();
  if (!note) return { ok: false as const, error: "Describe what was found." };
  const apiKey = platformAnthropicKey();
  if (!apiKey)
    return { ok: false as const, error: "AI needs the platform API key." };

  const bid = await getBid(data.bidId);
  if (!bid) return { ok: false as const, error: "Job not found." };
  const snapshot = await getLatestProposalSnapshotForBid(data.bidId);
  const photos = await photoBlocks(data.bidId, ["damage", "progress"]);

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.parse(
      {
        model: MODEL,
        max_tokens: 2048,
        system: [
          {
            type: "text",
            text: `You price "additional work" found during an exterior painting job (the customer's proposal calls it additional work — NEVER "change order"). The customer already approved published unit rates; when a published rate covers the work, you MUST use it exactly (fromPublishedRate=true). Work with no published rate gets a conservative market rate and fromPublishedRate=false plus a verifyNote. Quantities come from the PM's note and the photos — never inflate. Customer-facing text is confident and plain; never use an em dash (—).`,
          },
        ],
        output_config: { format: zodOutputFormat(AdditionalWorkSchema) },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Job: ${bid.propertyName}${bid.address ? ` — ${bid.address}` : ""}\n\nPUBLISHED RATES (from the accepted proposal):\n${publishedRates(snapshot)}\n\nPM'S NOTE:\n"""${note.slice(0, 2000)}"""`,
              },
              ...photos,
            ],
          },
        ],
      },
      { timeout: 60_000 },
    );
    await recordAiUsage({
      ownerUserId: bid.userId,
      feature: "additional_work",
      model: MODEL,
      usage: response.usage,
    });
    const parsed = response.parsed_output;
    if (!parsed || parsed.items.length === 0) {
      return { ok: false as const, error: "Couldn't price that — add quantities to the note." };
    }
    const amount = parsed.items.reduce((n, i) => n + i.qty * i.rate, 0);
    const itemLines = parsed.items
      .map(
        (i) =>
          `${i.item}: ${i.qty} ${i.unit} × $${i.rate}${i.fromPublishedRate ? " (published rate)" : " (VERIFY — no published rate)"} = $${(i.qty * i.rate).toFixed(2)}`,
      )
      .join("\n");
    const detail = stripEmDashes(
      `${parsed.detail}\n\n${itemLines}${parsed.verifyNote ? `\n\nPM verify: ${parsed.verifyNote}` : ""}`,
    );
    const changeOrder = await createChangeOrder({
      bidId: data.bidId,
      description: stripEmDashes(parsed.description),
      amount,
      reason: "discovered_during_work",
      detail,
    });
    revalidatePath(`/projects/${data.bidId}`);
    return { ok: true as const, changeOrder, amount };
  } catch (err) {
    return { ok: false as const, error: apiError(err) };
  }
}

// ── C2: Weekly site report ──────────────────────────────────────────────────

const SiteReportSchema = z.object({
  // The full customer-facing weekly report, plain paragraphs. Opens with
  // where the job stands, covers what happened this week, what's next, and
  // anything residents/management should know. No headers, no markdown.
  report: z.string(),
});

export async function generateSiteReportAction(data: {
  bidId: string;
  note: string;
}) {
  const note = data.note.trim();
  if (!note)
    return { ok: false as const, error: "Say what happened this week." };
  const apiKey = platformAnthropicKey();
  if (!apiKey)
    return { ok: false as const, error: "AI needs the platform API key." };

  const bid = await getBid(data.bidId);
  if (!bid) return { ok: false as const, error: "Job not found." };
  const photos = await photoBlocks(data.bidId, ["progress", "completion"]);

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.parse(
      {
        model: MODEL,
        max_tokens: 1500,
        system: [
          {
            type: "text",
            text: `You write the weekly site report a painting contractor's project manager sends the property manager. Source material: the PM's rough note and this week's site photos. Voice: confident, concrete, reassuring — the reader forwards this to a board. Report only what the note and photos support; never invent progress. 3-5 short paragraphs, no headers, no bullet lists, never an em dash (—).`,
          },
        ],
        output_config: { format: zodOutputFormat(SiteReportSchema) },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Job: ${bid.propertyName}${bid.address ? ` — ${bid.address}` : ""}\nDelivery status: ${bid.deliveryStatus ?? "in progress"}\n\nPM'S NOTE (rough — you polish it):\n"""${note.slice(0, 2000)}"""`,
              },
              ...photos,
            ],
          },
        ],
      },
      { timeout: 60_000 },
    );
    await recordAiUsage({
      ownerUserId: bid.userId,
      feature: "site_report",
      model: MODEL,
      usage: response.usage,
    });
    const parsed = response.parsed_output;
    if (!parsed) return { ok: false as const, error: "No report drafted." };
    // Draft only — the PM reads it in the updates feed and it's visible on
    // the customer link, which is Jordan's "sent to the customer" channel.
    const body = stripEmDashes(`Weekly site report\n\n${parsed.report}`);
    const update = await createProjectUpdate(data.bidId, {
      body,
      visibleOnPublicUrl: true,
      authorType: "agent",
    });
    revalidatePath(`/projects/${data.bidId}`);
    return { ok: true as const, update };
  } catch (err) {
    return { ok: false as const, error: apiError(err) };
  }
}

// ── C4: Closeout packet ─────────────────────────────────────────────────────

const CloseoutSchema = z.object({
  completionStatement: z.string(),
  colors: z.array(z.object({ name: z.string(), location: z.string() })),
  careInstructions: z.array(z.string()),
  warrantyLine: z.string().nullable(),
});

export async function generateCloseoutAction(data: { bidId: string }) {
  const apiKey = platformAnthropicKey();
  if (!apiKey)
    return { ok: false as const, error: "AI needs the platform API key." };

  const bid = await getBid(data.bidId);
  if (!bid) return { ok: false as const, error: "Job not found." };
  const [snapshot, updates] = await Promise.all([
    getLatestProposalSnapshotForBid(data.bidId),
    getProjectUpdates(data.bidId),
  ]);
  const photos = await photoBlocks(data.bidId, ["completion", "progress"]);
  const lines = ((snapshot?.lineItems ?? []) as SnapshotLineItem[])
    .map((l) => `- ${l.name}`)
    .join("\n");

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.parse(
      {
        model: MODEL,
        max_tokens: 2048,
        system: [
          {
            type: "text",
            text: `You assemble the closeout packet a painting contractor hands the customer at job completion: a completion statement, the colors used and where each goes on the property, care instructions for the new finishes, and the warranty line if the material states one. Pull colors/products ONLY from the scope, notes, and updates provided — if colors were never recorded, return an empty colors array (the PM fills them in). Customer-facing, board-forwardable, never an em dash (—).`,
          },
        ],
        output_config: { format: zodOutputFormat(CloseoutSchema) },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Job: ${bid.propertyName}${bid.address ? ` — ${bid.address}` : ""}\nClient: ${bid.clientName}\n\nSCOPE (from the accepted proposal):\n${lines || "(none)"}\n\nJOB NOTES:\n${bid.notes || "(none)"}\n\nPROJECT UPDATES (newest first):\n${updates
                  .slice(0, 10)
                  .map((u) => `- ${u.body.slice(0, 300)}`)
                  .join("\n")}`,
              },
              ...photos,
            ],
          },
        ],
      },
      { timeout: 60_000 },
    );
    await recordAiUsage({
      ownerUserId: bid.userId,
      feature: "closeout",
      model: MODEL,
      usage: response.usage,
    });
    const parsed = response.parsed_output;
    if (!parsed) return { ok: false as const, error: "No packet drafted." };
    const body = stripEmDashes(
      [
        "Closeout packet",
        "",
        parsed.completionStatement,
        parsed.colors.length > 0
          ? `\nColors used:\n${parsed.colors.map((c) => `• ${c.name} — ${c.location}`).join("\n")}`
          : "",
        parsed.careInstructions.length > 0
          ? `\nCaring for your new finishes:\n${parsed.careInstructions.map((c) => `• ${c}`).join("\n")}`
          : "",
        parsed.warrantyLine ? `\n${parsed.warrantyLine}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    const update = await createProjectUpdate(data.bidId, {
      body,
      visibleOnPublicUrl: true,
      authorType: "agent",
    });
    revalidatePath(`/projects/${data.bidId}`);
    return { ok: true as const, update };
  } catch (err) {
    return { ok: false as const, error: apiError(err) };
  }
}
