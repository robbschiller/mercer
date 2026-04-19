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
import { MapPin } from "lucide-react";
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
  }>;
}) {
  const { source, imported, view: viewParam, status: statusParam } =
    await searchParams;
  const view = parseViewMode(viewParam);
  const statusFilter = parseLeadStatus(statusParam);
  const [leads, sourceTags] = await Promise.all([
    getLeads(),
    getLeadSourceTags(),
  ]);
  const filtered = leads
    .filter((l) => !source || l.sourceTag === source)
    .filter((l) => !statusFilter || l.status === statusFilter);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-2xl font-bold">Leads</h1>
        <div className="flex items-center gap-2">
          <ViewModeToggle current={view} />
          <Button variant="outline" asChild>
            <Link href="/leads/import">Import CSV</Link>
          </Button>
          <Button asChild>
            <Link href="/leads/new">New lead</Link>
          </Button>
        </div>
      </div>

      {imported && (
        <div className="mb-4 rounded-md border border-emerald-600/30 bg-emerald-600/5 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Imported {imported} lead{imported === "1" ? "" : "s"}. Office
          addresses appear on each card where Google Places resolved the
          company.
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3">
        {sourceTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="text-muted-foreground">Source:</span>
            <SourceChip
              label="All"
              active={!source}
              href={buildLeadsHref({ source: null, view, status: statusFilter })}
            />
            {sourceTags.map((tag) => (
              <SourceChip
                key={tag}
                label={tag}
                active={source === tag}
                href={buildLeadsHref({ source: tag, view, status: statusFilter })}
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
              })}
            />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground">
              {source
                ? `No leads with source "${source}".`
                : "No leads yet."}
            </p>
            {!source && (
              <div className="flex items-center gap-2">
                <Button asChild>
                  <Link href="/leads/import">Import a CSV</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/leads/new">Add a single lead</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : view === "table" ? (
        <LeadsTable leads={filtered} />
      ) : (
        <LeadsCards leads={filtered} />
      )}
    </div>
  );
}

function buildLeadsHref({
  source,
  view,
  status,
}: {
  source: string | null;
  view: "cards" | "table";
  status: LeadFilterStatus | null;
}): string {
  const params = new URLSearchParams();
  if (source) params.set("source", source);
  if (view === "table") params.set("view", view);
  if (status) params.set("status", status);
  const qs = params.toString();
  return qs ? `/leads?${qs}` : "/leads";
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
