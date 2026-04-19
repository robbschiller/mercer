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
import { parseViewMode } from "@/lib/view-mode";
import {
  LEAD_STATUSES,
  type LeadStatus,
  enrichmentLabel,
  leadStatusLabel,
  leadStatusVariant,
} from "@/lib/status-meta";

type LeadFilterStatus = LeadStatus;

function parseLeadStatus(value: string | undefined): LeadFilterStatus | null {
  if (!value) return null;
  return LEAD_STATUSES.includes(value as LeadFilterStatus)
    ? (value as LeadFilterStatus)
    : null;
}

/**
 * Derive the management-office identity from a lead. Attendees who share
 * a Management Company AND city are treated as one office. City is pulled
 * from the raw CSV row because we never promoted it to a typed column.
 * Falls back to company-only (city = "") or company = "" when missing.
 */
const CITY_KEYS = ["city", "City", "CITY"];
function leadCity(lead: Lead): string {
  const raw = lead.rawRow;
  if (!raw) return "";
  for (const k of CITY_KEYS) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const [k, v] of Object.entries(raw)) {
    if (/city/i.test(k) && typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/**
 * Paint-decision authority ranking for attendee roles. Lower number = more
 * likely to own the exterior-paint decision for a multifamily community.
 * Rough hierarchy: owners / regional leadership > site manager + maintenance
 * supervisor > assistant / leasing manager > corporate generalists > leasing
 * agents + technicians > support roles. The full BAAA 2026 list has 22 role
 * values; anything unrecognized falls through to the lowest tier so it still
 * surfaces but never bubbles above a decision-maker.
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

function officeKeyFor(lead: Lead): string {
  const company = (lead.company ?? "").trim();
  const city = leadCity(lead);
  if (!company && !city) return "";
  return `${company}~${city}`;
}

function officeLabel(company: string, city: string): string {
  if (company && city) return `${company}, ${city}`;
  if (company) return company;
  if (city) return city;
  return "Ungrouped";
}

type OfficeGroup = {
  key: string;
  company: string;
  city: string;
  label: string;
  leads: Lead[];
};

function groupLeadsByOffice(leads: Lead[]): OfficeGroup[] {
  const map = new Map<string, OfficeGroup>();
  for (const lead of leads) {
    const key = officeKeyFor(lead);
    const company = (lead.company ?? "").trim();
    const city = leadCity(lead);
    const existing = map.get(key);
    if (existing) {
      existing.leads.push(lead);
    } else {
      map.set(key, {
        key,
        company,
        city,
        label: officeLabel(company, city),
        leads: [lead],
      });
    }
  }
  for (const group of map.values()) {
    group.leads.sort((a, b) => {
      const pa = rolePriority(leadRole(a));
      const pb = rolePriority(leadRole(b));
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    });
  }
  return Array.from(map.values()).sort((a, b) => {
    // Biggest offices first; ungrouped (empty key) sinks to the bottom.
    if (!a.key) return 1;
    if (!b.key) return -1;
    if (b.leads.length !== a.leads.length) return b.leads.length - a.leads.length;
    return a.label.localeCompare(b.label);
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
    office?: string;
  }>;
}) {
  const {
    source,
    imported,
    view: viewParam,
    status: statusParam,
    group: groupParam,
    office: officeParam,
  } = await searchParams;
  const view = parseViewMode(viewParam);
  const statusFilter = parseLeadStatus(statusParam);
  const officeFilter = officeParam?.trim() || null;
  // Grouped rendering ignores the card/table toggle on purpose: grouped
  // sections are their own layout. The filter-to-one-office state falls
  // back to flat rendering so the user can switch between cards/table.
  const grouped = groupParam === "office" && !officeFilter;

  const [leads, sourceTags] = await Promise.all([
    getLeads(),
    getLeadSourceTags(),
  ]);
  const filtered = leads
    .filter((l) => !source || l.sourceTag === source)
    .filter((l) => !statusFilter || l.status === statusFilter)
    .filter((l) => !officeFilter || officeKeyFor(l) === officeFilter);

  const activeOfficeLabel = (() => {
    if (!officeFilter) return null;
    const sample = filtered[0] ?? leads.find((l) => officeKeyFor(l) === officeFilter);
    if (!sample) return officeFilter;
    return officeLabel((sample.company ?? "").trim(), leadCity(sample));
  })();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-3xl font-medium tracking-tight">
          Leads
        </h1>
        <div className="flex items-center gap-2">
          <GroupToggle
            grouped={grouped}
            hrefOn={buildLeadsHref({
              source: source ?? null,
              view,
              status: statusFilter,
              group: "office",
              office: null,
            })}
            hrefOff={buildLeadsHref({
              source: source ?? null,
              view,
              status: statusFilter,
              group: null,
              office: officeFilter,
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
          Imported {imported} lead{imported === "1" ? "" : "s"}. Use “Group by
          office” to roll attendees up by management company and city.
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
                group: grouped ? "office" : null,
                office: officeFilter,
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
                  group: grouped ? "office" : null,
                  office: officeFilter,
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
              group: grouped ? "office" : null,
              office: officeFilter,
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
                group: grouped ? "office" : null,
                office: officeFilter,
              })}
            />
          ))}
        </div>
        {officeFilter && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Office:</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-foreground bg-foreground px-3 py-1 text-xs text-background">
              <Building2 className="h-3 w-3" />
              {activeOfficeLabel}
              <Link
                href={buildLeadsHref({
                  source: source ?? null,
                  view,
                  status: statusFilter,
                  group: null,
                  office: null,
                })}
                aria-label="Clear office filter"
                className="ml-1 rounded-full px-1 leading-none hover:bg-background/20"
              >
                ×
              </Link>
            </span>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            {source || statusFilter || officeFilter ? (
              <>
                <p className="text-muted-foreground">
                  {emptyFilteredMessage({
                    source,
                    statusFilter,
                    officeLabel: activeOfficeLabel,
                    totalLeads: leads.length,
                  })}
                </p>
                <Button variant="outline" asChild>
                  <Link
                    href={buildLeadsHref({
                      source: null,
                      view,
                      status: null,
                      group: grouped ? "office" : null,
                      office: null,
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
      ) : grouped ? (
        <LeadsByOffice
          groups={groupLeadsByOffice(filtered)}
          buildOfficeHref={(key) =>
            buildLeadsHref({
              source: source ?? null,
              view,
              status: statusFilter,
              group: null,
              office: key,
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

function emptyFilteredMessage({
  source,
  statusFilter,
  officeLabel,
  totalLeads,
}: {
  source: string | undefined;
  statusFilter: LeadFilterStatus | null;
  officeLabel: string | null;
  totalLeads: number;
}): string {
  if (totalLeads === 0) return "No leads yet.";
  const parts: string[] = [];
  if (officeLabel) parts.push(`office "${officeLabel}"`);
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
  office,
}: {
  source: string | null;
  view: "cards" | "table";
  status: LeadFilterStatus | null;
  group: "office" | null;
  office: string | null;
}): string {
  const params = new URLSearchParams();
  if (source) params.set("source", source);
  if (view === "table") params.set("view", view);
  if (status) params.set("status", status);
  if (group) params.set("group", group);
  if (office) params.set("office", office);
  const qs = params.toString();
  return qs ? `/leads?${qs}` : "/leads";
}

function GroupToggle({
  grouped,
  hrefOff,
  hrefOn,
}: {
  grouped: boolean;
  hrefOff: string;
  hrefOn: string;
}) {
  return (
    <div
      role="group"
      aria-label="Group leads"
      className="inline-flex h-9 items-center gap-0.5 rounded-md border bg-background p-0.5"
    >
      <Link
        href={hrefOff}
        aria-label="Flat list"
        aria-pressed={!grouped}
        title="Flat list"
        prefetch={false}
        scroll={false}
        className={`inline-flex h-7 w-8 items-center justify-center rounded-sm transition-colors ${
          !grouped
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <List className="h-3.5 w-3.5" />
      </Link>
      <Link
        href={hrefOn}
        aria-label="Group by office"
        aria-pressed={grouped}
        title="Group by office"
        prefetch={false}
        scroll={false}
        className={`inline-flex h-7 w-8 items-center justify-center rounded-sm transition-colors ${
          grouped
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Building2 className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function LeadsByOffice({
  groups,
  buildOfficeHref,
}: {
  groups: OfficeGroup[];
  buildOfficeHref: (key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <Card key={group.key || "ungrouped"}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{group.label}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {group.leads.length} attendee
                  {group.leads.length === 1 ? "" : "s"}
                </span>
              </div>
              {group.key && (
                <Link
                  href={buildOfficeHref(group.key)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  View only this office →
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y border-t">
              {group.leads.map((lead, idx) => {
                const role = leadRole(lead);
                const rank = rolePriority(role);
                // First row and a rank of 3 or better (owner / regional /
                // community manager) gets the paint-decision star so Jordan
                // can see at a glance who to call first in this office.
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
                            {lead.name}
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
                        {lead.propertyName && (
                          <span className="text-xs text-muted-foreground">
                            {lead.propertyName}
                          </span>
                        )}
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
                <CardTitle className="text-base">{lead.name}</CardTitle>
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
                    {lead.name}
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
