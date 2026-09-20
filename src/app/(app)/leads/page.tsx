import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Upload,
  UserPlus,
  UserRoundSearch,
} from "lucide-react";
import {
  LEADS_FOLLOW_UP_FILTERS,
  LEADS_PAGE_DEFAULT_LIMIT,
  LEADS_SORTS,
  getLeadPropertyGroups,
  getLeadSourceOptions,
  getLeadStatusCounts,
  getLeads,
  type Lead,
  type LeadPropertyGroup,
  type LeadSourceOption,
  type LeadsFollowUpFilter,
  type LeadsSort,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  LEAD_STATUSES,
  leadStatusLabel,
  type LeadStatus,
} from "@/lib/status-meta";
import { leadFullName } from "@/lib/leads/name";
import { LeadsGridRow } from "@/components/leads-row";
import {
  EmptyState,
  PageContainer,
  PageError,
  PageHeader,
  PageNotice,
  Pagination,
  ResultSummary,
  SearchForm,
  Segmented,
  SegmentedLink,
  SortableHeader,
  type SortDirection,
  TableControls,
  ActiveFilters,
  FilterMenu,
  TABLE_HEAD_CELL,
  TableFrame,
} from "@/components/chrome";
import { cn } from "@/lib/utils";

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

// Same dot vocabulary as Pipeline's STAGE_DOTS — takeoff cyan, quote-out
// blue, won emerald, waiting amber, terminal gray. Labels always come from
// status-meta; only the dot colors live here.
const LEAD_STATUS_DOTS: Record<LeadStatus, string> = {
  takeoff: "bg-cyan-600",
  quoted: "bg-info",
  won: "bg-success",
  lost: "bg-muted-foreground/40",
  no_response: "bg-muted-foreground/40",
  on_hold: "bg-warning",
  expired: "bg-muted-foreground/40",
};

const FOLLOW_UP_LABELS: Record<LeadsFollowUpFilter, string> = {
  overdue: "Overdue",
  today: "Today",
  this_week: "This week",
  none: "No follow-up",
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

function leadsHref(query: LeadsQuery, overrides: Partial<LeadsQuery>): string {
  const next = { ...query, ...overrides };
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.status) sp.set("status", next.status);
  if (next.source) sp.set("source", next.source);
  if (next.followUp) sp.set("followUp", next.followUp);
  if (next.sort) sp.set("sort", next.sort);
  if (next.limit !== LEADS_PAGE_DEFAULT_LIMIT)
    sp.set("limit", String(next.limit));
  if (next.page > 1) sp.set("page", String(next.page));
  if (next.view === "contact") sp.set("view", "contact");
  const s = sp.toString();
  return s ? `/leads?${s}` : "/leads";
}

/** Local YYYY-MM-DD, for comparing against `date`-typed follow-up strings. */
function todayIso(): string {
  return new Date().toLocaleDateString("en-CA");
}

