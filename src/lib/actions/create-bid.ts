"use server";

import { redirect } from "next/navigation";
import { createBid, getUserDefaults, updateBidPricing } from "../store";
import { createBidSchema } from "../validations";

export async function createBidAction(formData: FormData) {
  const result = createBidSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/bids/new?error=${encodeURIComponent(message)}`);
  }

  const [bid, defaults] = await Promise.all([
    createBid(result.data),
    getUserDefaults(),
  ]);

  if (defaults) {
    await updateBidPricing(bid.id, {
      coverageSqftPerGallon: defaults.coverageSqftPerGallon,
      pricePerGallon: defaults.pricePerGallon,
      laborRatePerUnit: defaults.laborRatePerUnit,
      marginPercent: defaults.marginPercent,
    });
  }

  redirect(`/bids/${bid.id}`);
}
