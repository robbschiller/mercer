import { notFound } from "next/navigation";
import { getContactDetail } from "@/lib/store";
import { ContactDetailPanel } from "@/components/contact-detail-panel";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getContactDetail(id);
  if (!detail) notFound();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <BreadcrumbLabel segment={id} label={detail.contact.name} />
      <ContactDetailPanel
        detail={detail}
        closeHref="/contacts"
        buildAccountHref={(accountId) => `/leads/accounts/${accountId}`}
        buildPropertyHref={(propertyId) => `/leads/properties/${propertyId}`}
        buildLeadHref={(leadId) => `/leads/${leadId}`}
      />
    </div>
  );
}