function shortDate(value: Date | string | null): string {
  if (!value) return "—";
  const d =
    typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ageDays(from: Date | null): number {
  if (!from) return 0;
  return Math.max(0, Math.round((Date.now() - from.getTime()) / 86_400_000));
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

  const [listResult, sourceOptions, counts] = await Promise.all([
    query.view === "property"
      ? getLeadPropertyGroups(listOptions)
      : getLeads(listOptions),
    getLeadSourceOptions(),
    getLeadStatusCounts({ sourceTag: query.source }),
  ]);

  const propertyGroups = "groups" in listResult ? listResult.groups : null;
  const rows = "rows" in listResult ? listResult.rows : [];
  const visible = propertyGroups ? propertyGroups.length : rows.length;
  const { total, limit, offset } = listResult;
  const hasFilters = Boolean(
    query.q || query.status || query.source || query.followUp,
  );
  const rangeStart = visible === 0 ? 0 : offset + 1;
  const rangeEnd = offset + visible;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={{ icon: <UserRoundSearch className="size-3.5" />, label: "Intake" }}
        title="Leads"
        description="Everyone who asked for work, grouped by the building they manage. Convert a lead once it is ready to quote."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/lists/new">
                <Upload className="size-4" />
                Import list
              </Link>
            </Button>
            <Button asChild>
              <Link href="/leads/new">
                <UserPlus className="size-4" />
                New lead
              </Link>
            </Button>
          </>
        }
      />

      {params.imported && (
        <PageNotice>
          Imported {params.imported} lead{params.imported === "1" ? "" : "s"}.
        </PageNotice>
      )}
      <PageError message={params.error} />

      <TableControls
        view={
          <Segmented>
            <SegmentedLink
              href={leadsHref(query, { view: "property", page: 1 })}
              active={query.view === "property"}
            >
              <Building2 className="size-3" />
              By property
            </SegmentedLink>
            <SegmentedLink
              href={leadsHref(query, { view: "contact", page: 1 })}
              active={query.view === "contact"}
            >
              <UserPlus className="size-3" />
              By contact
            </SegmentedLink>
          </Segmented>
        }
        summary={
          <ResultSummary
            start={rangeStart}
            end={rangeEnd}
            total={total}
            noun={query.view === "property" ? "properties" : "leads"}
          />
        }
      >
        <SearchForm
          action="/leads"
          q={query.q}
          placeholder="Search leads, accounts…"
          hidden={{
            status: query.status,
            source: query.source,
            followUp: query.followUp,
            sort: query.sort,
            limit:
              query.limit !== LEADS_PAGE_DEFAULT_LIMIT ? query.limit : null,
            view: query.view === "contact" ? "contact" : null,
          }}
        />
        <FilterMenu
          activeCount={
            (query.status ? 1 : 0) +
            (query.source ? 1 : 0) +
            (query.followUp ? 1 : 0)
          }
          groups={[
            {
              label: "Status",
              options: [
                {
                  label: "All statuses",
                  href: leadsHref(query, { status: null, page: 1 }),
                  active: query.status == null,
                  count: counts.total,
                },
                ...LEAD_STATUSES.map((st) => ({
                  label: leadStatusLabel(st),
                  href: leadsHref(query, { status: st, page: 1 }),
                  active: query.status === st,
                  dot: LEAD_STATUS_DOTS[st],
                  count: counts[st],
                })),
              ],
            },
            {
              label: "Source",
              options: [
                {
                  label: "All sources",
                  href: leadsHref(query, { source: null, page: 1 }),
                  active: query.source == null,
                },
                ...sourceOptions.map((opt: LeadSourceOption) => ({
                  label: opt.label,
                  href: leadsHref(query, { source: opt.value, page: 1 }),
                  active: query.source === opt.value,
                })),
              ],
            },
            {
              label: "Follow-up",
              options: [
                {
                  label: "Any",
                  href: leadsHref(query, { followUp: null, page: 1 }),
                  active: query.followUp == null,
                },
                ...LEADS_FOLLOW_UP_FILTERS.map((f) => ({
                  label: FOLLOW_UP_LABELS[f],
                  href: leadsHref(query, { followUp: f, page: 1 }),
                  active: query.followUp === f,
                })),
              ],
            },
          ]}
        />
      </TableControls>

      <ActiveFilters
        clearHref={leadsHref(query, {
          status: null,
          source: null,
          followUp: null,
          page: 1,
        })}
        items={[
          ...(query.status
            ? [
                {
                  label: `Status: ${leadStatusLabel(query.status)}`,
                  href: leadsHref(query, { status: null, page: 1 }),
                },
              ]
            : []),
          ...(query.source
            ? [
                {
                  label: `Source: ${
                    sourceOptions.find(
                      (o: LeadSourceOption) => o.value === query.source,
                    )?.label ?? query.source
                  }`,
                  href: leadsHref(query, { source: null, page: 1 }),
                },
              ]
            : []),
          ...(query.followUp
            ? [
                {
                  label: `Follow-up: ${FOLLOW_UP_LABELS[query.followUp]}`,
                  href: leadsHref(query, { followUp: null, page: 1 }),
                },
              ]
            : []),
        ]}
      />

      {visible === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={<UserRoundSearch />}
            title={query.q ? `No leads match “${query.q}”` : "No leads match"}
            description="Nothing in this view with the current filters. Clear them to see every open lead again."
            actions={
              <Button variant="outline" asChild>
                <Link
                  href={
                    query.view === "contact" ? "/leads?view=contact" : "/leads"
                  }
                >
                  Clear filters
                </Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<UserPlus />}
            title="No leads yet"
            description="Import a CSV from a trade-show list, or add a single lead the moment a contact asks for work — it lands here and on the pipeline."
            actions={
              <>
                <Button asChild>
                  <Link href="/leads/new">
                    <UserPlus className="size-4" />
                    New lead
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/lists/new">
                    <Upload className="size-4" />
                    Import list
                  </Link>
                </Button>
              </>
            }
          />
        )
      ) : propertyGroups ? (
        <PropertyGroupsTable groups={propertyGroups} query={query} />
      ) : (
        <ContactLeadsTable leads={rows} query={query} />
      )}

      <Pagination
        page={query.page}
        limit={limit}
        total={total}
        hrefFor={(p) => leadsHref(query, { page: p })}
      />
    </PageContainer>
  );
}

