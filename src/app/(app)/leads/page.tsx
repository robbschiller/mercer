import Link from "next/link";
import { getLeads, getLeadSourceTags, type Lead } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, List, MapPin } from "lucide-react";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import {
  PropertyFilterSelect,
  type PropertyFilterOption,
} from "@/components/property-filter-select";
import { parseViewMode } from "@/lib/view-mode";
import { leadFullName } from "@/lib/leads/name";
import {
  LEAD_STATUSES,
  type LeadStatus,
  enrichmentLabel,
  leadStatusLabel,
  leadStatusVariant,
} from "@/lib/status-meta";

type LeadFilterStatus = LeadStatus;
type GroupMode = "property" | "management" | null;

function parseLeadStatus(value: string | undefined): LeadFilterStatus | null {
  if (!value) return null;
  return LEAD_STATUSES.includes(value as LeadFilterStatus)
    ? (value as LeadFilterStatus)
    : null;
}

function parseGroupMode(value: string | undefined): GroupMode {
  if (value === "property" || value === "management") return value;
  return null;
}

/**
 * Paint-decision authority ranking for attendee roles. Lower number = more
 * likely to own the exterior-paint decision for a multifamily community.
 */
const ROLE_PRIORITY: Array<{ match: RegExp; rank: number }> = [
  { match: /\bowner\b/i, rank: 1 },
  { match: /\bregional maintenance\b/i, rank: 2 },
  { match: /\bregional\b/i, rank: 2 },
  { match: /\bcommunity manager\b/i, rank: 3 },
  { match: /\bmaintenance supervisor\b/i, rank: 4 },
  { match: /\bassistant (community )?manager\b/i, rank: 5 },
  { match: /\bleasing manager\b/i, rank: 5 },
  { match: /\btraining director\b/i, rank: 6 },
  { match: /\bcorporate\b/i, rank: 6 },
  { match: /\bleasing\b/i, rank: 7 },
  { match: /\bmaintenance (technician|tech)\b/i, rank: 7 },
  { match: /\b(marketing|accounting)\b/i, rank: 8 },
  { match: /\b(groundskeeper|porter|housekeep(er|ing))\b/i, rank: 9 },
];

const ROLE_KEYS = [
  "Role with Company",
  "role with company",
  "Role",
  "role",
  "Title",
  "title",
];

function leadRole(lead: Lead): string {
  const raw = lead.rawRow;
  if (!raw) return "";
  for (const k of ROLE_KEYS) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const [k, v] of Object.entries(raw)) {
    if (/\brole\b|\btitle\b/i.test(k) && typeof v === "string" && v.trim()) {
      return v.trim();
    }
  }
  return "";
}

function rolePriority(role: string): number {
  if (!role) return 99;
  for (const entry of ROLE_PRIORITY) {
    if (entry.match.test(role)) return entry.rank;
  }
  return 10;
}

/**
 * Property identity = the multifamily community this attendee manages. We key
 * on the enriched resolvedAddress when available (Google Places normalizes
 * spelling) and fall back to propertyName. Leads with neither land in a
 * shared "Ungrouped" bucket.
 */
function propertyKeyFor(lead: Lead): string {
  const addr = (lead.resolvedAddress ?? "").trim();
  if (addr) return `addr:${addr.toLowerCase()}`;
  const name = (lead.propertyName ?? "").trim();
  if (name) return `name:${name.toLowerCase()}`;
  return "";
}

function propertyDisplayName(lead: Lead): string {
  const name = (lead.propertyName ?? "").trim();
  if (name) return name;
  const addr = (lead.resolvedAddress ?? "").trim();
  if (addr) return addr.split(",")[0] ?? addr;
  return "Ungrouped";
}

/**
 * Management identity = the property-management company. Keyed on lowercase
 * company string. Corporate-only contacts (no property) still roll up here.
 */
function managementKeyFor(lead: Lead): string {
  const company = (lead.company ?? "").trim();
  return company ? `co:${company.toLowerCase()}` : "";
}

