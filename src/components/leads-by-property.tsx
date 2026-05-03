import Link from "next/link";
import type { Lead } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LeadsRow } from "@/components/leads-row";
import { leadFullName } from "@/lib/leads/name";
import {
  enrichmentLabel,
  leadStatusLabel,
  leadStatusVariant,
} from "@/lib/status-meta";

const NO_ADDRESS_KEY = "__no_address__";

export type PropertyGroup = {
  key: string;
  accountId?: string | null;
  address: string | null;
  managementCompany: string | null;
  propertyName: string | null;
  contacts: Lead[];
  contactCount?: number;
  portfolioCount?: number | null;
  earliestFollowUp: string | null;
  mostRecentContact: Date | null;
};

export function groupLeadsByProperty(rows: Lead[]): PropertyGroup[] {
  const map = new Map<string, PropertyGroup>();

  for (const row of rows) {
    const addr = row.resolvedAddress?.trim() || null;
    const key = addr ? addr.toLowerCase() : NO_ADDRESS_KEY;
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        address: addr,
        managementCompany: row.company ?? null,
        propertyName: row.propertyName ?? null,
        contacts: [],
        earliestFollowUp: null,
        mostRecentContact: null,
      };
      map.set(key, group);
    }
    group.contacts.push(row);

    if (!group.managementCompany && row.company) {
      group.managementCompany = row.company;
    }
    if (!group.propertyName && row.propertyName) {
      group.propertyName = row.propertyName;
    }

    if (row.followUpAt) {
      if (
        !group.earliestFollowUp ||
        row.followUpAt < group.earliestFollowUp
      ) {
        group.earliestFollowUp = row.followUpAt;
      }
    }
    if (row.lastContactedAt) {
      const contactDate = new Date(row.lastContactedAt);
      if (
        !group.mostRecentContact ||
        contactDate > group.mostRecentContact
      ) {
        group.mostRecentContact = contactDate;
      }
    }
  }

  const groups = Array.from(map.values());

  groups.sort((a, b) => {
    const aDue = a.earliestFollowUp ?? "9999-99-99";
    const bDue = b.earliestFollowUp ?? "9999-99-99";
    if (aDue !== bDue) return aDue < bDue ? -1 : 1;
    const aAddr = a.address ?? "\uffff";
    const bAddr = b.address ?? "\uffff";
    return aAddr.localeCompare(bAddr);
  });

  return groups;
}

export function LeadsByProperty({
  groups,
  buildLeadHref,
  activeLeadId,
}: {
  groups: PropertyGroup[];
  buildLeadHref: (id: string) => string;
  activeLeadId?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <PropertyGroupCard
          key={group.key}
          group={group}
          buildLeadHref={buildLeadHref}
          activeLeadId={activeLeadId}
        />
      ))}
    </div>
  );
}

function PropertyGroupCard({
  group,
  buildLeadHref,
  activeLeadId,
}: {
  group: PropertyGroup;
  buildLeadHref: (id: string) => string;
  activeLeadId?: string;
}) {
  const today = startOfToday();
  const overdue =
    group.earliestFollowUp && new Date(group.earliestFollowUp) < today;
  const heading = group.propertyName ?? group.address;
  const subtitle = [
    group.propertyName ? group.address : null,
    group.managementCompany,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-medium">
              {heading ?? (
                <span className="text-muted-foreground italic">
                  No property address
                </span>
              )}
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subtitle || "—"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline">
              {group.contactCount ?? group.contacts.length}{" "}
              {(group.contactCount ?? group.contacts.length) === 1
                ? "contact"
                : "contacts"}
            </Badge>
            {group.portfolioCount && group.portfolioCount > 1 ? (
              <Badge variant="secondary">{group.portfolioCount} properties</Badge>
            ) : null}
            {group.earliestFollowUp && (
              <span
                className={
                  overdue ? "text-destructive" : "text-muted-foreground"
                }
              >
                {overdue ? "Overdue: " : "Follow-up "}
                {formatDate(group.earliestFollowUp)}
              </span>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-0">
        <table className="w-full text-sm">
          <tbody>
            {group.contacts.map((lead) => {
              const href = buildLeadHref(lead.id);
              const isActive = lead.id === activeLeadId;
              const lastContacted = lead.lastContactedAt
                ? formatRelative(new Date(lead.lastContactedAt))
                : null;
              return (
                <LeadsRow key={lead.id} href={href} active={isActive}>
                  <Td>
                    <Link
                      href={href}
                      scroll={false}
                      className="font-medium text-foreground"
                    >
                      {leadFullName(lead)}
                    </Link>
                  </Td>
                  <Td muted>
                    <span className="block max-w-[20ch] truncate">
                      {lead.email || lead.phone || "—"}
                    </span>
                  </Td>
                  <Td muted className="whitespace-nowrap">
                    {lastContacted ? (
                      <>
                        Contacted {lastContacted}
                        {lead.contactAttempts > 0 && (
                          <span className="ms-1 text-muted-foreground/70">
                            ({lead.contactAttempts}x)
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground/60">
                        Not contacted
                      </span>
                    )}
                  </Td>
                  <Td muted className="whitespace-nowrap">
                    {lead.followUpAt ? (
                      <span
                        className={
                          new Date(lead.followUpAt) < today
                            ? "text-destructive"
                            : ""
                        }
                      >
                        {new Date(lead.followUpAt) < today
                          ? "Due "
                          : "Follow-up "}
                        {formatDate(lead.followUpAt)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </Td>
                  <Td>
                    <Badge variant={leadStatusVariant(lead.status)}>
                      {leadStatusLabel(lead.status)}
                    </Badge>
                  </Td>
                  <Td muted className="text-xs">
                    {lead.enrichmentStatus
                      ? enrichmentLabel(lead.enrichmentStatus)
                      : ""}
                  </Td>
                </LeadsRow>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Td({
  children,
  muted,
  className,
}: {
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`px-4 py-2.5 align-middle ${muted ? "text-muted-foreground" : ""} ${className ?? ""}`}
    >
      {children}
    </td>
  );
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMo = Math.round(diffDay / 30);
  if (diffMo < 12) return `${diffMo}mo ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
