import Link from "next/link";
import { notFound } from "next/navigation";
import { getLead, getLatestBidForLead } from "@/lib/store";
import { enrichLeadAction, updateLeadStatusAction } from "@/lib/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import {
  enrichmentLabel,
  leadStatusLabel,
  leadStatusVariant,
} from "@/lib/status-meta";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, linkedBid] = await Promise.all([
    getLead(id),
    getLatestBidForLead(id),
  ]);
  if (!lead) notFound();

  const showRerun =
    !lead.enrichmentStatus ||
    lead.enrichmentStatus === "failed" ||
    lead.enrichmentStatus === "skipped";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/leads"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Leads
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{lead.name}</h1>
          {(lead.company || lead.propertyName) && (
            <p className="text-muted-foreground">
              {[lead.company, lead.propertyName].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={leadStatusVariant(lead.status)}>
            {leadStatusLabel(lead.status)}
          </Badge>
          {lead.enrichmentStatus && (
            <span className="text-xs text-muted-foreground">
              {enrichmentLabel(lead.enrichmentStatus)}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {lead.email ? (
              <a
                href={`mailto:${lead.email}`}
                className="text-muted-foreground hover:text-foreground"
              >
                {lead.email}
              </a>
            ) : (
              <span className="text-muted-foreground/60">No email</span>
            )}
            {lead.phone ? (
              <a
                href={`tel:${lead.phone}`}
                className="text-muted-foreground hover:text-foreground"
              >
                {lead.phone}
              </a>
            ) : (
              <span className="text-muted-foreground/60">No phone</span>
            )}
            {lead.sourceTag && (
              <span className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                Source: {lead.sourceTag}
              </span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Office address</CardTitle>
            <CardDescription className="text-xs">
              Resolved from the company name via Google Places. The property to
              bid on is captured when you create a bid.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {lead.resolvedAddress ? (
              <p>{lead.resolvedAddress}</p>
            ) : (
              <p className="text-muted-foreground/60">Not resolved yet</p>
            )}
            {lead.enrichmentError && (
              <p className="text-xs text-destructive">{lead.enrichmentError}</p>
            )}
            {showRerun && (
              <form action={enrichLeadAction} className="pt-2">
                <input type="hidden" name="id" value={lead.id} />
                <SubmitButton variant="outline" size="sm">
                  Re-run enrichment
                </SubmitButton>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Pipeline status</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={updateLeadStatusAction}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="id" value={lead.id} />
            <select
              name="status"
              defaultValue={lead.status}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="new">New</option>
              <option value="quoted">Quoted</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
            <SubmitButton size="sm">Save status</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-end gap-2">
        {linkedBid ? (
          <Button variant="outline" asChild>
            <Link href={`/bids/${linkedBid.id}`}>View linked bid</Link>
          </Button>
        ) : null}
        <Button asChild>
          <Link href={`/bids/new?leadId=${lead.id}`}>Create bid from lead</Link>
        </Button>
      </div>
    </div>
  );
}
