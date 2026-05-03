"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
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
  upsertUserDefaults,
  getBidPageData,
  createProposal,
  createProposalShare,
  createLead,
  createLeadsBatch,
  updateLead,
  updateLeadStatus,
  logLeadContact,
  setLeadFollowUp,
  getLead,
  acceptProposalShare,
  declineProposalShare,
  getProject,
  updateProjectStatus,
  updateProjectDetails,
  createProjectUpdate,
  getShareSlugsForBid,
  markOnboardingWebsiteSubmitted,
  markOnboardingProfileConfirmed,
  markOnboardingComplete,
  skipOnboarding,
  upsertCompanyProfile,
  setEnrichmentResult,
  inviteOrgMember,
  removeOrgMember,
} from "./store";
import { getOrgContext } from "./org-context";
import { enrichCompanyFromWebsite } from "./onboarding/enrich-from-website";
import { getAppOrigin } from "./env";
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
  updateLeadSchema,
  enrichLeadActionSchema,
  logLeadContactSchema,
  setLeadFollowUpSchema,
  updateProjectStatusSchema,
  updateProjectDetailsSchema,
  createProjectUpdateSchema,
  submitWebsiteSchema,
  confirmCompanyProfileSchema,
  confirmThemeSchema,
  updateCompanyProfileSchema,
  inviteOrgMemberSchema,
  removeOrgMemberSchema,
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
    const siteUrl = getAppOrigin();
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
 * "pending" → schedule enrichment after the response. Redirects immediately
 * so large trade-show files do not sit inside one long-running server action.
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
  if (!mapping.name && !mapping.firstName && !mapping.lastName) {
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

  after(async () => {
    try {
      await runEnrichmentForBatch(inserted);
    } catch (err) {
      console.error("[importLeadsAction] enrichment batch error:", err);
    }
  });

  revalidatePath("/leads");
  redirect(`/leads?imported=${inserted.length}`);
}

