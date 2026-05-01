import Link from "next/link";
import {
  LEADS_FOLLOW_UP_FILTERS,
  LEADS_PAGE_DEFAULT_LIMIT,
  LEADS_SORTS,
  getLead,
  getLatestBidForLead,
  getLeadPropertyGroups,
  getLeads,
  type Lead,
  type LeadsFollowUpFilter,
  type LeadsSort,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadsToolbar } from "@/components/leads-toolbar";
import { LeadDetailBody } from "@/components/lead-detail-body";
import { LeadDetailAside } from "@/components/lead-detail-aside";
import { LeadsRow } from "@/components/leads-row";
import { LeadsByProperty } from "@/components/leads-by-property";
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

type LeadsView = "property" | "contact";

type LeadsQuery = {
  q: string;
  status: LeadStatus | null;
  source: string | null;
  followUp: LeadsFollowUpFilter | null;
  sort: LeadsSort | null;
  limit: number;
  view: LeadsView;
};

function parseView(raw: string | undefined): LeadsView {
  return raw === "contact" ? "contact" : "property";
}

function parseStatus(raw: string | undefined): LeadStatus | null {
  const v = raw?.trim();
  if (!v) return null;
  return (LEAD_STATUSES as readonly string[]).includes(v)
    ? (v as LeadStatus)
    : null;
}

function parseFollowUp(raw: string | undefined): LeadsFollowUpFilter | null {
  const v = raw?.trim();
  if (!v) return null;
  return (LEADS_FOLLOW_UP_FILTERS as readonly string[]).includes(v)
    ? (v as LeadsFollowUpFilter)
    : null;
}

function parseSort(raw: string | undefined): LeadsSort | null {
  const v = raw?.trim();
  if (!v) return null;
  return (LEADS_SORTS as readonly string[]).includes(v)
    ? (v as LeadsSort)
    : null;
}

function defaultSortForView(view: LeadsView): LeadsSort {
  return view === "property" ? "follow_up" : "recent";
}

