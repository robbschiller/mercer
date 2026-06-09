import { notFound } from "next/navigation";
import {
  getPropertyDetail,
  getPropertyRelationshipHistory,
  type RelationshipRow,
} from "@/lib/store";
import { PropertyDetailPanel } from "@/components/property-detail-panel";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

function fmtRange(r: RelationshipRow): string {
  const start = r.startDate;
  return r.endDate ? `${start} – ${r.endDate}` : `${start} – present`;
}

function RelationshipList({
  title,
  rows,
}: {
  title: string;
  rows: RelationshipRow[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">None recorded.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between text-sm">
              <span>{r.accountName}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {fmtRange(r)}
                {r.current && (
                  <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[0.6875rem] font-medium text-foreground">
                    current
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, history] = await Promise.all([
    getPropertyDetail(id),
    getPropertyRelationshipHistory(id),
  ]);
  if (!detail) notFound();

  const label =
    detail.property.name ?? detail.property.address ?? "Untitled property";

  return (
    <div className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <BreadcrumbLabel segment={id} label={label} />
      <PropertyDetailPanel
        detail={detail}
        closeHref="/leads"
        buildAccountHref={(accountId) => `/leads/accounts/${accountId}`}
        buildContactHref={(contactId) => `/contacts/${contactId}`}
        buildLeadHref={(leadId) => `/leads/${leadId}`}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relationship history</CardTitle>
          <CardDescription>
            Owners sell and management companies rotate — the property is the
            durable thing. Every relationship is dated.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <RelationshipList
            title="Management companies"
            rows={history.management}
          />
          <RelationshipList title="Owners" rows={history.owner} />
        </CardContent>
      </Card>
    </div>
  );
}
