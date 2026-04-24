import Link from "next/link";
import { getLead, getLatestBidForLead, getLeads, type Lead } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadsToolbar } from "@/components/leads-toolbar";
import { LeadDetailBody } from "@/components/lead-detail-body";
import { LeadDetailAside } from "@/components/lead-detail-aside";
import { LeadsRow } from "@/components/leads-row";
import { leadFullName } from "@/lib/leads/name";
import {
  enrichmentLabel,
  leadStatusLabel,
  leadStatusVariant,
} from "@/lib/status-meta";
import {
  CheckCircle2,
  CircleSlash,
  Clock,
  XCircle,
  type LucideIcon,
} from "lucide-react";

function enrichmentIcon(
  status: Lead["enrichmentStatus"],
): { Icon: LucideIcon; className: string } | null {
  switch (status) {
    case "success":
      return { Icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" };
    case "failed":
      return { Icon: XCircle, className: "text-destructive" };
    case "pending":
      return { Icon: Clock, className: "text-muted-foreground" };
    case "skipped":
      return { Icon: CircleSlash, className: "text-muted-foreground/60" };
    default:
      return null;
  }
}

function matchesQuery(lead: Lead, needle: string): boolean {
  const haystack = [
    leadFullName(lead),
    lead.company,
    lead.propertyName,
    lead.email,
    lead.phone,
    lead.resolvedAddress,
    lead.sourceTag,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function buildLeadHref(id: string, query: string): string {
  const sp = new URLSearchParams();
  if (query) sp.set("q", query);
  sp.set("lead", id);
  return `/leads?${sp.toString()}`;
}

function buildCloseHref(query: string): string {
  if (!query) return "/leads";
  const sp = new URLSearchParams();
  sp.set("q", query);
  return `/leads?${sp.toString()}`;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    imported?: string;
    q?: string;
    lead?: string;
    error?: string;
  }>;
}) {
  const { imported, q, lead: leadId, error } = await searchParams;
  const query = (q ?? "").trim();
  const needle = query.toLowerCase();

  const [leads, activeLead, activeLeadBid] = await Promise.all([
    getLeads(),
    leadId ? getLead(leadId) : Promise.resolve(null),
    leadId ? getLatestBidForLead(leadId) : Promise.resolve(null),
  ]);
  const filtered = query
    ? leads.filter((l) => matchesQuery(l, needle))
    : leads;
  const closeHref = buildCloseHref(query);

  return (
    <div className="flex min-h-full">
      <div className="min-w-0 flex-1 px-4 py-8">
        <LeadsToolbar query={query} />

        {imported && (
          <div className="mb-4 rounded-md border border-emerald-600/30 bg-emerald-600/5 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            Imported {imported} lead{imported === "1" ? "" : "s"}.
          </div>
        )}

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              {query ? (
                <>
                  <p className="text-muted-foreground">
                    No leads match &ldquo;{query}&rdquo;.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/leads">Clear search</Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">No leads yet.</p>
                  <p className="max-w-sm text-sm text-muted-foreground/80">
                    Import a CSV from a trade-show list, or add a single lead to
                    start your pipeline.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button asChild>
                      <Link href="/leads/import">Import a CSV</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/leads/new">Add a single lead</Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <LeadsTable leads={filtered} query={query} activeLeadId={leadId} />
        )}
      </div>

      {activeLead && (
        <LeadDetailAside>
          <LeadDetailBody
            lead={activeLead}
            linkedBid={activeLeadBid}
            error={error}
            closeHref={closeHref}
          />
        </LeadDetailAside>
      )}
    </div>
  );
}

function LeadsTable({
  leads,
  query,
  activeLeadId,
}: {
  leads: Lead[];
  query: string;
  activeLeadId?: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="text-left">
              <Th>Name</Th>
              <Th>Company</Th>
              <Th>Property</Th>
              <Th>Property address</Th>
              <Th>Email address</Th>
              <Th>Status</Th>
              <Th className="w-10 text-center">
                <span className="sr-only">Enrichment</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const enrichment = lead.enrichmentStatus
                ? enrichmentIcon(lead.enrichmentStatus)
                : null;
              const href = buildLeadHref(lead.id, query);
              const isActive = lead.id === activeLeadId;
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
                  <Td muted>{lead.company || "—"}</Td>
                  <Td muted>{lead.propertyName || "—"}</Td>
                  <Td muted>
                    <span className="block max-w-[24ch] truncate">
                      {lead.resolvedAddress || "—"}
                    </span>
                  </Td>
                  <Td muted>
                    <span className="block max-w-[20ch] truncate">
                      {lead.email || "—"}
                    </span>
                  </Td>
                  <Td>
                    <Badge variant={leadStatusVariant(lead.status)}>
                      {leadStatusLabel(lead.status)}
                    </Badge>
                  </Td>
                  <Td className="text-center">
                    {enrichment && lead.enrichmentStatus ? (
                      <span
                        title={enrichmentLabel(lead.enrichmentStatus)}
                        className="inline-flex items-center justify-center"
                      >
                        <enrichment.Icon
                          className={`h-4 w-4 ${enrichment.className}`}
                          aria-label={enrichmentLabel(lead.enrichmentStatus)}
                        />
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </Td>
                </LeadsRow>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-left ${className ?? ""}`}
    >
      {children}
    </th>
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
      className={`px-4 py-3 align-middle text-left ${muted ? "text-muted-foreground" : ""} ${className ?? ""}`}
    >
      {children}
    </td>
  );
}