/**
 * A leads column header. `sort` is the order this column applies and `dir`
 * is how that order reads in this column's own terms; `reverse` is the
 * opposite order where the query has one, which is what a second click
 * gets. Columns with no backing order stay plain spans.
 */
function LeadSortHeader({
  query,
  label,
  sort,
  dir,
  reverse,
}: {
  query: LeadsQuery;
  label: string;
  sort: LeadsSort;
  dir: SortDirection;
  reverse?: LeadsSort;
}) {
  const current = effectiveSort(query);
  const isThis = current === sort;
  const isReverse = reverse != null && current === reverse;
  const direction = isThis ? dir : isReverse ? flip(dir) : null;
  const next = isThis && reverse != null ? reverse : sort;
  return (
    <SortableHeader
      label={label}
      href={leadsHref(query, { sort: next, page: 1 })}
      direction={direction}
    />
  );
}

function flip(d: SortDirection): SortDirection {
  return d === "asc" ? "desc" : "asc";
}

function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-muted/50 py-[3px] pl-2 pr-2.5 text-xs font-medium text-foreground/80">
      <span
        className={cn("size-1.5 rounded-full", LEAD_STATUS_DOTS[status])}
      />
      {leadStatusLabel(status)}
    </span>
  );
}

function FollowUpCell({ followUpAt }: { followUpAt: string | null }) {
  const overdue = followUpAt != null && followUpAt < todayIso();
  return (
    <div
      className={cn(
        "font-mono text-xs tabular-nums text-muted-foreground",
        overdue && "font-semibold text-warning-foreground",
      )}
    >
      {shortDate(followUpAt)}
    </div>
  );
}

const CONTACT_GRID =
  "grid-cols-[minmax(180px,1.6fr)_minmax(110px,1fr)_minmax(150px,1.1fr)_120px_88px_48px_minmax(80px,auto)]";

function ContactLeadsTable({
  leads,
  query,
}: {
  leads: Lead[];
  query: LeadsQuery;
}) {
  return (
    <TableFrame minWidth="min-w-[940px]">
      <>
        <div
          className={cn(
            "grid items-center gap-x-2.5 border-b bg-muted/30 py-2.5 pl-4 pr-10",
            CONTACT_GRID,
          )}
        >
          {["Lead", "Company", "Contact", "Status"].map((h) => (
            <span key={h} className={TABLE_HEAD_CELL}>
              {h}
            </span>
          ))}
          <LeadSortHeader
            query={query}
            label="Follow-up"
            sort="follow_up"
            dir="asc"
          />
          <LeadSortHeader query={query} label="Age" sort="recent" dir="asc" />
          <span className={TABLE_HEAD_CELL}>Next</span>
        </div>
        <div className="flex flex-col">
          {leads.map((lead) => (
            <ContactLeadRow key={lead.id} lead={lead} />
          ))}
        </div>
      </>
    </TableFrame>
  );
}

function ContactLeadRow({ lead }: { lead: Lead }) {
  const href = `/leads/${lead.id}`;
  return (
    <LeadsGridRow
      href={href}
      className={cn(
        "group relative grid cursor-pointer items-center gap-x-2.5 border-t py-3 pl-4 pr-10 transition-colors first:border-t-0 hover:bg-muted/20",
        CONTACT_GRID,
      )}
    >
      {/* lead */}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold tracking-tight">
          <Link href={href} className="hover:underline">
            {leadFullName(lead) || "Unnamed lead"}
          </Link>
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {lead.propertyName ?? lead.resolvedAddress ?? "—"}
        </div>
      </div>
      {/* company */}
      <div className="truncate text-[13px] text-foreground/80">
        {lead.company ?? (
          <span className="italic text-muted-foreground/70">Private owner</span>
        )}
      </div>
      {/* contact */}
      <div className="truncate text-[13px] text-foreground/80">
        {lead.email ?? lead.phone ?? (
          <span className="text-muted-foreground/50">—</span>
        )}
      </div>
      {/* status */}
      <div>
        <StatusPill status={lead.status} />
      </div>
      {/* follow-up */}
      <FollowUpCell followUpAt={lead.followUpAt} />
      {/* age */}
      <div className="font-mono text-xs tabular-nums text-muted-foreground">
        {ageDays(lead.createdAt)}d
      </div>
      {/* next */}
      <div className="flex items-center">
        <Link
          href={href}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
        >
          Open
        </Link>
      </div>
      {/* hover open */}
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        <Link
          href={href}
          title="Open"
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </LeadsGridRow>
  );
}

