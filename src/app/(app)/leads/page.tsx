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

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  new: "secondary",
  quoted: "outline",
  won: "default",
  lost: "secondary",
};

const statusLabels: Record<string, string> = {
  new: "New",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

const enrichmentLabels: Record<string, string> = {
  pending: "Enriching…",
  success: "Enriched",
  failed: "Enrichment failed",
  skipped: "Skipped",
};

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
  searchParams: Promise<{ source?: string; imported?: string }>;
}) {
  const { source, imported } = await searchParams;
  const [leads, sourceTags] = await Promise.all([
    getLeads(),
    getLeadSourceTags(),
  ]);
  const filtered = source
    ? leads.filter((l) => l.sourceTag === source)
    : leads;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Leads</h1>
        <div className="flex items-center gap-2">
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
          Imported {imported} lead{imported === "1" ? "" : "s"}. Enrichment is
          complete — resolved addresses appear on each card below.
        </div>
      )}

      {sourceTags.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap text-sm">
          <span className="text-muted-foreground">Source:</span>
          <Link
            href="/leads"
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              !source
                ? "border-foreground bg-foreground text-background"
                : "hover:bg-muted"
            }`}
          >
            All
          </Link>
          {sourceTags.map((tag) => (
            <Link
              key={tag}
              href={`/leads?source=${encodeURIComponent(tag)}`}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                source === tag
                  ? "border-foreground bg-foreground text-background"
                  : "hover:bg-muted"
              }`}
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="group"
            >
              <Card className="h-full transition-colors group-hover:border-foreground/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{lead.name}</CardTitle>
                    <Badge variant={statusVariant[lead.status] ?? "secondary"}>
                      {statusLabels[lead.status] ?? lead.status}
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
                      <span className="text-muted-foreground">
                        {lead.phone}
                      </span>
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
                          {enrichmentLabels[lead.enrichmentStatus] ??
                            lead.enrichmentStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
