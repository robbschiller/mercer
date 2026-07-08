import Link from "next/link";
import {
  Briefcase,
  Building2,
  CalendarClock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  User,
} from "lucide-react";
import type { ContactDetail } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  contactMethodLabel,
  leadStatusLabel,
  leadStatusVariant,
} from "@/lib/status-meta";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function ContactDetailPanel({
  detail,
  closeHref,
  buildAccountHref,
  buildPropertyHref,
  buildLeadHref,
}: {
  detail: ContactDetail;
  closeHref: string;
  buildAccountHref: (id: string) => string;
  buildPropertyHref: (id: string) => string;
  buildLeadHref: (id: string) => string;
}) {
  const { contact, account, properties, leads, lifetimeAwarded } = detail;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            Contact
          </p>
          <h2 className="truncate text-2xl font-medium tracking-tight">
            {contact.name}
          </h2>
          {contact.title ? (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {contact.title}
            </p>
          ) : null}
          {account ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              <Link
                href={buildAccountHref(account.id)}
                scroll={false}
              className="min-w-0 truncate text-muted-foreground hover:text-foreground hover:underline"
              >
                {account.name}
              </Link>
            </p>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" asChild>
          <Link href={closeHref} scroll={false}>
            Close
          </Link>
        </Button>
      </div>

      {/* AQP §4 rollups: reach × book of business at a glance. A PM may
          manage 1 property; a regional manager 16–20. */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Properties managed
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {properties.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Lifetime awarded
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {lifetimeAwarded > 0
                ? currency.format(lifetimeAwarded)
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reach</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {contact.preferredContactMethod ? (
            <span className="inline-flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Prefers{" "}
              <Badge variant="secondary">
                {contactMethodLabel(contact.preferredContactMethod)}
              </Badge>
            </span>
          ) : null}
          {contact.email ? (
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex min-w-0 items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{contact.email}</span>
            </a>
          ) : (
            <span className="text-muted-foreground/60">No email</span>
          )}
          {contact.phone ? (
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Phone className="h-3.5 w-3.5" />
              {contact.phone}
            </a>
          ) : (
            <span className="text-muted-foreground/60">No phone</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Properties they work</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {properties.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Not linked to any properties yet.
            </p>
          ) : (
            properties.map(({ property, role, status, followUpAt }) => (
              <div key={property.id} className="flex flex-col gap-1.5 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={buildPropertyHref(property.id)}
                    scroll={false}
                    className="inline-flex min-w-0 items-center gap-2 font-medium text-foreground hover:underline"
                  >
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {property.name ?? property.address ?? "Untitled property"}
                    </span>
                  </Link>
                  {status ? (
                    <Badge variant={leadStatusVariant(status)}>
                      {leadStatusLabel(status)}
                    </Badge>
                  ) : null}
                </div>
                {property.address && property.name ? (
                  <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{property.address}</span>
                  </span>
                ) : null}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {role ? <span>{role}</span> : null}
                  {followUpAt ? (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      Follow-up {formatDate(followUpAt)}
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {leads.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y p-0">
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={buildLeadHref(lead.id)}
                scroll={false}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {lead.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDateTime(lead.createdAt)}
                    {lead.followUpAt
                      ? ` · Follow-up ${formatDate(lead.followUpAt)}`
                      : ""}
                  </p>
                </div>
                <Badge variant={leadStatusVariant(lead.status)}>
                  {leadStatusLabel(lead.status)}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
