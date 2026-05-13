import { notFound } from "next/navigation";
import { getAccountDetail } from "@/lib/store";
import { AccountDetailPanel } from "@/components/account-detail-panel";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAccountDetail(id);
  if (!detail) notFound();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <BreadcrumbLabel segment={id} label={detail.account.name} />
      <AccountDetailPanel
        detail={detail}
        closeHref="/leads"
        buildPropertyHref={(propertyId) => `/leads/properties/${propertyId}`}
        buildContactHref={(contactId) => `/leads/contacts/${contactId}`}
      />
    </div>
  );
}
