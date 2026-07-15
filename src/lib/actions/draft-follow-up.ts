"use server";

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { bids, proposals, proposalShares } from "@/db/schema";
import { getOrgContext } from "@/lib/org-context";
import { platformAnthropicKey, recordAiUsage } from "@/lib/usage";
import { getCompanyProfile, logLeadContact } from "@/lib/store";
import { activityEvents } from "@/db/schema";

/**
 * Draft a follow-up nudge for a sent quote — short enough to paste into a
 * text message, personalized by what the link telemetry actually shows
 * (viewed and gone quiet vs. never opened).
 */
export async function draftFollowUpAction(data: {
  bidId: string;
}): Promise<{ text: string | null; error: string | null }> {
  const ctx = await getOrgContext();
  if (!ctx) return { text: null, error: "Not signed in." };

  const rows = await db
    .select({
      bid: bids,
      version: proposals.version,
      total: proposals.snapshot,
      shareCreatedAt: proposalShares.createdAt,
      viewCount: proposalShares.viewCount,
      recipientName: proposalShares.recipientName,
    })
    .from(bids)
    .innerJoin(proposals, eq(proposals.bidId, bids.id))
    .leftJoin(proposalShares, eq(proposalShares.proposalId, proposals.id))
    .where(and(eq(bids.id, data.bidId), eq(bids.userId, ctx.ownerUserId)))
    .orderBy(desc(proposals.version), desc(proposalShares.createdAt))
    .limit(1);
  const r = rows[0];
  if (!r) return { text: null, error: "Bid not found." };

  const snapshot = r.total as { grandTotal?: number } | null;
  const total = snapshot?.grandTotal ?? null;
  const daysOut = r.shareCreatedAt
    ? Math.max(
        0,
        Math.round((Date.now() - r.shareCreatedAt.getTime()) / 86_400_000),
      )
    : null;
  const viewed = (r.viewCount ?? 0) > 0;
  const recipient = r.recipientName ?? "there";
  const profile = await getCompanyProfile(ctx.ownerUserId);
  const sender = ctx.name || profile?.companyName || "us";

  const facts = [
    `Property: ${r.bid.propertyName}`,
    `Quote: v${r.version}${total != null ? ` — $${total.toLocaleString()}` : ""}`,
    daysOut != null ? `Sent ${daysOut} day(s) ago` : "Not sent yet",
    viewed
      ? `Opened ${r.viewCount}× but no response`
      : "Never opened the link",
    `Recipient: ${recipient}`,
    `From: ${sender}`,
  ].join("\n");

  const apiKey = platformAnthropicKey();
  if (!apiKey) {
    // Offline template keeps the button useful without a key.
    return {
      text: viewed
        ? `Hi ${recipient} — wanted to check in on the ${r.bid.propertyName} proposal. Happy to walk through any line or adjust scope if something's off. Anything you need from me to move forward?`
        : `Hi ${recipient} — following up on the ${r.bid.propertyName} proposal I sent over${daysOut ? ` ${daysOut} days ago` : ""}. Here's the link again in case it got buried — glad to answer anything.`,
      error: null,
    };
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 300,
      system:
        "You write follow-up messages for a commercial painting contractor chasing sent quotes. Write ONE message, 2-3 sentences, warm and direct, no subject line, no signature block, ready to paste into a text or email. Match the situation: if they viewed but went quiet, invite questions or objections; if they never opened, gently resurface it. Never sound desperate; never discount unprompted.",
      messages: [{ role: "user", content: facts }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    await recordAiUsage({
      ownerUserId: ctx.ownerUserId,
      feature: "follow_up",
      model: "claude-opus-4-8",
      usage: response.usage,
    });
    return { text: text || null, error: text ? null : "Empty draft." };
  } catch (err) {
    return {
      text: null,
      error: err instanceof Error ? err.message : "Draft failed",
    };
  }
}

/**
 * Copying a drafted nudge IS the outreach moment — record it so contact
 * attempts and the activity trail reflect the chase.
 */
export async function logFollowUpCopiedAction(data: {
  bidId: string;
}): Promise<void> {
  const ctx = await getOrgContext();
  if (!ctx) return;
  const rows = await db
    .select({
      id: bids.id,
      leadId: bids.leadId,
      propertyId: bids.propertyId,
      propertyName: bids.propertyName,
      primaryContactId: bids.primaryContactId,
    })
    .from(bids)
    .where(and(eq(bids.id, data.bidId), eq(bids.userId, ctx.ownerUserId)))
    .limit(1);
  const bid = rows[0];
  if (!bid) return;
  await db.insert(activityEvents).values({
    userId: ctx.ownerUserId,
    bidId: bid.id,
    leadId: bid.leadId,
    propertyId: bid.propertyId,
    contactId: bid.primaryContactId,
    type: "note",
    title: `Follow-up sent — ${bid.propertyName}`,
    body: "Drafted with Mercer and copied to send.",
    occurredAt: new Date(),
  });
  if (bid.leadId) {
    // Bumps contact_attempts + last_contacted_at (and its own call event).
    try {
      await logLeadContact(bid.leadId);
    } catch {
      // Best-effort — the activity event above already recorded the moment.
    }
  }
}