function managementDisplayName(lead: Lead): string {
  return (lead.company ?? "").trim() || "Unassigned";
}

type PropertyGroup = {
  key: string;
  name: string;
  address: string;
  company: string;
  leads: Lead[];
};

function groupLeadsByProperty(leads: Lead[]): PropertyGroup[] {
  const map = new Map<string, PropertyGroup>();
  for (const lead of leads) {
    const key = propertyKeyFor(lead);
    const existing = map.get(key);
    if (existing) {
      existing.leads.push(lead);
      if (!existing.company && lead.company) {
        existing.company = lead.company.trim();
      }
      if (!existing.address && lead.resolvedAddress) {
        existing.address = lead.resolvedAddress.trim();
      }
    } else {
      map.set(key, {
        key,
        name: propertyDisplayName(lead),
        address: (lead.resolvedAddress ?? "").trim(),
        company: (lead.company ?? "").trim(),
        leads: [lead],
      });
    }
  }
  for (const group of map.values()) {
    group.leads.sort((a, b) => {
      const pa = rolePriority(leadRole(a));
      const pb = rolePriority(leadRole(b));
      if (pa !== pb) return pa - pb;
      return leadFullName(a).localeCompare(leadFullName(b));
    });
  }
  return Array.from(map.values()).sort((a, b) => {
    if (!a.key) return 1;
    if (!b.key) return -1;
    if (b.leads.length !== a.leads.length) return b.leads.length - a.leads.length;
    return a.name.localeCompare(b.name);
  });
}

type ManagementGroup = {
  key: string;
  name: string;
  propertyCount: number;
  leads: Lead[];
};

function groupLeadsByManagement(leads: Lead[]): ManagementGroup[] {
  const map = new Map<string, { key: string; name: string; leads: Lead[] }>();
  for (const lead of leads) {
    const key = managementKeyFor(lead);
    const existing = map.get(key);
    if (existing) {
      existing.leads.push(lead);
    } else {
      map.set(key, {
        key,
        name: managementDisplayName(lead),
        leads: [lead],
      });
    }
  }
  const out: ManagementGroup[] = [];
  for (const group of map.values()) {
    group.leads.sort((a, b) => {
      const pa = rolePriority(leadRole(a));
      const pb = rolePriority(leadRole(b));
      if (pa !== pb) return pa - pb;
      return leadFullName(a).localeCompare(leadFullName(b));
    });
    const properties = new Set<string>();
    for (const lead of group.leads) {
      const pk = propertyKeyFor(lead);
      if (pk) properties.add(pk);
    }
    out.push({ ...group, propertyCount: properties.size });
  }
  return out.sort((a, b) => {
    if (!a.key) return 1;
    if (!b.key) return -1;
    if (b.leads.length !== a.leads.length) return b.leads.length - a.leads.length;
    return a.name.localeCompare(b.name);
  });
}

