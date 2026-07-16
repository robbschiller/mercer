import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Search,
  Upload,
  UserPlus,
} from "lucide-react";
import {
  LEADS_FOLLOW_UP_FILTERS,
  LEADS_PAGE_DEFAULT_LIMIT,
  LEADS_SORTS,
  getLeadPropertyGroups,
  getLeadSourceOptions,
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
  quoted: "bg-blue-600",
  won: "bg-emerald-600",
  lost: "bg-muted-foreground/40",
  no_response: "bg-muted-foreground/40",
  on_hold: "bg-amber-500",
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

  const [listResult, sourceOptions] = await Promise.all([
    query.view === "property"
      ? getLeadPropertyGroups(listOptions)
      : getLeads(listOptions),
    getLeadSourceOptions(),
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
    <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-24 pt-7">
      {/* header */}
      <header className="mb-5 flex items-end gap-5">
        <div>
          <h1 className="text-[27px] font-semibold leading-tight tracking-tight">
            Leads
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            Everyone who asked for work, before a number exists.
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/contacts/import">
              <Upload className="size-4" />
              Import contacts
            </Link>
          </Button>
          <Button asChild>
            <Link href="/leads/new">
              <UserPlus className="size-4" />
              New lead
            </Link>
          </Button>
        </div>
      </header>

      {params.imported && (
        <div className="mb-4 rounded-xl border border-emerald-600/30 bg-emerald-600/5 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Imported {params.imported} lead{params.imported === "1" ? "" : "s"}.
        </div>
      )}
      {params.error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {params.error}
        </div>
      )}

      {/* status rail */}
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip
          href={leadsHref(query, { status: null, page: 1 })}
          active={query.status == null}
          label="All"
        />
        {LEAD_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={leadsHref(query, { status: s, page: 1 })}
            active={query.status === s}
            label={leadStatusLabel(s)}
            dot={LEAD_STATUS_DOTS[s]}
          />
        ))}
      </div>

      {/* search + source + view toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2 px-0.5">
        <form action="/leads" className="flex flex-wrap items-center gap-2">
          {query.status && (
            <input type="hidden" name="status" value={query.status} />
          )}
          {query.followUp && (
            <input type="hidden" name="followUp" value={query.followUp} />
          )}
          {query.sort && <input type="hidden" name="sort" value={query.sort} />}
          {query.limit !== LEADS_PAGE_DEFAULT_LIMIT && (
            <input type="hidden" name="limit" value={query.limit} />
          )}
          {query.view === "contact" && (
            <input type="hidden" name="view" value="contact" />
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
            <input
              type="search"
              name="q"
              defaultValue={query.q}
              placeholder="Search leads, companies…"
              className="h-9 w-56 rounded-[10px] border bg-card pl-9 pr-3 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/30"
            />
          </div>
          <select
            name="source"
            defaultValue={query.source ?? ""}
            className="inline-flex h-9 items-center gap-2 rounded-[10px] border bg-card px-3 text-[13.5px] font-medium text-foreground/80 outline-none transition-colors focus:border-foreground/30"
          >
            <option value="">All sources</option>
            {sourceOptions.map((opt: LeadSourceOption) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" className="h-9">
            Apply
          </Button>
        </form>
        <div className="ml-auto flex items-center gap-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
            View
          </span>
          <div className="flex gap-0.5 rounded-[9px] border bg-muted/70 p-[3px]">
            <LensButton
              href={leadsHref(query, { view: "property", page: 1 })}
              active={query.view === "property"}
            >
              <Building2 className="size-3" />
              By property
            </LensButton>
            <LensButton
              href={leadsHref(query, { view: "contact", page: 1 })}
              active={query.view === "contact"}
            >
              <UserPlus className="size-3" />
              By contact
            </LensButton>
          </div>
        </div>
      </div>

      {/* follow-up lens + result meta */}
      <div className="mb-2 flex flex-wrap items-center gap-3.5 px-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          Follow-up
        </span>
        <div className="flex gap-0.5 rounded-[9px] border bg-muted/70 p-[3px]">
          <LensButton
            href={leadsHref(query, { followUp: null, page: 1 })}
            active={query.followUp == null}
          >
            All
          </LensButton>
          {LEADS_FOLLOW_UP_FILTERS.map((f) => (
            <LensButton
              key={f}
              href={leadsHref(query, { followUp: f, page: 1 })}
              active={query.followUp === f}
            >
              {FOLLOW_UP_LABELS[f]}
            </LensButton>
          ))}
        </div>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          <b className="font-semibold text-foreground/80">
            {rangeStart}–{rangeEnd}
          </b>{" "}
          of <b className="font-semibold text-foreground/80">{total}</b>{" "}
          {query.view === "property" ? "properties" : "leads"}
        </span>
      </div>

      {visible === 0 ? (
        <EmptyState query={query} hasFilters={hasFilters} />
      ) : propertyGroups ? (
        <PropertyGroupsTable groups={propertyGroups} />
      ) : (
        <ContactLeadsTable leads={rows} />
      )}

      {/* pagination */}
      {total > limit && (
        <div className="mt-4 flex items-center gap-3">
          {query.page > 1 ? (
            <Link
              href={leadsHref(query, { page: query.page - 1 })}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground/25 hover:bg-muted/40"
            >
              ‹ Prev
            </Link>
          ) : (
            <span className="inline-flex h-8 items-center rounded-lg border bg-muted/30 px-3 text-xs font-medium text-muted-foreground/50">
              ‹ Prev
            </span>
          )}
          {rangeEnd < total ? (
            <Link
              href={leadsHref(query, { page: query.page + 1 })}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground/25 hover:bg-muted/40"
            >
              Next ›
            </Link>
          ) : (
            <span className="inline-flex h-8 items-center rounded-lg border bg-muted/30 px-3 text-xs font-medium text-muted-foreground/50">
              Next ›
            </span>
          )}
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {rangeStart}–{rangeEnd} of {total}
          </span>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
  dot,
}: {
  href: string;
  active: boolean;
  label: string;
  dot?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[10px] border px-3.5 text-[13.5px] font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "bg-card text-foreground/80 hover:border-foreground/25 hover:bg-muted/40",
      )}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            active ? "bg-background/80" : dot,
          )}
        />
      )}
      {label}
    </Link>
  );
}