function effectiveSort(query: LeadsQuery): LeadsSort {
  return query.sort ?? defaultSortForView(query.view);
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
  const followUp =
    "followUp" in overrides ? overrides.followUp : query.followUp;
  const sort = "sort" in overrides ? overrides.sort : query.sort;
  const limit = overrides.limit ?? query.limit;
  const view = overrides.view ?? query.view;
  if (q) sp.set("q", q);
  if (status) sp.set("status", status);
  if (source) sp.set("source", source);
  if (followUp) sp.set("followUp", followUp);
  if (sort) sp.set("sort", sort);
  if (limit !== LEADS_PAGE_DEFAULT_LIMIT) sp.set("limit", String(limit));
  if (view === "contact") sp.set("view", "contact");
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
    followUp?: string;
    sort?: string;
    limit?: string;
    lead?: string;
    view?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const query: LeadsQuery = {
    q: (params.q ?? "").trim(),
    status: parseStatus(params.status),
    source: params.source?.trim() || null,
    followUp: parseFollowUp(params.followUp),
    sort: parseSort(params.sort),
    limit: parseLimit(params.limit),
    view: parseView(params.view),
  };
  const leadId = params.lead;

  const listOptions = {
    q: query.q || null,
    status: query.status,
    sourceTag: query.source,
    followUp: query.followUp,
    sort: effectiveSort(query),
    limit: query.limit,
  };

  const [listResult, activeLead, activeLeadBid] = await Promise.all([
    query.view === "property"
      ? getLeadPropertyGroups(listOptions)
      : getLeads(listOptions),
    leadId ? getLead(leadId) : Promise.resolve(null),
    leadId ? getLatestBidForLead(leadId) : Promise.resolve(null),
  ]);

  const propertyGroups =
    "groups" in listResult ? listResult.groups : null;
  const rows = "rows" in listResult ? listResult.rows : [];
  const visible = propertyGroups ? propertyGroups.length : rows.length;
  const { total } = listResult;
  const hasMore = visible < total;
  const hasFilters = Boolean(
    query.q || query.status || query.source || query.followUp,
  );
  const closeHref = buildCloseHref(query);

  return (
    <div className="flex min-h-full">
      <div className="min-w-0 flex-1 px-4 py-8">
        <LeadsToolbar query={query.q} view={query.view} />

        {params.imported && (
          <div className="mb-4 rounded-md border border-emerald-600/30 bg-emerald-600/5 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            Imported {params.imported} lead{params.imported === "1" ? "" : "s"}.
          </div>
        )}

        <LeadsFilterBar
          query={query}
          total={total}
          visible={visible}
          leadId={leadId}
        />

        {visible === 0 ? (
          <EmptyState query={query} hasFilters={hasFilters} />
        ) : (
          <>
            {propertyGroups ? (
              <LeadsByProperty
                groups={propertyGroups}
                buildLeadHref={(id) => buildLeadHref(id, query)}
                activeLeadId={leadId}
              />
            ) : (
              <LeadsTable
                leads={rows}
                query={query}
                activeLeadId={leadId}
              />
            )}
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
                    Load {Math.min(LEADS_PAGE_DEFAULT_LIMIT, total - visible)}{" "}
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

const FOLLOW_UP_CHOICES: {
  value: LeadsFollowUpFilter | null;
  label: string;
}[] = [
  { value: null, label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "this_week", label: "Due this week" },
  { value: "none", label: "No follow-up" },
];

const SORT_CHOICES: { value: LeadsSort; label: string }[] = [
  { value: "recent", label: "Newest" },
  { value: "follow_up", label: "Follow-up" },
  { value: "last_contact", label: "Last contact" },
  { value: "stalest", label: "Stalest" },
];

function LeadsFilterBar({
  query,
  total,
  visible,
  leadId,
}: {
  query: LeadsQuery;
  total: number;
  visible: number;
  leadId?: string;
}) {
  const lead = leadId ?? null;
  const buildHref = (overrides: Partial<LeadsQuery> & { lead?: string | null }): string => {
    const qs = buildQueryString(query, { lead, ...overrides });
    return qs ? `/leads?${qs}` : "/leads";
  };

  const activeSort = effectiveSort(query);
  const activeFollowUp = query.followUp ?? null;

  const removableChips: { label: string; clearHref: string }[] = [];
  if (query.status) {
    removableChips.push({
      label: `Status: ${leadStatusLabel(query.status)}`,
      clearHref: buildHref({ status: null }),
    });
  }
  if (query.source) {
    removableChips.push({
      label: `Source: ${query.source}`,
      clearHref: buildHref({ source: null }),
    });
  }

  const showSecondRow = removableChips.length > 0 || total > 0;

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-muted-foreground">Follow-up:</span>
          {FOLLOW_UP_CHOICES.map((choice) => {
            const active = activeFollowUp === choice.value;
            return (
              <Link
                key={choice.label}
                href={buildHref({ followUp: choice.value })}
                scroll={false}
                aria-pressed={active}
                className={
                  active
                    ? "rounded-full bg-foreground px-2.5 py-1 text-background"
                    : "rounded-full border bg-card px-2.5 py-1 text-muted-foreground hover:bg-muted/40"
                }
              >
                {choice.label}
              </Link>
            );
          })}
        </div>
        <div className="ms-auto flex flex-wrap items-center gap-1">
          <span className="text-muted-foreground">Sort:</span>
          {SORT_CHOICES.map((choice) => {
            const active = activeSort === choice.value;
            return (
              <Link
                key={choice.value}
                href={buildHref({ sort: choice.value })}
                scroll={false}
                aria-pressed={active}
                className={
                  active
                    ? "rounded-full bg-foreground px-2.5 py-1 text-background"
                    : "rounded-full border bg-card px-2.5 py-1 text-muted-foreground hover:bg-muted/40"
                }
              >
                {choice.label}
              </Link>
            );
          })}
        </div>
      </div>

      {showSecondRow && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {removableChips.map((chip) => (
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
