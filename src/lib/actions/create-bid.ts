"use server";

import { redirect } from "next/navigation";
import {
  addCatalogLineItem,
  createBid,
  getLead,
  getUserDefaults,
  updateBidPricing,
  updateLeadStatus,
} from "../store";
import { createBidSchema } from "../validations";

export async function createBidAction(formData: FormData) {
  const result = createBidSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/bids/new?error=${encodeURIComponent(message)}`);
  }

  let created: { bid: Awaited<ReturnType<typeof createBid>>; defaults: Awaited<ReturnType<typeof getUserDefaults>> } | null = null;
  try {
    const [bid, defaults] = await Promise.all([createBid(result.data), getUserDefaults()]);
    created = { bid, defaults };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create bid";
    redirect(`/bids/new?error=${encodeURIComponent(message)}`);
  }

  if (created?.defaults) {
    await updateBidPricing(created.bid.id, {
      coverageSqftPerGallon: created.defaults.coverageSqftPerGallon,
      pricePerGallon: created.defaults.pricePerGallon,
      laborRatePerUnit: created.defaults.laborRatePerUnit,
      marginPercent: created.defaults.marginPercent,
    });
  }

  if (result.data.leadId) {
    await updateLeadStatus(result.data.leadId, "quoted");
  }

  redirect(`/bids/${created!.bid.id}`);
}

/**
 * Small-job takeoff (AQP's catalog/SKU path): one screen from lead to priced
 * bid — pick quantities off the org price list, no buildings/surfaces. Qty
 * fields arrive as `qty_<priceListItemId>` form entries.
 */
export async function createSmallTakeoffAction(formData: FormData) {
  const leadId = (formData.get("leadId") as string) || "";
  const errorPath = `/bids/new/small?leadId=${encodeURIComponent(leadId)}`;

  const picks: Array<{ priceListItemId: string; quantity: number }> = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("qty_")) continue;
    const quantity = Number(value);
    if (Number.isFinite(quantity) && quantity > 0) {
      picks.push({ priceListItemId: key.slice(4), quantity });
    }
  }
  if (picks.length === 0) {
    redirect(
      `${errorPath}&error=${encodeURIComponent("Set a quantity on at least one catalog item")}`,
    );
  }

  let bidId: string | null = null;
  try {
    const lead = await getLead(leadId);
    if (!lead) throw new Error("Lead not found");
    const bid = await createBid({
      leadId: lead.id,
      propertyName: lead.propertyName ?? lead.name,
      address: lead.resolvedAddress ?? "—",
      clientName: lead.company ?? lead.name,
      notes: lead.notes ?? "",
      latitude: lead.latitude,
      longitude: lead.longitude,
      googlePlaceId: lead.googlePlaceId,
    });
    bidId = bid.id;
    for (const pick of picks) {
      await addCatalogLineItem(bid.id, pick.priceListItemId, pick.quantity);
    }
    await updateLeadStatus(lead.id, "quoted");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create takeoff";
    redirect(`${errorPath}&error=${encodeURIComponent(message)}`);
  }

  redirect(`/bids/${bidId}`);
}
