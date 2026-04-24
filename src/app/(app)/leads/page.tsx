import Link from "next/link";
import {
  LEADS_PAGE_DEFAULT_LIMIT,
  getLead,
  getLatestBidForLead,
  getLeads,
  type Lead,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadsToolbar } from "@/components/leads-toolbar";
import { LeadDetailBody } from "@/components/lead-detail-body";
import { LeadDetailAside } from "@/components/lead-detail-aside";
import { LeadsRow } from "@/components/leads-row";
import { leadFullName } from "@/lib/leads/name";
import {
  LEAD_STATUSES,
  enrichmentLabel,
  leadStatusLabel,
  leadStatusVariant,
  type LeadStatus,
} from "@/lib/status-meta";
import {
  CheckCircle2,
  CircleSlash,
  Clock,
  X,
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

type LeadsQuery = {
  q: string;
  status: LeadStatus | null;
  source: string | null;
  limit: number;
};

function parseStatus(raw: string | undefined): LeadStatus | null {
  const v = raw?.trim();
  if (!v) return null;
  return (LEAD_STATUSES as readonly string[]).includes(v)
    ? (v as LeadStatus)
    : null;
}

function parseLimit(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return LEADS_PAGE_DEFAULT_LIMIT;
  return n;
}

function buildQueryString(
  query: LeadsQuery,
  overrides: Partial<LeadsQuery> & { lead?: string | null } = {},
): string {
  const sp = new URLSearchParams();
  const q = overrides.q ?? query.q;
  const status = "status" in overrides ? overrides.status : query.status;
  const source = "source" in overrides ? overrides.source : query.source;
  const limit = overrides.limit ?? query.limit;
  if (q) sp.set("q", q);
  if (status) sp.set("status", status);
  if (source) sp.set("source", source);
  if (limit !== LEADS_PAGE_DEFAULT_LIMIT) sp.set("limit", String(limit));
  if (overrides.lead) sp.set("lead", overrides.lead);
  return sp.toString();
}

function buildLeadHref(id: string, query: LeadsQuery): string {
  const qs = buildQueryString(query, { lead: id });
  return qs ? `/leads?${qs}` : "/leads";
}

function buildCloseHref(query: LeadsQuery): string {
  const qs = buildQueryString(query);
  return qs ? `/leads?${qs}` : "/leads";
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    imported?: string;
    q?: string;
    status?: string;
    source?: string;
    limit?: string;
    lead?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const query: LeadsQuery = {
    q: (params.q ?? "").trim(),
    status: parseStatus(params.status),
    source: params.source?.trim() || null,
    limit: parseLimit(params.limit),
  };
  const leadId = params.lead;

  const [leadsResult, activeLead, activeLeadBid] = await Promise.all([
    getLeads({
      q: query.q || null,
      status: query.status,
      sourceTag: query.source,
      limit: query.limit,
    }),
    leadId ? getLead(leadId) : Promise.resolve(null),
    leadId ? getLatestBidForLead(leadId) : Promise.resolve(null),
  ]);

  const { rows, total } = leadsResult;
  const hasMore = rows.length < total;
  const hasFilters = Boolean(query.q || query.status || query.source);
  const closeHref = buildCloseHref(query);

  return (
    <div className="flex min-h-full">
      <div className="min-w-0 flex-1 px-4 py-8">
        <LeadsToolbar query={query.q} />

        {params.imported && (
          <div className="mb-4 rounded-md border border-emerald-600/30 bg-emerald-600/5 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            Imported {params.imported} lead{params.imported === "1" ? "" : "s"}.
          </div>
        )}

        <FilterStrip query={query} total={total} visible={rows.length} />

        {rows.length === 0 ? (
          <EmptyState query={query} hasFilters={hasFilters} />
        ) : (
          <>
            <LeadsTable
              leads={rows}
              query={query}
              activeLeadId={leadId}
            />
            {hasMore && (
              <div className="mt-4 flex items-center justify-center">
                <Button variant="outline" asChild>
                  <Link
                    href={`/leads?${buildQueryString(query, {
                      limit: query.limit + LEADS_PAGE_DEFAULT_LIMIT,
                      lead: leadId ?? null,
                    })}`}
                    scroll={false}
                  >
                    Load {Math.min(LEADS_PAGE_DEFAULT_LIMIT, total - rows.length)}{" "}
                    more
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {activeLead && (
        <LeadDetailAside>
          <LeadDetailBody
            lead={activeLead}
            linkedBid={activeLeadBid}
            error={params.error}
            closeHref={closeHref}
          />
        </LeadDetailAside>
      )}
    </div>
  );
}

function FilterStrip({
  query,
  total,
  visible,
}: {
  query: LeadsQuery;
  total: number;
  visible: number;
}) {
  const chips: { label: string; clearHref: string }[] = [];
  if (query.status) {
    chips.push({
      label: `Status: ${leadStatusLabel(query.status)}`,
      clearHref:
        buildQueryString(query, { status: null }) === ""
          ? "/leads"
          : `/leads?${buildQueryString(query, { status: null })}`,
    });
  }
  if (query.source) {
    chips.push({
      label: `Source: ${query.source}`,
      clearHref:
        buildQueryString(query, { source: null }) === ""
          ? "/leads"
          : `/leads?${buildQueryString(query, { source: null })}`,
    });
  }

  if (chips.length === 0 && total === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.clearHref}
          className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 hover:bg-muted/40"
          scroll={false}
        >
          {chip.label}
          <X className="h-3 w-3" aria-hidden />
          <span className="sr-only">Remove filter</span>
        </Link>
      ))}
      {total > 0 && (
        <span className="ms-auto tabular-nums">
          Showing {visible} of {total}
        </span>
      )}
    </div>
  );
}

function EmptyState({
  query,
  hasFilters,
}: {
  query: LeadsQuery;
  hasFilters: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        {hasFilters ? (
          <>
            <p className="text-muted-foreground">
              {query.q
                ? `No leads match “${query.q}”.`
                : "No leads match these filters."}
            </p>
            <Button variant="outline" asChild>
              <Link href="/leads">Clear filters</Link>
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
  );
}

function LeadsTable({
  leads,
  query,
  activeLeadId,
}: {
  leads: Lead[];
  query: LeadsQuery;
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
