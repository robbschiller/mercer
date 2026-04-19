"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
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
  getBidPageData,
  createProposal,
  createProposalShare,
  createLead,
  createLeadsBatch,
  updateLeadStatus,
  getLead,
  acceptProposalShare,
  declineProposalShare,
} from "./store";
import { parseCsv, autoMapColumns, mapRowsToLeads } from "./leads/csv";
import {
  runEnrichmentForBatch,
  runEnrichmentForLead,
} from "./leads/enrichment-runner";
import { createClient } from "./supabase/server";
import {
  signInSchema,
  signUpSchema,
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
  generateProposalSchema,
  createProposalShareSchema,
  acceptProposalShareSchema,
  declineProposalShareSchema,
  createLeadSchema,
  importLeadsSchema,
  updateLeadStatusSchema,
  enrichLeadActionSchema,
} from "./validations";
import { calculateBidPricing } from "./pricing";
import type { ProposalSnapshot } from "./pdf/types";
import { generateProposalPdf } from "./pdf/generate";
import { fetchSatelliteImageDataUriForPdf } from "./maps/satellite-pdf";
import { createBidAction as createBidActionImpl } from "./actions/create-bid";

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

  redirect("/dashboard");
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
  return createBidActionImpl(formData);
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
    redirect(`/bids/${bidId}?error=${encodeURIComponent(result.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const { bidId, ...data } = result.data;
  await createBuilding(bidId, data);
  revalidatePath(`/bids/${bidId}`);
}

export async function updateBuildingAction(formData: FormData) {
  const result = updateBuildingSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    const bidId = formData.get("bidId") as string;
    redirect(`/bids/${bidId}?error=${encodeURIComponent(result.error.issues[0]?.message ?? "Invalid input")}`);
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
    return { error: result.error.issues[0]?.message ?? "Invalid input" };
  }

  await deleteSurface(result.data.id);
  revalidatePath(`/bids/${result.data.bidId}`);
  return { error: null };
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

  // Save to bid and upsert defaults in parallel
  await Promise.all([
    updateBidPricing(id, pricingData),
    upsertUserDefaults(pricingData),
  ]);

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
    return { error: result.error.issues[0]?.message ?? "Invalid input" };
  }

  await deleteLineItem(result.data.id);
  revalidatePath(`/bids/${result.data.bidId}`);
  return { error: null };
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

// ── Proposals ──

export async function generateProposalAction(data: { bidId: string }) {
  const result = generateProposalSchema.safeParse(data);

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input", pdfUrl: null };
  }

  const pageData = await getBidPageData(result.data.bidId);
  if (!pageData) {
    return { error: "Bid not found", pdfUrl: null };
  }

  const { bid, buildings, surfacesByBuilding, lineItems, totalSqft } = pageData;

  const pricing = calculateBidPricing({
    totalSqft,
    coverageSqftPerGallon: bid.coverageSqftPerGallon
      ? Number(bid.coverageSqftPerGallon)
      : null,
    pricePerGallon: bid.pricePerGallon ? Number(bid.pricePerGallon) : null,
    laborRatePerUnit: bid.laborRatePerUnit
      ? Number(bid.laborRatePerUnit)
      : null,
    marginPercent: bid.marginPercent ? Number(bid.marginPercent) : null,
    lineItems: lineItems.map((li) => ({
      name: li.name,
      amount: Number(li.amount),
    })),
  });

  if (!pricing.complete || pricing.grandTotal == null) {
    return { error: "Pricing is incomplete. Fill in all pricing fields before generating a proposal.", pdfUrl: null };
  }

  const snapshot: ProposalSnapshot = {
    propertyName: bid.propertyName,
    address: bid.address,
    clientName: bid.clientName,
    notes: bid.notes,
    buildings: buildings.map((b) => ({
      label: b.label,
      count: b.count,
      totalSqft: b.totalSqft,
      surfaces: (surfacesByBuilding[b.id] ?? []).map((s) => ({
        name: s.name,
        dimensions: s.dimensions,
        totalSqft: Number(s.totalSqft ?? 0),
      })),
    })),
    lineItems: lineItems.map((li) => ({
      name: li.name,
      amount: Number(li.amount),
    })),
    totalSqft,
    grandTotal: pricing.grandTotal,
    generatedAt: new Date().toISOString(),
  };

  const satelliteImageDataUri = await fetchSatelliteImageDataUriForPdf(bid);
  const snapshotForPdf: ProposalSnapshot = satelliteImageDataUri
    ? { ...snapshot, satelliteImageDataUri }
    : snapshot;

  const pdfBuffer = await generateProposalPdf(snapshotForPdf);

  const supabase = await createClient();
  const fileName = `${bid.id}/${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("proposals")
    .upload(fileName, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return { error: `Failed to upload PDF: ${uploadError.message}`, pdfUrl: null };
  }

  const { data: urlData } = supabase.storage
    .from("proposals")
    .getPublicUrl(fileName);

  const proposal = await createProposal(
    bid.id,
    snapshot,
    urlData.publicUrl
  );

  if (bid.status === "draft") {
    await updateBid(bid.id, { status: "sent" });
  }

  if (bid.leadId) {
    await updateLeadStatus(bid.leadId, "quoted");
  }

  revalidatePath(`/bids/${bid.id}`);
  revalidatePath("/bids");
  revalidatePath("/dashboard");
  if (bid.leadId) {
    revalidatePath(`/leads/${bid.leadId}`);
    revalidatePath("/leads");
  }
  return { error: null, pdfUrl: proposal.pdfUrl };
}

export async function createProposalShareAction(data: { proposalId: string }) {
  const result = createProposalShareSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input", shareUrl: null };
  }

  try {
    const share = await createProposalShare(result.data.proposalId);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    revalidatePath(`/bids/${share.bidId}`);
    revalidatePath("/bids");
    return { error: null, shareUrl: `${siteUrl}/p/${share.id}` };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create share link";
    return { error: message, shareUrl: null };
  }
}

