import Link from "next/link";
import {
  LEADS_FOLLOW_UP_FILTERS,
  LEADS_PAGE_DEFAULT_LIMIT,
  LEADS_SORTS,
  getAccountDetail,
  getContactDetail,
  getLead,
  getLatestBidForLead,
  getLeadPropertyGroups,
  getLeadSourceOptions,
  getLeads,
  getPropertyDetail,
  type LeadsFollowUpFilter,
  type LeadsSort,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LeadsToolbar } from "@/components/leads-toolbar";
import { LeadDetailBody } from "@/components/lead-detail-body";
import { LeadDetailAside } from "@/components/lead-detail-aside";
import { AccountDetailPanel } from "@/components/account-detail-panel";
import { ContactDetailPanel } from "@/components/contact-detail-panel";
import { PropertyDetailPanel } from "@/components/property-detail-panel";
import { PropertyLeadsTable } from "@/components/property-leads-table";
import { LeadsTable } from "@/components/leads-table";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/status-meta";

type LeadsView = "property" | "contact";

type EntityRefs = {
  lead?: string | null;
  property?: string | null;
  account?: string | null;
  contact?: string | null;
};

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

function buildQueryString(
  query: LeadsQuery,
  overrides: Partial<LeadsQuery> & EntityRefs = {},
): string {
  const sp = new URLSearchParams();
  const q = overrides.q ?? query.q;
  const status = "status" in overrides ? overrides.status : query.status;
  const source = "source" in overrides ? overrides.source : query.source;
  const followUp =
    "followUp" in overrides ? overrides.followUp : query.followUp;
  const sort = "sort" in overrides ? overrides.sort : query.sort;
  const limit = overrides.limit ?? query.limit;
  const page = overrides.page ?? query.page;
  const view = overrides.view ?? query.view;
  if (q) sp.set("q", q);
  if (status) sp.set("status", status);
  if (source) sp.set("source", source);
  if (followUp) sp.set("followUp", followUp);
  if (sort) sp.set("sort", sort);
  if (limit !== LEADS_PAGE_DEFAULT_LIMIT) sp.set("limit", String(limit));
  if (page > 1) sp.set("page", String(page));
  if (view === "contact") sp.set("view", "contact");
  if (overrides.lead) sp.set("lead", overrides.lead);
  if (overrides.property) sp.set("property", overrides.property);
  if (overrides.account) sp.set("account", overrides.account);
  if (overrides.contact) sp.set("contact", overrides.contact);
  return sp.toString();
}

function withRef(query: LeadsQuery, ref: EntityRefs): string {
  const qs = buildQueryString(query, ref);
  return qs ? `/leads?${qs}` : "/leads";
}

function buildLeadHref(id: string, query: LeadsQuery): string {
  return withRef(query, { lead: id });
}

function buildPropertyHref(id: string, query: LeadsQuery): string {
  return withRef(query, { property: id });
}

function buildAccountHref(id: string, query: LeadsQuery): string {
  return withRef(query, { account: id });
}

function buildContactHref(id: string, query: LeadsQuery): string {
  return withRef(query, { contact: id });
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
    page?: string;
    lead?: string;
    property?: string;
    account?: string;
    contact?: string;
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
  const leadId = params.lead;
  const propertyId = params.property;
  const accountId = params.account;
  const contactId = params.contact;
  // Mutex precedence: contact > account > property > lead. Mirrors the
  // panel render order below so the URL can hold leftover params from a
  // previous drilldown without confusing what's on screen.
  const activeKind: "contact" | "account" | "property" | "lead" | null =
    contactId
      ? "contact"
      : accountId
        ? "account"
        : propertyId
          ? "property"
          : leadId
            ? "lead"
            : null;

  const listOptions = {
    q: query.q || null,
    status: query.status,
    sourceTag: query.source,
    followUp: query.followUp,
    sort: effectiveSort(query),
    limit: query.limit,
    offset: (query.page - 1) * query.limit,
  };

  const [
    listResult,
    activeLead,
    activeLeadBid,
    activeProperty,
    activeAccount,
    activeContact,
    sourceOptions,
  ] = await Promise.all([
    query.view === "property"
      ? getLeadPropertyGroups(listOptions)
      : getLeads(listOptions),
    activeKind === "lead" && leadId ? getLead(leadId) : Promise.resolve(null),
    activeKind === "lead" && leadId
      ? getLatestBidForLead(leadId)
      : Promise.resolve(null),
    activeKind === "property" && propertyId
      ? getPropertyDetail(propertyId)
      : Promise.resolve(null),
    activeKind === "account" && accountId
      ? getAccountDetail(accountId)
      : Promise.resolve(null),
    activeKind === "contact" && contactId
      ? getContactDetail(contactId)
      : Promise.resolve(null),
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
  const closeHref = buildCloseHref(query);

  const isDetailOpen = activeKind !== null;

  return (
    <div className="relative flex min-h-0 w-full flex-1 overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden p-3 lg:p-4">
        <LeadsToolbar />

        {params.imported && (
          <div className="mb-4 rounded-md border border-emerald-600/30 bg-emerald-600/5 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            Imported {params.imported} lead{params.imported === "1" ? "" : "s"}.
          </div>
        )}

        {visible === 0 && propertyGroups ? (
          <EmptyState query={query} hasFilters={hasFilters} />
        ) : (
          <>
            {propertyGroups ? (
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
                        query,
                      );
                    }
                  }
                  return {
                    ...group,
                    href: group.propertyId
                      ? buildPropertyHref(group.propertyId, query)
                      : "",
                    accountHref: group.accountId
                      ? buildAccountHref(group.accountId, query)
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
                activePropertyId={
                  activeKind === "property" ? propertyId ?? null : null
                }
                total={total}
                page={query.page}
                sourceOptions={sourceOptions}
                isDetailOpen={isDetailOpen}
              />
            ) : (
              <LeadsTable
                leads={rows.map((row) => ({
                  ...row,
                  href: buildLeadHref(row.id, query),
                }))}
                query={query}
                activeLeadId={leadId}
                total={total}
                page={query.page}
                sourceOptions={sourceOptions}
                isDetailOpen={isDetailOpen}
              />
            )}
          </>
        )}
      </div>

      {activeKind === "contact" && activeContact && (
        <LeadDetailAside>
          <ContactDetailPanel
            detail={activeContact}
            closeHref={closeHref}
            buildAccountHref={(id) => buildAccountHref(id, query)}
            buildPropertyHref={(id) => buildPropertyHref(id, query)}
            buildLeadHref={(id) => buildLeadHref(id, query)}
          />
        </LeadDetailAside>
      )}

      {activeKind === "account" && activeAccount && (
        <LeadDetailAside>
          <AccountDetailPanel
            detail={activeAccount}
            closeHref={closeHref}
            buildPropertyHref={(id) => buildPropertyHref(id, query)}
            buildContactHref={(id) => buildContactHref(id, query)}
          />
        </LeadDetailAside>
      )}

      {activeKind === "property" && activeProperty && (
        <LeadDetailAside>
          <PropertyDetailPanel
            detail={activeProperty}
            closeHref={closeHref}
            buildAccountHref={(id) => buildAccountHref(id, query)}
            buildContactHref={(id) => buildContactHref(id, query)}
            buildLeadHref={(id) => buildLeadHref(id, query)}
          />
        </LeadDetailAside>
      )}

      {activeKind === "lead" && activeLead && (
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
