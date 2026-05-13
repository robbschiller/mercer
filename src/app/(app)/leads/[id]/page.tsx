import { notFound } from "next/navigation";
import { getLead, getLatestBidForLead } from "@/lib/store";
import { LeadDetailBody } from "@/components/lead-detail-body";
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
  const [lead, linkedBid] = await Promise.all([
    getLead(id),
    getLatestBidForLead(id),
  ]);
  if (!lead) notFound();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <BreadcrumbLabel segment={id} label={leadFullName(lead)} />
      <LeadDetailBody
        lead={lead}
        linkedBid={linkedBid}
        error={error}
        closeHref="/leads"
      />
    </div>
  );
}
