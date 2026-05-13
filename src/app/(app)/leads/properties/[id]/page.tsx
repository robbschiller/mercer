import { notFound } from "next/navigation";
import { getPropertyDetail } from "@/lib/store";
import { PropertyDetailPanel } from "@/components/property-detail-panel";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPropertyDetail(id);
  if (!detail) notFound();

  const label =
    detail.property.name ?? detail.property.address ?? "Untitled property";

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <BreadcrumbLabel segment={id} label={label} />
      <PropertyDetailPanel
        detail={detail}
        closeHref="/leads"
        buildAccountHref={(accountId) => `/leads/accounts/${accountId}`}
        buildContactHref={(contactId) => `/leads/contacts/${contactId}`}
        buildLeadHref={(leadId) => `/leads/${leadId}`}
      />
    </div>
  );
}
