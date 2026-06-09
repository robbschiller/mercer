import { notFound } from "next/navigation";
import { getContactDetail, getContactEmploymentHistory } from "@/lib/store";
import { ContactDetailPanel } from "@/components/contact-detail-panel";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, employment] = await Promise.all([
    getContactDetail(id),
    getContactEmploymentHistory(id),
  ]);
  if (!detail) notFound();

  return (
    <div className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <BreadcrumbLabel segment={id} label={detail.contact.name} />
      <ContactDetailPanel
        detail={detail}
        closeHref="/contacts"
        buildAccountHref={(accountId) => `/leads/accounts/${accountId}`}
        buildPropertyHref={(propertyId) => `/leads/properties/${propertyId}`}
        buildLeadHref={(leadId) => `/leads/${leadId}`}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employment history</CardTitle>
          <CardDescription>
            A contact keeps their identity as they move between firms. Each role
            is dated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employment.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No employment recorded.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {employment.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {e.accountName}
                    {e.title ? (
                      <span className="text-muted-foreground">
                        {" · "}
                        {e.title}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {e.endDate
                      ? `${e.startDate} – ${e.endDate}`
                      : `${e.startDate} – present`}
                    {e.current && (
                      <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[0.6875rem] font-medium text-foreground">
                        current
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
