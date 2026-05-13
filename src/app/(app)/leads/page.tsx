import Link from "next/link";
import {
  LEADS_FOLLOW_UP_FILTERS,
  LEADS_PAGE_DEFAULT_LIMIT,
  LEADS_SORTS,
  getLeadPropertyGroups,
  getLeadSourceOptions,
  getLeads,
  type LeadsFollowUpFilter,
  type LeadsSort,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LeadsToolbar } from "@/components/leads-toolbar";
import { PropertyLeadsTable } from "@/components/property-leads-table";
import { LeadsTable } from "@/components/leads-table";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/status-meta";

type LeadsView = "property" | "contact";

type LeadsQuery = {
  q: string;
  status: LeadStatus | null;
  source: string | null;
  followUp: LeadsFollowUpFilter | null;
  sort: LeadsSort | null;
  limit: number;
  page: number;
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

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n <= 1) return 1;
  return n;
}

function buildLeadHref(id: string): string {
  return `/leads/${id}`;
}

function buildPropertyHref(id: string): string {
  return `/leads/properties/${id}`;
}

function buildAccountHref(id: string): string {
  return `/leads/accounts/${id}`;
}

function buildContactHref(id: string): string {
  return `/leads/contacts/${id}`;
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
    page?: string;
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
    page: parsePage(params.page),
    view: parseView(params.view),
  };

  const listOptions = {
    q: query.q || null,
    status: query.status,
    sourceTag: query.source,
    followUp: query.followUp,
    sort: effectiveSort(query),
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  };

  const [listResult, sourceOptions] = await Promise.all([
    query.view === "property"
      ? getLeadPropertyGroups(listOptions)
      : getLeads(listOptions),
    getLeadSourceOptions(),
  ]);

  const propertyGroups =
    "groups" in listResult ? listResult.groups : null;
  const rows = "rows" in listResult ? listResult.rows : [];
  const visible = propertyGroups ? propertyGroups.length : rows.length;
  const { total } = listResult;
  const hasFilters = Boolean(
    query.q || query.status || query.source || query.followUp,
  );

  return (
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full flex-col overflow-hidden">
      <LeadsToolbar />

      {params.imported && (
        <div className="border-b border-emerald-600/30 bg-emerald-600/5 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Imported {params.imported} lead{params.imported === "1" ? "" : "s"}.
        </div>
      )}

      {visible === 0 && propertyGroups ? (
        <div className="p-3 lg:p-4">
          <EmptyState query={query} hasFilters={hasFilters} />
        </div>
      ) : propertyGroups ? (
        <PropertyLeadsTable
          groups={propertyGroups.map((group) => {
            const contactHrefs: Record<string, string> = {};
            for (const lead of group.contacts) {
              if (
                lead.primaryContactId &&
                !contactHrefs[lead.primaryContactId]
              ) {
                contactHrefs[lead.primaryContactId] = buildContactHref(
                  lead.primaryContactId,
                );
              }
            }
            return {
              ...group,
              href: group.propertyId
                ? buildPropertyHref(group.propertyId)
                : "",
              accountHref: group.accountId
                ? buildAccountHref(group.accountId)
                : null,
              contactHrefs,
              status: group.contacts[0]?.status ?? null,
              sourceTag: group.contacts[0]?.sourceTag ?? null,
              followUpAt: group.earliestFollowUp,
              lastContactedAt: group.mostRecentContact,
              createdAt: group.contacts[0]?.createdAt ?? null,
            };
          })}
          query={query}
          total={total}
          page={query.page}
          sourceOptions={sourceOptions}
        />
      ) : (
        <LeadsTable
          leads={rows.map((row) => ({
            ...row,
            href: buildLeadHref(row.id),
          }))}
          query={query}
          total={total}
          page={query.page}
          sourceOptions={sourceOptions}
        />
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
