"use server";

import { redirect } from "next/navigation";
import { createBid, getUserDefaults, updateBidPricing, updateLeadStatus } from "../store";
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