export async function acceptProposalShareAction(formData: FormData) {
  const result = acceptProposalShareSchema.safeParse(formDataToObject(formData));
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    const { bidId, leadId } = await acceptProposalShare(result.data.slug, {
      acceptedByName: result.data.acceptedByName,
      acceptedByTitle: result.data.acceptedByTitle,
    });
    revalidatePath(`/p/${result.data.slug}`);
    revalidatePath(`/bids/${bidId}`);
    revalidatePath("/bids");
    revalidatePath("/dashboard");
    if (leadId) {
      revalidatePath(`/leads/${leadId}`);
      revalidatePath("/leads");
    }
    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to accept proposal";
    return { error: message };
  }
}

export async function declineProposalShareAction(formData: FormData) {
  const result = declineProposalShareSchema.safeParse(formDataToObject(formData));
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    const { bidId, leadId } = await declineProposalShare(result.data.slug, {
      reason: result.data.reason,
    });
    revalidatePath(`/p/${result.data.slug}`);
    revalidatePath(`/bids/${bidId}`);
    revalidatePath("/bids");
    revalidatePath("/dashboard");
    if (leadId) {
      revalidatePath(`/leads/${leadId}`);
      revalidatePath("/leads");
    }
    return { error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to decline proposal";
    return { error: message };
  }
}

// ── Leads ──

export async function createLeadAction(formData: FormData) {
  const result = createLeadSchema.safeParse(formDataToObject(formData));

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/leads/new?error=${encodeURIComponent(message)}`);
  }

  await createLead(result.data);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  redirect("/leads");
}

/**
 * Import leads from a CSV file upload.
 *
 * Expected form fields:
 *   - file: File (text/csv)
 *   - sourceTag: string (optional)
 *
 * Flow: parse CSV → auto-map columns → bulk insert with enrichment_status
 * "pending" → kick off enrichment worker inline (Places-only). Redirects to
 * /leads so the user sees the new rows. Enrichment runs during the action
 * so by the time the redirect resolves, satellite previews are populated.
 */
export async function importLeadsAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/leads/import?error=${encodeURIComponent("Select a CSV file")}`);
  }

  const parsedMeta = importLeadsSchema.safeParse({
    sourceTag: formData.get("sourceTag"),
  });
  if (!parsedMeta.success) {
    const message = parsedMeta.error.issues[0]?.message ?? "Invalid input";
    redirect(`/leads/import?error=${encodeURIComponent(message)}`);
  }

  const text = await (file as File).text();
  const { headers, rows } = parseCsv(text);

  if (headers.length === 0 || rows.length === 0) {
    redirect(
      `/leads/import?error=${encodeURIComponent("CSV appears empty or malformed")}`
    );
  }

  const mapping = autoMapColumns(headers);
  if (!mapping.name) {
    redirect(
      `/leads/import?error=${encodeURIComponent(
        `Could not find a name column. Headers seen: ${headers.join(", ")}`
      )}`
    );
  }

  const leadsToInsert = mapRowsToLeads(rows, mapping);
  if (leadsToInsert.length === 0) {
    redirect(
      `/leads/import?error=${encodeURIComponent("No rows with a name value")}`
    );
  }

  const inserted = await createLeadsBatch(leadsToInsert, parsedMeta.data.sourceTag ?? null);

  // Enrichment runs inline so the user sees resolved addresses on the next page.
  // If this grows unwieldy we can switch to a fire-and-forget pattern with
  // waitUntil() on Vercel, but for <100 rows / Places call it's fine.
  try {
    await runEnrichmentForBatch(inserted);
  } catch (err) {
    console.error("[importLeadsAction] enrichment batch error:", err);
  }

  revalidatePath("/leads");
  redirect(`/leads?imported=${inserted.length}`);
}

export async function updateLeadStatusAction(formData: FormData) {
  const result = updateLeadStatusSchema.safeParse(formDataToObject(formData));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid input");
  }
  await updateLeadStatus(result.data.id, result.data.status);
  revalidatePath("/leads");
  revalidatePath(`/leads/${result.data.id}`);
}

export async function enrichLeadAction(formData: FormData) {
  const result = enrichLeadActionSchema.safeParse(formDataToObject(formData));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid input");
  }
  const lead = await getLead(result.data.id);
  if (!lead) throw new Error("Lead not found");
  await runEnrichmentForLead(lead);
  revalidatePath(`/leads/${lead.id}`);
  revalidatePath("/leads");
}