function enrichmentClass(status: Lead["enrichmentStatus"]): string {
  switch (status) {
    case "success":
      return "text-emerald-600 dark:text-emerald-400";
    case "failed":
      return "text-destructive";
    case "pending":
      return "text-muted-foreground";
    case "skipped":
      return "text-muted-foreground/60";
    default:
      return "text-muted-foreground/60";
  }
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    source?: string;
    imported?: string;
    view?: string;
    status?: string;
    group?: string;
    property?: string;
    management?: string;
  }>;
}) {
  const {
    source,
    imported,
    view: viewParam,
    status: statusParam,
    group: groupParam,
    property: propertyParam,
    management: managementParam,
  } = await searchParams;
  const view = parseViewMode(viewParam);
  const statusFilter = parseLeadStatus(statusParam);
  const propertyFilter = propertyParam?.trim() || null;
  const managementFilter = managementParam?.trim() || null;
  const groupMode = parseGroupMode(groupParam);

  // Render mode: a property filter always forces flat (it's one property
  // already). A management filter combined with group=management collapses
  // to flat (the single group would be redundant). Otherwise honor groupMode.
  const renderMode: "flat" | "byProperty" | "byManagement" = propertyFilter
    ? "flat"
    : groupMode === "management" && !managementFilter
    ? "byManagement"
    : groupMode === "property"
    ? "byProperty"
    : "flat";

  const [leads, sourceTags] = await Promise.all([
    getLeads(),
    getLeadSourceTags(),
  ]);
  const filtered = leads
    .filter((l) => !source || l.sourceTag === source)
    .filter((l) => !statusFilter || l.status === statusFilter)
    .filter((l) => !propertyFilter || propertyKeyFor(l) === propertyFilter)
    .filter((l) => !managementFilter || managementKeyFor(l) === managementFilter);

  const propertyOptions: PropertyFilterOption[] = buildPropertyOptions(
    leads
  ).map((o) => ({
    ...o,
    href: buildLeadsHref({
      source: source ?? null,
      view,
      status: statusFilter,
      group: null,
      property: o.key,
      management: managementFilter,
    }),
  }));
  const clearPropertyHref = buildLeadsHref({
    source: source ?? null,
    view,
    status: statusFilter,
    group: groupMode,
    property: null,
    management: managementFilter,
  });
  const activePropertyLabel = (() => {
    if (!propertyFilter) return null;
    const option = propertyOptions.find((o) => o.key === propertyFilter);
    return option?.label ?? propertyFilter;
  })();

  const managementOptions: PropertyFilterOption[] = buildManagementOptions(
    leads
  ).map((o) => ({
    ...o,
    href: buildLeadsHref({
      source: source ?? null,
      view,
      status: statusFilter,
      group: groupMode === "management" ? null : groupMode,
      property: propertyFilter,
      management: o.key,
    }),
  }));
  const clearManagementHref = buildLeadsHref({
    source: source ?? null,
    view,
    status: statusFilter,
    group: groupMode,
    property: propertyFilter,
    management: null,
  });
  const activeManagementLabel = (() => {
    if (!managementFilter) return null;
    const option = managementOptions.find((o) => o.key === managementFilter);
    return option?.label ?? managementFilter;
  })();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-3xl font-medium tracking-tight">
          Leads
        </h1>
        <div className="flex items-center gap-2">
          <GroupToggle
            mode={groupMode}
            hrefFlat={buildLeadsHref({
              source: source ?? null,
              view,
              status: statusFilter,
              group: null,
              property: propertyFilter,
              management: managementFilter,
            })}
            hrefProperty={buildLeadsHref({
              source: source ?? null,
              view,
              status: statusFilter,
              group: "property",
              property: null,
              management: managementFilter,
            })}
            hrefManagement={buildLeadsHref({
              source: source ?? null,
              view,
              status: statusFilter,
              group: "management",
              property: propertyFilter,
              management: null,
            })}
          />
          <ViewModeToggle current={view} />
          <Button variant="outline" asChild>
            <Link href="/leads/import">Import CSV</Link>
          </Button>
          <Button variant="amber" asChild>
            <Link href="/leads/new">New lead</Link>
          </Button>
        </div>
      </div>

      {imported && (
        <div className="mb-4 rounded-md border border-emerald-600/30 bg-emerald-600/5 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Imported {imported} lead{imported === "1" ? "" : "s"}. Group by
          property to roll attendees up by community, or by management to see
          the full company roster.
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3">
        {sourceTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="text-muted-foreground">Source:</span>
            <SourceChip
              label="All"
              active={!source}
              href={buildLeadsHref({
                source: null,
                view,
                status: statusFilter,
                group: groupMode,
                property: propertyFilter,
                management: managementFilter,
              })}
            />
            {sourceTags.map((tag) => (
              <SourceChip
                key={tag}
                label={tag}
                active={source === tag}
                href={buildLeadsHref({
                  source: tag,
                  view,
                  status: statusFilter,
                  group: groupMode,
                  property: propertyFilter,
                  management: managementFilter,
                })}
              />
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="text-muted-foreground">Status:</span>
          <SourceChip
            label="All"
            active={!statusFilter}
            href={buildLeadsHref({
              source: source ?? null,
              view,
              status: null,
              group: groupMode,
              property: propertyFilter,
              management: managementFilter,
            })}
          />
          {LEAD_STATUSES.map((st) => (
            <SourceChip
              key={st}
              label={leadStatusLabel(st)}
              active={statusFilter === st}
              href={buildLeadsHref({
                source: source ?? null,
                view,
                status: st,
                group: groupMode,
                property: propertyFilter,
                management: managementFilter,
              })}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
          {managementOptions.length > 0 && (
            <PropertyFilterSelect
              options={managementOptions}
              activeKey={managementFilter}
              clearHref={clearManagementHref}
              activeLabel={activeManagementLabel}
              entityLabel="Management"
              allLabel="All management companies"
              variant="management"
            />
          )}
          {propertyOptions.length > 0 && (
            <PropertyFilterSelect
              options={propertyOptions}
              activeKey={propertyFilter}
              clearHref={clearPropertyHref}
              activeLabel={activePropertyLabel}
              entityLabel="Property"
              allLabel="All properties"
              variant="property"
            />
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            {source || statusFilter || propertyFilter || managementFilter ? (
              <>
                <p className="text-muted-foreground">
                  {emptyFilteredMessage({
                    source,
                    statusFilter,
                    propertyLabel: activePropertyLabel,
                    managementLabel: activeManagementLabel,
                    totalLeads: leads.length,
                  })}
                </p>
                <Button variant="outline" asChild>
                  <Link
                    href={buildLeadsHref({
                      source: null,
                      view,
                      status: null,
                      group: groupMode,
                      property: null,
                      management: null,
                    })}
                  >
                    Clear filters
                  </Link>
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
      ) : renderMode === "byProperty" ? (
        <LeadsByProperty
          groups={groupLeadsByProperty(filtered)}
          buildPropertyHref={(key) =>
            buildLeadsHref({
              source: source ?? null,
              view,
              status: statusFilter,
              group: null,
              property: key,
              management: managementFilter,
            })
          }
        />
      ) : renderMode === "byManagement" ? (
        <LeadsByManagement
          groups={groupLeadsByManagement(filtered)}
          buildManagementHref={(key) =>
            buildLeadsHref({
              source: source ?? null,
              view,
              status: statusFilter,
              group: null,
              property: propertyFilter,
              management: key,
            })
          }
        />
      ) : view === "table" ? (
        <LeadsTable leads={filtered} />
      ) : (
        <LeadsCards leads={filtered} />
      )}
    </div>
  );
}

type PropertyOptionBase = { key: string; label: string; count: number };

function buildPropertyOptions(leads: Lead[]): PropertyOptionBase[] {
  const map = new Map<string, PropertyOptionBase>();
  for (const lead of leads) {
    const key = propertyKeyFor(lead);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { key, label: propertyDisplayName(lead), count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}

function buildManagementOptions(leads: Lead[]): PropertyOptionBase[] {
  const map = new Map<string, PropertyOptionBase>();
  for (const lead of leads) {
    const key = managementKeyFor(lead);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { key, label: managementDisplayName(lead), count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}

function emptyFilteredMessage({
  source,
  statusFilter,
  propertyLabel,
  managementLabel,
  totalLeads,
}: {
  source: string | undefined;
  statusFilter: LeadFilterStatus | null;
  propertyLabel: string | null;
  managementLabel: string | null;
  totalLeads: number;
}): string {
  if (totalLeads === 0) return "No leads yet.";
  const parts: string[] = [];
  if (managementLabel) parts.push(`management "${managementLabel}"`);
  if (propertyLabel) parts.push(`property "${propertyLabel}"`);
  if (statusFilter) parts.push(`status "${leadStatusLabel(statusFilter)}"`);
  if (source) parts.push(`source "${source}"`);
  if (parts.length === 0) return "No leads match the current filters.";
  return `No leads match ${parts.join(" and ")}.`;
}

function buildLeadsHref({
  source,
  view,
  status,
  group,
  property,
  management,
}: {
  source: string | null;
  view: "cards" | "table";
  status: LeadFilterStatus | null;
  group: GroupMode;
  property: string | null;
  management: string | null;
}): string {
  const params = new URLSearchParams();
  if (source) params.set("source", source);
  if (view === "table") params.set("view", view);
  if (status) params.set("status", status);
  if (group) params.set("group", group);
  if (property) params.set("property", property);
  if (management) params.set("management", management);
  const qs = params.toString();
  return qs ? `/leads?${qs}` : "/leads";
}

function GroupToggle({
  mode,
  hrefFlat,
  hrefProperty,
  hrefManagement,
}: {
  mode: GroupMode;
  hrefFlat: string;
  hrefProperty: string;
  hrefManagement: string;
}) {
  const btn = (active: boolean) =>
    `inline-flex h-7 w-8 items-center justify-center rounded-sm transition-colors ${
      active
        ? "bg-foreground text-background"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;
  return (
    <div
      role="group"
      aria-label="Group leads"
      className="inline-flex h-9 items-center gap-0.5 rounded-md border bg-background p-0.5"
    >
      <Link
        href={hrefFlat}
        aria-label="Flat list"
        aria-pressed={mode === null}
        title="Flat list"
        prefetch={false}
        scroll={false}
        className={btn(mode === null)}
      >
        <List className="h-3.5 w-3.5" />
      </Link>
      <Link
        href={hrefProperty}
        aria-label="Group by property"
        aria-pressed={mode === "property"}
        title="Group by property"
        prefetch={false}
        scroll={false}
        className={btn(mode === "property")}
      >
        <MapPin className="h-3.5 w-3.5" />
      </Link>
      <Link
        href={hrefManagement}
        aria-label="Group by management"
        aria-pressed={mode === "management"}
        title="Group by management"
        prefetch={false}
        scroll={false}
        className={btn(mode === "management")}
      >
        <Building2 className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function LeadsByProperty({
  groups,
  buildPropertyHref,
}: {
  groups: PropertyGroup[];
  buildPropertyHref: (key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <Card key={group.key || "ungrouped"}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {group.leads.length} contact
                    {group.leads.length === 1 ? "" : "s"}
                  </span>
                </div>
                {(group.address || group.company) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pl-6">
                    {group.address && <span>{group.address}</span>}
                    {group.company && (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {group.company}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {group.key && (
                <Link
                  href={buildPropertyHref(group.key)}
                  className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                >
                  View only this property →
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y border-t">
              {group.leads.map((lead, idx) => {
                const role = leadRole(lead);
                const rank = rolePriority(role);
                const topContact = idx === 0 && rank <= 3;
                return (
                  <li key={lead.id} className="relative py-2.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="font-medium text-foreground before:absolute before:inset-0 before:content-['']"
                          >
                            {leadFullName(lead)}
                          </Link>
                          {role && (
                            <span
                              className={
                                rank <= 3
                                  ? "text-xs text-amber-700 dark:text-amber-400"
                                  : rank <= 5
                                  ? "text-xs text-muted-foreground"
                                  : "text-xs text-muted-foreground/60"
                              }
                            >
                              {role}
                            </span>
                          )}
                          {topContact && (
                            <span className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400">
                              Top contact
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {lead.email && (
                          <span className="hidden sm:inline text-muted-foreground truncate max-w-[24ch]">
                            {lead.email}
                          </span>
                        )}
                        <Badge variant={leadStatusVariant(lead.status)}>
                          {leadStatusLabel(lead.status)}
                        </Badge>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LeadsByManagement({
  groups,
  buildManagementHref,
}: {
  groups: ManagementGroup[];
  buildManagementHref: (key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <Card key={group.key || "unassigned"}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {group.leads.length} contact
                    {group.leads.length === 1 ? "" : "s"}
                    {group.propertyCount > 0 && (
                      <>
                        {" · "}
                        {group.propertyCount}{" "}
                        {group.propertyCount === 1 ? "property" : "properties"}
                      </>
                    )}
                  </span>
                </div>
              </div>
              {group.key && (
                <Link
                  href={buildManagementHref(group.key)}
                  className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                >
                  View only this company →
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y border-t">
              {group.leads.map((lead, idx) => {
                const role = leadRole(lead);
                const rank = rolePriority(role);
                const topContact = idx === 0 && rank <= 3;
                const property = propertyDisplayName(lead);
                const hasProperty = property !== "Ungrouped";
                return (
                  <li key={lead.id} className="relative py-2.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="font-medium text-foreground before:absolute before:inset-0 before:content-['']"
                          >
                            {leadFullName(lead)}
                          </Link>
                          {role && (
                            <span
                              className={
                                rank <= 3
                                  ? "text-xs text-amber-700 dark:text-amber-400"
                                  : rank <= 5
                                  ? "text-xs text-muted-foreground"
                                  : "text-xs text-muted-foreground/60"
                              }
                            >
                              {role}
                            </span>
                          )}
                          {topContact && (
                            <span className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400">
                              Top contact
                            </span>
                          )}
                          {hasProperty && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {property}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {lead.email && (
                          <span className="hidden sm:inline text-muted-foreground truncate max-w-[24ch]">
                            {lead.email}
                          </span>
                        )}
                        <Badge variant={leadStatusVariant(lead.status)}>
                          {leadStatusLabel(lead.status)}
                        </Badge>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SourceChip({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "hover:bg-muted"
      }`}
    >
      {label}
    </Link>
  );
}

function LeadsCards({ leads }: { leads: Lead[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {leads.map((lead) => (
        <Link key={lead.id} href={`/leads/${lead.id}`} className="group">
          <Card className="h-full transition-colors group-hover:border-foreground/30">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">
                  {leadFullName(lead)}
                </CardTitle>
                <Badge variant={leadStatusVariant(lead.status)}>
                  {leadStatusLabel(lead.status)}
                </Badge>
              </div>
              {(lead.company || lead.propertyName) && (
                <CardDescription>
                  {[lead.company, lead.propertyName]
                    .filter(Boolean)
                    .join(" · ")}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1 text-sm">
                {lead.resolvedAddress && (
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="truncate">{lead.resolvedAddress}</span>
                  </div>
                )}
                {lead.email && (
                  <span className="text-muted-foreground truncate">
                    {lead.email}
                  </span>
                )}
                {lead.phone && (
                  <span className="text-muted-foreground">{lead.phone}</span>
                )}
                <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t">
                  {lead.sourceTag ? (
                    <span className="text-muted-foreground">
                      {lead.sourceTag}
                    </span>
                  ) : (
                    <span />
                  )}
                  {lead.enrichmentStatus && (
                    <span className={enrichmentClass(lead.enrichmentStatus)}>
                      {enrichmentLabel(lead.enrichmentStatus)}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function LeadsTable({ leads }: { leads: Lead[] }) {
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr className="text-left">
              <Th>Name</Th>
              <Th>Company</Th>
              <Th>Property</Th>
              <Th>Address</Th>
              <Th>Contact</Th>
              <Th>Source</Th>
              <Th>Enrichment</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="relative border-t transition-colors hover:bg-muted/40"
              >
                <Td>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-foreground before:absolute before:inset-0 before:content-['']"
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
                    {lead.email || lead.phone || "—"}
                  </span>
                </Td>
                <Td muted>{lead.sourceTag || "—"}</Td>
                <Td>
                  {lead.enrichmentStatus ? (
                    <span className={enrichmentClass(lead.enrichmentStatus)}>
                      {enrichmentLabel(lead.enrichmentStatus)}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --- tiny table cell helpers (local to this file) --- */

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-left">
      {children}
    </th>
  );
}

function Td({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 align-middle text-left ${muted ? "text-muted-foreground" : ""}`}
    >
      {children}
    </td>
  );
}
