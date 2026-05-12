import Link from "next/link";
import {
  Briefcase,
  Building2,
  CalendarClock,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import type { AccountDetail } from "@/lib/store";
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

export function AccountDetailPanel({
  detail,
  closeHref,
  buildPropertyHref,
  buildContactHref,
}: {
  detail: AccountDetail;
  closeHref: string;
  buildPropertyHref: (id: string) => string;
  buildContactHref: (id: string) => string;
}) {
  const { account, properties, contacts, leadCount } = detail;
  const earliestFollowUp = properties.reduce<string | null>(
    (earliest, summary) => {
      if (!summary.earliestFollowUp) return earliest;
      if (!earliest || summary.earliestFollowUp < earliest) {
        return summary.earliestFollowUp;
      }
      return earliest;
    },
    null,
  );
  const aggregatePipeline = aggregatePipelineCounts(properties);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            Account
          </p>
          <h2 className="truncate text-2xl font-medium tracking-tight">
            {account.name}
          </h2>
          {account.website ? (
            <a
              href={account.website}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block truncate text-sm text-muted-foreground hover:text-foreground"
            >
              {account.website}
            </a>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" asChild>
          <Link href={closeHref} scroll={false}>
            Close
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Properties" value={String(properties.length)} />
        <Metric label="Contacts" value={String(contacts.length)} />
        <Metric
          label="Follow-up"
          value={earliestFollowUp ? formatDate(earliestFollowUp) : "-"}
        />
      </div>

      {aggregatePipeline.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline</CardTitle>
            <p className="text-xs text-muted-foreground">
              {leadCount} lead{leadCount === 1 ? "" : "s"} across all properties
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {aggregatePipeline.map(({ status, count }) => (
              <Badge key={status} variant={leadStatusVariant(status)}>
                {count} {leadStatusLabel(status)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Properties</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {properties.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No properties linked to this account yet.
            </p>
          ) : (
            properties.map(
              ({
                property,
                contactCount,
                leadCount: pLeadCount,
                earliestFollowUp: pFollowUp,
                pipeline,
              }) => (
                <div
                  key={property.id}
                  className="flex flex-col gap-2 px-4 py-3"
                >
                  <Link
                    href={buildPropertyHref(property.id)}
                    scroll={false}
                    className="inline-flex max-w-full min-w-0 items-center gap-2 font-medium text-foreground hover:underline"
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {property.name ?? property.address ?? "Untitled property"}
                    </span>
                  </Link>
                  {property.address && property.name ? (
                    <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{property.address}</span>
                    </span>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {contactCount} contact{contactCount === 1 ? "" : "s"}
                    </span>
                    <span>·</span>
                    <span>
                      {pLeadCount} lead{pLeadCount === 1 ? "" : "s"}
                    </span>
                    {pFollowUp ? (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {formatDate(pFollowUp)}
                        </span>
                      </>
                    ) : null}
                  </div>
                  {pipeline.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {pipeline.map(({ status, count }) => (
                        <Badge
                          key={status}
                          variant={leadStatusVariant(status)}
                        >
                          {count} {leadStatusLabel(status)}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ),
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {contacts.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No contacts on this account yet.
            </p>
          ) : (
            contacts.map(
              ({ contact, propertyCount, status, followUpAt }) => (
                <div
                  key={contact.id}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={buildContactHref(contact.id)}
                      scroll={false}
                      className="inline-flex max-w-full items-center gap-1.5 font-medium text-foreground hover:underline"
                    >
                      <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{contact.name}</span>
                    </Link>
                    {contact.title ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {contact.title}
                      </p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {contact.email ? (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </span>
                      ) : null}
                      {contact.phone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </span>
                      ) : null}
                      {propertyCount > 0 ? (
                        <span>
                          {propertyCount} propert
                          {propertyCount === 1 ? "y" : "ies"}
                        </span>
                      ) : null}
                      {followUpAt ? (
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {formatDate(followUpAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {status ? (
                    <Badge variant={leadStatusVariant(status)}>
                      {leadStatusLabel(status)}
                    </Badge>
                  ) : null}
                </div>
              ),
            )
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

function aggregatePipelineCounts(
  properties: AccountDetail["properties"],
) {
  const counts = new Map<string, number>();
  for (const summary of properties) {
    for (const { status, count } of summary.pipeline) {
      counts.set(status, (counts.get(status) ?? 0) + count);
    }
  }
  return Array.from(counts, ([status, count]) => ({ status, count }));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
