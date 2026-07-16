"use server";

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getOrgContext } from "@/lib/org-context";
import { platformAnthropicKey, recordAiUsage } from "@/lib/usage";
import type { ExtractedLeadDraft } from "@/lib/lead-draft";

/**
 * AI lead intake (Jordan D1/D2): read an uploaded paint spec, RFP, or email
 * screenshot and extract a draft lead. One engine, two callers — the Home
 * composer (full draft → pre-filled New Lead form) and the New Lead form's
 * "What's the work?" card (scope chips + summary only). AI output is always
 * an editable draft for review, never a silent save.
 */

// Matches the SCOPE chips in new-lead-intake.tsx — the model picks from
// these; anything else it learned goes into scopeSummary instead.
const SCOPE_CHIPS = [
  "Full exterior",
  "Breezeways",
  "Stairs",
  "Wood rot",
  "Interior common",
] as const;

// Flat, all-nullable object — same structured-output shape rationale as
// DashboardIntentSchema (discriminated unions parse poorly).
const LeadDraftSchema = z.object({
  projectName: z
    .string()
    .nullable()
    .describe(
      'Short display name for the project, e.g. "Nona Terrace". Prefer the community/property name over the street address. Never invent one — null if no name appears.',
    ),
  propertyName: z.string().nullable().describe("The community/building name."),
  propertyAddress: z
    .string()
    .nullable()
    .describe("Full street address if present."),
  contactFirstName: z.string().nullable(),
  contactLastName: z.string().nullable(),
  phone: z.string().nullable().describe("The contact's phone number."),
  email: z.string().nullable().describe("The contact's email address."),
  company: z
    .string()
    .nullable()
    .describe("The management company or owner entity the contact works for."),
  source: z
    .string()
    .nullable()
    .describe(
      'Where this came from, e.g. "Sherwin-Williams (spec prepared by Jane Doe)", "RFP / bid invite", "Referral".',
    ),
  scope: z
    .array(z.enum(SCOPE_CHIPS))
    .describe("Every listed category the document's scope covers."),
  scopeSummary: z
    .string()
    .nullable()
    .describe(
      "3-6 sentences of the work's specifics worth remembering: substrates and repairs called out, product systems specified, explicit inclusions/exclusions, deadlines. Plain prose, no markdown.",
    ),
  isLargeJob: z
    .boolean()
    .nullable()
    .describe("true if the work clearly spans multiple buildings or ≥ 2 weeks."),
});

const SYSTEM_PROMPT = `You extract lead intake data for Mercer, a sales platform for commercial multifamily exterior painting contractors.

The user uploaded one or more documents — typically a paint specification (often prepared by a paint manufacturer rep), an RFP, or a screenshot/forward of an email asking for a bid. Pull out the facts a salesperson would type into a New Lead form.

Rules:
- Extract only what the documents actually say. Never invent names, addresses, numbers, or scope. Missing → null.
- The CONTACT is the person requesting or managing the work (e.g. the community manager/LCAM), not the spec's author. The spec author or their company is usually the SOURCE (e.g. a Sherwin-Williams rep who prepared it).
- projectName is what a contractor would call the job out loud — usually the community name.
- scope: pick every chip the documented work covers; put nuance (repairs, systems, exclusions) in scopeSummary.`;

const MODEL = "claude-opus-4-8";
const MODEL_TIMEOUT_MS = 60_000;
const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

export type ExtractLeadResult =
  | { ok: true; draft: ExtractedLeadDraft }
  | { ok: false; error: string };

type ImageMediaType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: ImageMediaType; data: string };
    }
  | {
      type: "document";
      source: { type: "base64"; media_type: "application/pdf"; data: string };
    };

const IMAGE_TYPES = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const TEXT_TYPES = new Set(["text/plain", "text/csv", "message/rfc822"]);

async function fileToBlock(file: File): Promise<ContentBlock | null> {
  if (file.type === "application/pdf") {
    const bytes = Buffer.from(await file.arrayBuffer());
    return {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: bytes.toString("base64"),
      },
    };
  }
  if (IMAGE_TYPES.has(file.type)) {
    const bytes = Buffer.from(await file.arrayBuffer());
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: file.type as ImageMediaType,
        data: bytes.toString("base64"),
      },
    };
  }
  if (TEXT_TYPES.has(file.type) || file.name.endsWith(".txt")) {
    const text = (await file.text()).slice(0, 20_000);
    return { type: "text", text: `--- ${file.name} ---\n${text}` };
  }
  return null;
}

export async function extractLeadDraftAction(
  formData: FormData,
): Promise<ExtractLeadResult> {
  const ctx = await getOrgContext();
  if (!ctx) return { ok: false, error: "Not signed in." };

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_FILES);
  const note = ((formData.get("note") as string) || "").trim().slice(0, 2000);
  if (files.length === 0 && !note) {
    return { ok: false, error: "Drop a spec, RFP, or email to read." };
  }
  const totalBytes = files.reduce((n, f) => n + f.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return { ok: false, error: "Files are too large (10 MB max combined)." };
  }

  const apiKey = platformAnthropicKey();
  if (!apiKey) {
    return {
      ok: false,
      error: "AI intake needs the platform API key configured.",
    };
  }

  const blocks: ContentBlock[] = [];
  const skipped: string[] = [];
  for (const file of files) {
    const block = await fileToBlock(file);
    if (block) blocks.push(block);
    else skipped.push(file.name);
  }
  if (blocks.length === 0 && !note) {
    return {
      ok: false,
      error: `Couldn't read ${skipped.join(", ")} — PDFs, images, and text files work best.`,
    };
  }

  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.parse(
      {
        model: MODEL,
        max_tokens: 2048,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        output_config: { format: zodOutputFormat(LeadDraftSchema) },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: note
                  ? `The user added this note with the upload:\n"""${note}"""`
                  : "Extract the lead from the attached document(s).",
              },
              ...blocks,
            ],
          },
        ],
      },
      { timeout: MODEL_TIMEOUT_MS },
    );
    const parsed = response.parsed_output;
    await recordAiUsage({
      ownerUserId: ctx.ownerUserId,
      feature: "lead_intake",
      model: MODEL,
      usage: response.usage,
    });
    if (!parsed) {
      return {
        ok: false,
        error: `The model returned no structured draft (stop_reason=${response.stop_reason}).`,
      };
    }
    return { ok: true, draft: { ...parsed, scope: [...parsed.scope] } };
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
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
