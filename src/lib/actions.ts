"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createBid,
  updateBid,
  deleteBid,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  createSurface,
  updateSurface,
  deleteSurface,
  updateBidPricing,
  createLineItem,
  updateLineItem,
  deleteLineItem,
  getUserDefaults,
  upsertUserDefaults,
} from "./store";
import { createClient } from "./supabase/server";
import {
  signInSchema,
  signUpSchema,
  createBidSchema,
  updateBidSchema,
  deleteBidSchema,
  createBuildingSchema,
  updateBuildingSchema,
  deleteBuildingSchema,
  createSurfaceSchema,
  updateSurfaceSchema,
  deleteSurfaceSchema,
  updateBidPricingSchema,
  createLineItemSchema,
  updateLineItemSchema,
  deleteLineItemSchema,
  updateUserDefaultsSchema,
} from "./validations";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

// ── Auth ──

export async function signInAction(formData: FormData) {
  const result = signInSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/bids");
}

export async function signUpAction(formData: FormData) {
  const result = signUpSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp(result.data);

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=Check your email to confirm your account");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ── Bids ──

export async function createBidAction(formData: FormData) {
  const result = createBidSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/bids/new?error=${encodeURIComponent(message)}`);
  }

  const bid = await createBid(result.data);

  const defaults = await getUserDefaults();
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

export async function updateBidAction(formData: FormData) {
  const result = updateBidSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    const id = formData.get("id") as string;
    redirect(`/bids/${id}?error=${encodeURIComponent(message)}`);
  }

  const { id, ...data } = result.data;
  await updateBid(id, data);
  redirect(`/bids/${id}`);
}

export async function deleteBidAction(formData: FormData) {
  const result = deleteBidSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    redirect("/bids");
  }

  await deleteBid(result.data.id);
  redirect("/bids");
}

// ── Buildings ──

export async function createBuildingAction(formData: FormData) {
  const result = createBuildingSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    const bidId = formData.get("bidId") as string;
    redirect(`/bids/${bidId}`);
  }

  const { bidId, ...data } = result.data;
  await createBuilding(bidId, data);
  revalidatePath(`/bids/${bidId}`);
}

export async function updateBuildingAction(formData: FormData) {
  const result = updateBuildingSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    return;
  }

  const { id, ...data } = result.data;
  const bidId = formData.get("bidId") as string;
  await updateBuilding(id, data);
  revalidatePath(`/bids/${bidId}`);
}

export async function deleteBuildingAction(formData: FormData) {
  const result = deleteBuildingSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    return;
  }

  await deleteBuilding(result.data.id);
  revalidatePath(`/bids/${result.data.bidId}`);
}

// ── Surfaces ──

export async function createSurfaceAction(data: {
  buildingId: string;
  bidId: string;
  name: string;
  dimensions: number[][];
}) {
  const result = createSurfaceSchema.safeParse(data);

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input" };
  }

  const { buildingId, bidId, ...surfaceData } = result.data;
  await createSurface(buildingId, surfaceData);
  revalidatePath(`/bids/${bidId}`);
  return { error: null };
}

export async function updateSurfaceAction(data: {
  id: string;
  bidId: string;
  name: string;
  dimensions: number[][];
}) {
  const result = updateSurfaceSchema.safeParse(data);

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input" };
  }

  const { id, bidId, ...surfaceData } = result.data;
  await updateSurface(id, surfaceData);
  revalidatePath(`/bids/${bidId}`);
  return { error: null };
}

export async function deleteSurfaceAction(data: {
  id: string;
  bidId: string;
}) {
  const result = deleteSurfaceSchema.safeParse(data);

  if (!result.success) {
    return;
  }

  await deleteSurface(result.data.id);
  revalidatePath(`/bids/${result.data.bidId}`);
}

// ── Pricing ──

export async function updateBidPricingAction(data: {
  id: string;
  coverageSqftPerGallon: string | number | null;
  pricePerGallon: string | number | null;
  laborRatePerUnit: string | number | null;
  marginPercent: string | number | null;
}) {
  const result = updateBidPricingSchema.safeParse(data);

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input" };
  }

  const { id, ...pricingData } = result.data;
  await updateBidPricing(id, pricingData);

  // Upsert back to user defaults so future bids inherit these values
  await upsertUserDefaults(pricingData);

  revalidatePath(`/bids/${id}`);
  return { error: null };
}

// ── Line Items ──

export async function createLineItemAction(data: {
  bidId: string;
  name: string;
  amount: string | number;
}) {
  const result = createLineItemSchema.safeParse(data);

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input" };
  }

  const { bidId, ...itemData } = result.data;
  await createLineItem(bidId, itemData);
  revalidatePath(`/bids/${bidId}`);
  return { error: null };
}

export async function updateLineItemAction(data: {
  id: string;
  bidId: string;
  name: string;
  amount: string | number;
}) {
  const result = updateLineItemSchema.safeParse(data);

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input" };
  }

  const { id, bidId, ...itemData } = result.data;
  await updateLineItem(id, itemData);
  revalidatePath(`/bids/${bidId}`);
  return { error: null };
}

export async function deleteLineItemAction(data: {
  id: string;
  bidId: string;
}) {
  const result = deleteLineItemSchema.safeParse(data);

  if (!result.success) {
    return;
  }

  await deleteLineItem(result.data.id);
  revalidatePath(`/bids/${result.data.bidId}`);
}

// ── User Defaults ──

export async function updateUserDefaultsAction(data: {
  coverageSqftPerGallon: string | number | null;
  pricePerGallon: string | number | null;
  laborRatePerUnit: string | number | null;
  marginPercent: string | number | null;
}) {
  const result = updateUserDefaultsSchema.safeParse(data);

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input" };
  }

  await upsertUserDefaults(result.data);
  return { error: null };
}
