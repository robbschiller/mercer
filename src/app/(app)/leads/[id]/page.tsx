import { notFound } from "next/navigation";
import { getLead, getLatestBidForLead, getPhotos } from "@/lib/store";
import { LeadDetailBody } from "@/components/lead-detail-body";
import { PhotosCard } from "@/components/photos-card";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";
import { leadFullName } from "@/lib/leads/name";

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [lead, linkedBid, photos] = await Promise.all([
    getLead(id),
    getLatestBidForLead(id),
    getPhotos("lead", id),
  ]);
  if (!lead) notFound();

  return (
    <div className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <BreadcrumbLabel segment={id} label={leadFullName(lead)} />
      <LeadDetailBody
        lead={lead}
        linkedBid={linkedBid}
        error={error}
        closeHref="/leads"
      />
      <PhotosCard
        contextType="lead"
        contextId={id}
        returnTo={`/leads/${id}`}
        photos={photos}
        defaultKind="intake"
        description="Intake and walk-through shots — what the takeoff crew should see before arriving."
      />
    </div>
  );
}