export async function updateLeadStatusAction(formData: FormData) {
  const result = updateLeadStatusSchema.safeParse(formDataToObject(formData));
  if (!result.success) {
    const id = (formData.get("id") as string) || "";
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(
      id
        ? `/leads/${id}?error=${encodeURIComponent(message)}`
        : `/leads?error=${encodeURIComponent(message)}`
    );
  }
  try {
    await updateLeadStatus(result.data.id, result.data.status);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update lead status";
    redirect(`/leads/${result.data.id}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/leads");
  revalidatePath(`/leads/${result.data.id}`);
}

export async function updateLeadAction(formData: FormData) {
  const result = updateLeadSchema.safeParse(formDataToObject(formData));
  if (!result.success) {
    const id = (formData.get("id") as string) || "";
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(
      id
        ? `/leads?lead=${id}&error=${encodeURIComponent(message)}`
        : `/leads?error=${encodeURIComponent(message)}`,
    );
  }
  const { id, ...patch } = result.data;
  try {
    await updateLead(id, patch);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update lead";
    redirect(`/leads?lead=${id}&error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
}

export async function logLeadContactAction(formData: FormData) {
  const result = logLeadContactSchema.safeParse(formDataToObject(formData));
  if (!result.success) {
    const id = (formData.get("id") as string) || "";
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(
      id
        ? `/leads?lead=${id}&error=${encodeURIComponent(message)}`
        : `/leads?error=${encodeURIComponent(message)}`,
    );
  }
  try {
    await logLeadContact(result.data.id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to log contact";
    redirect(
      `/leads?lead=${result.data.id}&error=${encodeURIComponent(message)}`,
    );
  }
  revalidatePath("/leads");
  revalidatePath(`/leads/${result.data.id}`);
}

export async function setLeadFollowUpAction(formData: FormData) {
  const result = setLeadFollowUpSchema.safeParse(formDataToObject(formData));
  if (!result.success) {
    const id = (formData.get("id") as string) || "";
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(
      id
        ? `/leads?lead=${id}&error=${encodeURIComponent(message)}`
        : `/leads?error=${encodeURIComponent(message)}`,
    );
  }
  try {
    await setLeadFollowUp(result.data.id, result.data.followUpAt);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to set follow-up";
    redirect(
      `/leads?lead=${result.data.id}&error=${encodeURIComponent(message)}`,
    );
  }
  revalidatePath("/leads");
  revalidatePath(`/leads/${result.data.id}`);
}

export async function enrichLeadAction(formData: FormData) {
  const result = enrichLeadActionSchema.safeParse(formDataToObject(formData));
  if (!result.success) {
    const id = (formData.get("id") as string) || "";
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(
      id
        ? `/leads/${id}?error=${encodeURIComponent(message)}`
        : `/leads?error=${encodeURIComponent(message)}`
    );
  }
  const lead = await getLead(result.data.id);
  if (!lead) {
    redirect(`/leads?error=${encodeURIComponent("Lead not found")}`);
  }
  try {
    await runEnrichmentForLead(lead);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Enrichment failed";
    redirect(`/leads/${lead.id}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/leads/${lead.id}`);
  revalidatePath("/leads");
}

// ── Projects ──

async function revalidateProjectAndShares(
  projectId: string,
  bidId: string
): Promise<void> {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  revalidatePath(`/bids/${bidId}`);
  const slugs = await getShareSlugsForBid(bidId);
  for (const slug of slugs) {
    revalidatePath(`/p/${slug}`);
  }
}

function projectErrorRedirect(id: string | null, message: string): never {
  const target = id
    ? `/projects/${id}?error=${encodeURIComponent(message)}`
    : `/projects?error=${encodeURIComponent(message)}`;
  redirect(target);
}

export async function updateProjectStatusAction(formData: FormData) {
  const result = updateProjectStatusSchema.safeParse(formDataToObject(formData));
  if (!result.success) {
    projectErrorRedirect(
      (formData.get("id") as string) || null,
      result.error.issues[0]?.message ?? "Invalid input"
    );
  }
  const projectWithBid = await getProject(result.data.id);
  if (!projectWithBid) projectErrorRedirect(null, "Project not found");
  try {
    await updateProjectStatus(result.data.id, result.data.status);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update project status";
    projectErrorRedirect(result.data.id, message);
  }
  await revalidateProjectAndShares(result.data.id, projectWithBid.bid.id);
}

export async function updateProjectDetailsAction(formData: FormData) {
  const result = updateProjectDetailsSchema.safeParse(
    formDataToObject(formData)
  );
  if (!result.success) {
    projectErrorRedirect(
      (formData.get("id") as string) || null,
      result.error.issues[0]?.message ?? "Invalid input"
    );
  }
  const projectWithBid = await getProject(result.data.id);
  if (!projectWithBid) projectErrorRedirect(null, "Project not found");
  try {
    await updateProjectDetails(result.data.id, {
      targetStartDate: result.data.targetStartDate,
      targetEndDate: result.data.targetEndDate,
      assignedSub: result.data.assignedSub,
      crewLeadName: result.data.crewLeadName,
      notes: result.data.notes,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save project details";
    projectErrorRedirect(result.data.id, message);
  }
  await revalidateProjectAndShares(result.data.id, projectWithBid.bid.id);
}

export async function createProjectUpdateAction(formData: FormData) {
  const result = createProjectUpdateSchema.safeParse(
    formDataToObject(formData)
  );
  if (!result.success) {
    projectErrorRedirect(
      (formData.get("projectId") as string) || null,
      result.error.issues[0]?.message ?? "Invalid input"
    );
  }
  const projectWithBid = await getProject(result.data.projectId);
  if (!projectWithBid) projectErrorRedirect(null, "Project not found");
  try {
    await createProjectUpdate(result.data.projectId, {
      body: result.data.body,
      visibleOnPublicUrl: result.data.visibleOnPublicUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to post update";
    projectErrorRedirect(result.data.projectId, message);
  }
  await revalidateProjectAndShares(
    result.data.projectId,
    projectWithBid.bid.id
  );
}

// ── Onboarding ──

const ENRICHMENT_HARD_TIMEOUT_MS = 15000;

export async function submitOnboardingWebsiteAction(formData: FormData) {
  const result = submitWebsiteSchema.safeParse(formDataToObject(formData));
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(
      `/onboarding?step=website&error=${encodeURIComponent(message)}`
    );
  }
  const websiteUrl = result.data.websiteUrl;
  await markOnboardingWebsiteSubmitted(websiteUrl);

  const ctx = await getOrgContext();
  if (!ctx) redirect("/login");

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error("enrichment hard timeout")),
    ENRICHMENT_HARD_TIMEOUT_MS
  );
  try {
    const extraction = await enrichCompanyFromWebsite(websiteUrl, {
      signal: controller.signal,
    });
    await setEnrichmentResult(ctx.ownerUserId, {
      status: "success",
      data: extraction,
      raw: extraction,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setEnrichmentResult(ctx.ownerUserId, {
      status: "failed",
      error: message,
    });
  } finally {
    clearTimeout(timer);
  }

  redirect("/onboarding?step=confirm");
}

export async function confirmOnboardingProfileAction(formData: FormData) {
  const result = confirmCompanyProfileSchema.safeParse(
    formDataToObject(formData)
  );
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(
      `/onboarding?step=confirm&error=${encodeURIComponent(message)}`
    );
  }
  await upsertCompanyProfile(result.data);
  await markOnboardingProfileConfirmed();
  redirect("/onboarding?step=theme");
}

export async function confirmOnboardingThemeAction(formData: FormData) {
  const result = confirmThemeSchema.safeParse(formDataToObject(formData));
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(
      `/onboarding?step=theme&error=${encodeURIComponent(message)}`
    );
  }
  await upsertCompanyProfile(result.data);
  await markOnboardingComplete();
  redirect("/bids");
}

export async function skipOnboardingAction() {
  await skipOnboarding();
  redirect("/bids");
}

export async function updateCompanyProfileAction(formData: FormData) {
  const result = updateCompanyProfileSchema.safeParse(
    formDataToObject(formData),
  );
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/settings/company?error=${encodeURIComponent(message)}`);
  }
  try {
    await upsertCompanyProfile(result.data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save";
    redirect(`/settings/company?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/settings/company");
  revalidatePath("/", "layout");
  redirect("/settings/company?saved=1");
}

// ── Org members ──

export async function inviteOrgMemberAction(formData: FormData) {
  const result = inviteOrgMemberSchema.safeParse(formDataToObject(formData));
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/settings/members?error=${encodeURIComponent(message)}`);
  }
  try {
    const inserted = await inviteOrgMember(result.data);
    if (!inserted) {
      redirect(
        `/settings/members?error=${encodeURIComponent("This email already has a pending invite or active membership.")}`,
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to invite member";
    redirect(`/settings/members?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/settings/members");
  redirect("/settings/members?invited=1");
}

export async function removeOrgMemberAction(formData: FormData) {
  const result = removeOrgMemberSchema.safeParse(formDataToObject(formData));
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input";
    redirect(`/settings/members?error=${encodeURIComponent(message)}`);
  }
  try {
    await removeOrgMember(result.data.membershipId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove member";
    redirect(`/settings/members?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/settings/members");
  redirect("/settings/members");
}
