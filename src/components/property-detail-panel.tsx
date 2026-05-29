import Link from "next/link";
import {
  Building2,
  CalendarClock,
  ExternalLink,
  Mail,
  Phone,
  Scale,
  User,
} from "lucide-react";
import type { PropertyDetail } from "@/lib/store";
import { setPropertyOwnershipAction } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  leadStatusLabel,
  leadStatusVariant,
} from "@/lib/status-meta";

export function PropertyDetailPanel({
  detail,
  closeHref,
  buildAccountHref,
  buildContactHref,
  buildLeadHref,
}: {
  detail: PropertyDetail;
  closeHref: string;
  buildAccountHref: (id: string) => string;
  buildContactHref: (id: string) => string;
  buildLeadHref: (id: string) => string;
}) {
  const { property, account, managementAccount, ownerParty, contacts, leads, portfolioCount } =
    detail;
  const managementName = managementAccount?.name ?? account?.name ?? null;
  const ntoContact = ownerParty?.contactId
    ? (contacts.find((c) => c.contact.id === ownerParty.contactId)?.contact ??
      null)
    : null;
  const ntoTarget =
    ntoContact?.name ?? ownerParty?.legalOwnerName ?? null;
  const heading = property.name ?? property.address ?? "Untitled property";
  const earliestFollowUp = leads.reduce<string | null>((earliest, lead) => {
    if (!lead.followUpAt) return earliest;
    if (!earliest || lead.followUpAt < earliest) return lead.followUpAt;
    return earliest;
  }, null);
  const statusCounts = countLeadStatuses(leads);
  const primaryLead = leads[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            Property
          </p>
          <h2 className="truncate text-2xl font-medium tracking-tight">
            {heading}
          </h2>
          {property.name && property.address ? (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {property.address}
            </p>
          ) : null}
          {account ? (
            <p className="mt-2 text-sm">
              <Link
                href={buildAccountHref(account.id)}
                scroll={false}
                className="text-muted-foreground hover:text-foreground hover:underline"
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

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Contacts" value={String(contacts.length)} />
        <Metric
          label="Portfolio"
          value={portfolioCount > 1 ? String(portfolioCount) : "-"}
        />
        <Metric
          label="Follow-up"
          value={earliestFollowUp ? formatDate(earliestFollowUp) : "-"}
        />
      </div>

      {statusCounts.length > 0 ? (
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
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacts at this property</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y p-0">
          {contacts.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No contacts linked to this property yet.
            </p>
          ) : (
            contacts.map(({ contact, role, status, followUpAt, leadId }) => (
              <div key={contact.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={buildContactHref(contact.id)}
                      scroll={false}
                      className="inline-flex max-w-full items-center gap-1.5 font-medium text-foreground hover:underline"
                    >
                      <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{contact.name}</span>
                    </Link>
                    {role ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {role}
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
                    </div>
                  </div>
                  {status ? (
                    <Badge variant={leadStatusVariant(status)}>
                      {leadStatusLabel(status)}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    {followUpAt
                      ? `Follow-up ${formatDate(followUpAt)}`
                      : "No follow-up"}
                  </span>
                  {leadId ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={buildLeadHref(leadId)} scroll={false}>
                        Open lead
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-muted-foreground" />
            Ownership &amp; Notice to Owner
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Management" value={managementName ?? "—"} />
            <Metric
              label="NTO recipient"
              value={ntoTarget ?? "Not set"}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Notice to Owner must reach the legal owner, not the management
            company — serving the manager forfeits lien rights. Record the
            owner and which contact the notice is addressed to.
          </p>
          <form action={setPropertyOwnershipAction} className="flex flex-col gap-3">
            <input type="hidden" name="propertyId" value={property.id} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="legalOwnerName">Legal owner</Label>
              <Input
                id="legalOwnerName"
                name="legalOwnerName"
                placeholder="e.g. Pura Vita Owner LLC"
                defaultValue={ownerParty?.legalOwnerName ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="legalOwnerAddress">Owner address</Label>
              <Input
                id="legalOwnerAddress"
                name="legalOwnerAddress"
                placeholder="Mailing address for legal notices"
                defaultValue={ownerParty?.legalOwnerAddress ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ntoContactId">NTO recipient contact</Label>
              <select
                id="ntoContactId"
                name="ntoContactId"
                defaultValue={ownerParty?.contactId ?? ""}
                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">— None —</option>
                {contacts.map(({ contact }) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" size="sm" className="self-start">
              Save ownership
            </Button>
          </form>
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
            <p>No leads have come in for this property yet.</p>
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

function countLeadStatuses(leads: PropertyDetail["leads"]) {
  const counts = new Map<string, number>();
  for (const lead of leads) {
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