function LensButton({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
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
        overdue && "font-semibold text-amber-600",
      )}
    >
      {shortDate(followUpAt)}
    </div>
  );
}

const CONTACT_GRID =
  "grid-cols-[minmax(180px,1.6fr)_minmax(110px,1fr)_minmax(150px,1.1fr)_120px_88px_48px_minmax(80px,auto)]";

function ContactLeadsTable({ leads }: { leads: Lead[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="min-w-[940px]">
        <div
          className={cn(
            "grid items-center gap-x-2.5 border-b bg-muted/30 py-2.5 pl-4 pr-10",
            CONTACT_GRID,
          )}
        >
          {["Lead", "Company", "Contact", "Status", "Follow-up", "Age", "Next"].map(
            (h) => (
              <span
                key={h}
                className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
              >
                {h}
              </span>
            ),
          )}
        </div>
        <div className="flex flex-col">
          {leads.map((lead) => (
            <ContactLeadRow key={lead.id} lead={lead} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContactLeadRow({ lead }: { lead: Lead }) {
  const href = `/leads/${lead.id}`;
  return (
    <div
      className={cn(
        "group relative grid items-center gap-x-2.5 border-t py-3 pl-4 pr-10 transition-colors first:border-t-0 hover:bg-muted/20",
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
    </div>
  );
}

const PROPERTY_GRID =
  "grid-cols-[minmax(200px,1.6fr)_minmax(120px,1fr)_64px_minmax(180px,1.4fr)_100px_100px]";

function PropertyGroupsTable({ groups }: { groups: LeadPropertyGroup[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="min-w-[940px]">
        <div
          className={cn(
            "grid items-center gap-x-2.5 border-b bg-muted/30 py-2.5 pl-4 pr-10",
            PROPERTY_GRID,
          )}
        >
          {[
            "Property",
            "Account",
            "Leads",
            "Contacts",
            "Follow-up",
            "Last contact",
          ].map((h) => (
            <span
              key={h}
              className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
            >
              {h}
            </span>
          ))}
        </div>
        <div className="flex flex-col">
          {groups.map((group) => (
            <PropertyGroupRow key={group.key} group={group} />
          ))}
        </div>
      </div>
    </div>
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
  return (
    <div
      className={cn(
        "group relative grid items-center gap-x-2.5 border-t py-3 pl-4 pr-10 transition-colors first:border-t-0 hover:bg-muted/20",
        PROPERTY_GRID,
      )}
    >
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
      {propertyHref && (
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <Link
            href={propertyHref}
            title="Open property"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowUpRight className="size-4" />
          </Link>
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
    <div className="flex flex-col items-center rounded-2xl border bg-card px-8 py-14 text-center shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <span className="mb-5 flex size-[54px] items-center justify-center rounded-2xl bg-muted text-foreground/60">
        <UserPlus className="size-6" />
      </span>
      {hasFilters ? (
        <>
          <h3 className="mb-2 text-xl font-semibold tracking-tight">
            {query.q ? `No leads match “${query.q}”` : "No leads match"}
          </h3>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground [text-wrap:pretty]">
            Nothing in this view with the current filters. Clear them to see
            every open lead again.
          </p>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" asChild>
              <Link
                href={
                  query.view === "contact" ? "/leads?view=contact" : "/leads"
                }
              >
                Clear filters
              </Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <h3 className="mb-2 text-xl font-semibold tracking-tight">
            No leads yet
          </h3>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground [text-wrap:pretty]">
            Import a CSV from a trade-show list, or add a single lead the
            moment a contact asks for work — it lands here and on the
            pipeline.
          </p>
          <div className="mt-6 flex gap-2">
            <Button asChild>
              <Link href="/leads/new">
                <UserPlus className="size-4" />
                New lead
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/contacts/import">
                <Upload className="size-4" />
                Import contacts
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