const PROPERTY_GRID =
  "grid-cols-[minmax(200px,1.6fr)_minmax(120px,1fr)_64px_minmax(180px,1.4fr)_100px_100px]";

function PropertyGroupsTable({
  groups,
  query,
}: {
  groups: LeadPropertyGroup[];
  query: LeadsQuery;
}) {
  return (
    <TableFrame minWidth="min-w-[940px]">
      <>
        <div
          className={cn(
            "grid items-center gap-x-2.5 border-b bg-muted/30 py-2.5 pl-4 pr-10",
            PROPERTY_GRID,
          )}
        >
          {["Property", "Account", "Leads", "Contacts"].map((h) => (
            <span key={h} className={TABLE_HEAD_CELL}>
              {h}
            </span>
          ))}
          <LeadSortHeader
            query={query}
            label="Follow-up"
            sort="follow_up"
            dir="asc"
          />
          <LeadSortHeader
            query={query}
            label="Last contact"
            sort="last_contact"
            dir="desc"
            reverse="stalest"
          />
        </div>
        <div className="flex flex-col">
          {groups.map((group) => (
            <PropertyGroupRow key={group.key} group={group} />
          ))}
        </div>
      </>
    </TableFrame>
  );
}

function PropertyGroupRow({ group }: { group: LeadPropertyGroup }) {
  const heading = group.propertyName ?? group.address ?? "No property address";
  const subline =
    group.propertyName && group.address
      ? group.address
      : (group.managementCompany ?? "Address needed");
  const propertyHref = group.propertyId
    ? `/properties/${group.propertyId}`
    : null;
  const accountHref = group.accountId
    ? `/leads/accounts/${group.accountId}`
    : null;
  const shownContacts = group.contacts.slice(0, 3);
  const extraContacts = group.contactCount - shownContacts.length;
  // The row opens a lead, not the building — the one this row's follow-up
  // column is about. Its siblings at the same property are one click away in
  // the lead's projects timeline.
  const rowLead =
    group.contacts.find(
      (l) => l.followUpAt && l.followUpAt === group.earliestFollowUp,
    ) ?? group.contacts[0];
  const leadHref = rowLead ? `/leads/${rowLead.id}` : null;
  const row = (
    <>
      {/* property */}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold tracking-tight">
          {propertyHref ? (
            <Link href={propertyHref} className="hover:underline">
              {heading}
            </Link>
          ) : (
            heading
          )}
        </div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {subline}
        </div>
      </div>
      {/* account */}
      <div className="truncate text-[13px] text-foreground/80">
        {group.managementCompany ? (
          accountHref ? (
            <Link href={accountHref} className="hover:underline">
              {group.managementCompany}
            </Link>
          ) : (
            group.managementCompany
          )
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </div>
      {/* lead count */}
      <div className="font-mono text-xs tabular-nums text-muted-foreground">
        {group.contactCount}
      </div>
      {/* contacts */}
      <div className="truncate text-[13px] text-foreground/80">
        {shownContacts.length === 0 ? (
          <span className="text-muted-foreground/50">—</span>
        ) : (
          <>
            {shownContacts.map((lead, i) => {
              const name = leadFullName(lead) || "Unnamed";
              const contactHref = lead.primaryContactId
                ? `/contacts/${lead.primaryContactId}`
                : null;
              return (
                <span key={lead.id}>
                  {i > 0 && (
                    <span className="text-muted-foreground/50">, </span>
                  )}
                  {contactHref ? (
                    <Link href={contactHref} className="hover:underline">
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </span>
              );
            })}
            {extraContacts > 0 && (
              <span className="text-xs text-muted-foreground">
                {" "}
                +{extraContacts}
              </span>
            )}
          </>
        )}
      </div>
      {/* earliest follow-up */}
      <FollowUpCell followUpAt={group.earliestFollowUp} />
      {/* most recent contact */}
      <div className="font-mono text-xs tabular-nums text-muted-foreground">
        {shortDate(group.mostRecentContact)}
      </div>
      {/* hover open */}
      {leadHref && (
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <Link
            href={leadHref}
            title="Open lead"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      )}
    </>
  );

  const rowCls = cn(
    "group relative grid items-center gap-x-2.5 border-t py-3 pl-4 pr-10 transition-colors first:border-t-0 hover:bg-muted/20",
    PROPERTY_GRID,
    leadHref && "cursor-pointer",
  );

  return leadHref ? (
    <LeadsGridRow href={leadHref} className={rowCls}>
      {row}
    </LeadsGridRow>
  ) : (
    <div className={rowCls}>{row}</div>
  );
}

