import Link from "next/link";
import { Building2, CalendarClock, ExternalLink, Mail, Phone } from "lucide-react";
import type { LeadPropertyGroup } from "@/lib/store";
import { leadFullName } from "@/lib/leads/name";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  leadStatusLabel,
  leadStatusVariant,
} from "@/lib/status-meta";

export function PropertyDetailPanel({
  group,
  closeHref,
  buildLeadHref,
}: {
  group: LeadPropertyGroup;
  closeHref: string;
  buildLeadHref: (id: string) => string;
}) {
  const heading = group.propertyName ?? group.address ?? "No property address";
  const contacts = group.contacts;
  const primaryLead = contacts[0] ?? null;
  const statusCounts = countStatuses(contacts);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            Property opportunity
          </p>
          <h2 className="text-2xl font-medium tracking-tight">{heading}</h2>
          {group.propertyName && group.address ? (
            <p className="mt-1 text-sm text-muted-foreground">{group.address}</p>
          ) : null}
          {group.managementCompany ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {group.managementCompany}
            </p>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={closeHref} scroll={false}>
            Close
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Contacts" value={String(group.contactCount)} />
        <Metric
          label="Portfolio"
          value={group.portfolioCount ? String(group.portfolioCount) : "-"}
        />
        <Metric
          label="Follow-up"
          value={group.earliestFollowUp ? formatDate(group.earliestFollowUp) : "-"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {statusCounts.map(({ status, count }) => (
            <Badge key={status} variant={leadStatusVariant(status)}>
              {count} {leadStatusLabel(status)}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacts at this property</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {contacts.map((lead) => (
            <div key={lead.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={buildLeadHref(lead.id)}
                    scroll={false}
                    className="font-medium text-foreground hover:underline"
                  >
                    {leadFullName(lead)}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {lead.email ? (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </span>
                    ) : null}
                    {lead.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Badge variant={leadStatusVariant(lead.status)}>
                  {leadStatusLabel(lead.status)}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {lead.followUpAt
                    ? `Follow-up ${formatDate(lead.followUpAt)}`
                    : "No follow-up"}
                </span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/bids/new?leadId=${lead.id}`}>
                    Bid
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Next action</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          {primaryLead ? (
            <>
              <p>
                Work the property through the strongest available contact, then
                create a one-property bid from that lead.
              </p>
              <Button variant="amber" asChild>
                <Link href={`/bids/new?leadId=${primaryLead.id}`}>
                  Create bid for this property
                </Link>
              </Button>
            </>
          ) : (
            <p>No contacts are linked to this property yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <p className="text-[11px] font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function countStatuses(contacts: LeadPropertyGroup["contacts"]) {
  const counts = new Map<string, number>();
  for (const lead of contacts) {
    counts.set(lead.status, (counts.get(lead.status) ?? 0) + 1);
  }
  return Array.from(counts, ([status, count]) => ({ status, count }));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
