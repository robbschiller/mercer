import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getBidPageData,
  getProjectByBidId,
  getPriceListItems,
  getPhotos,
  getAttachments,
  getJobScheduleContext,
  getContactName,
  getBidBudget,
} from "@/lib/store";
import { TakeoffBudgetCard } from "@/components/budget-card";
import { QuoteEngine } from "@/components/quote-engine";
import { addCatalogLineItemAction } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { pricingUnitLabel } from "@/lib/status-meta";
import { calculateBidPricing } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { BidSummary } from "@/components/bid-summary";
import { BidDetailSections } from "@/components/bid-detail-sections";
import { BreadcrumbLabel } from "@/components/breadcrumb-label";
import { DeleteBidButton } from "@/components/delete-bid-button";
import { OsmFootprintsSection } from "@/components/osm-footprints-section";
import { OsmFootprintsSkeleton } from "@/components/page-loading";
import {
  projectStatusLabel,
  projectStatusVariant,
} from "@/lib/status-meta";

export default async function BidPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [
    data,
    project,
    catalog,
    bidPhotos,
    bidAttachments,
    scheduleContext,
    budget,
  ] = await Promise.all([
    getBidPageData(id),
    getProjectByBidId(id),
    getPriceListItems({ activeOnly: true }),
    getPhotos("bid", id),
    getAttachments("bid", id),
    getJobScheduleContext(id),
    getBidBudget(id),
  ]);

  if (!data) {
    notFound();
  }

  const primaryContactName = data.bid.primaryContactId
    ? await getContactName(data.bid.primaryContactId)
    : null;

  const {
    bid,
    buildings,
    surfacesByBuilding,
    lineItems,
    accessItems,
    totalSqft,
    proposals,
    proposalShares,
  } = data;

  const pricing = calculateBidPricing({
    totalSqft,
    coverageSqftPerGallon: bid.coverageSqftPerGallon
      ? Number(bid.coverageSqftPerGallon)
      : null,
    pricePerGallon: bid.pricePerGallon ? Number(bid.pricePerGallon) : null,
    laborRatePerUnit: bid.laborRatePerUnit
      ? Number(bid.laborRatePerUnit)
      : null,
    marginPercent: bid.marginPercent ? Number(bid.marginPercent) : null,
    lineItems: lineItems.map((li) => ({
      name: li.name,
      amount: Number(li.amount),
    })),
    accessItems: accessItems.map((a) => ({
      name: a.method ?? a.type,
      amount: Number(a.amount),
    })),
  });

  const bidLabel = bid.propertyName || bid.clientName || "Untitled opportunity";

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 flex flex-col gap-6">
      <BreadcrumbLabel segment={id} label={bidLabel} />
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/opportunities">&larr; Opportunities</Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <BidSummary bid={bid} />

      {project && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Project created</p>
                <Badge variant={projectStatusVariant(project.status)}>
                  {projectStatusLabel(project.status)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {project.acceptedByName ? (
                  <>
                    Accepted by{" "}
                    <span className="text-foreground">
                      {project.acceptedByName}
                      {project.acceptedByTitle
                        ? `, ${project.acceptedByTitle}`
                        : ""}
                    </span>
                    {project.acceptedAt
                      ? ` on ${new Date(project.acceptedAt).toLocaleDateString()}`
                      : ""}
                  </>
                ) : (
                  "Opportunity moved into delivery."
                )}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${project.id}`}>Open project</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div id="quote" className="scroll-mt-6" />
      <QuoteEngine
        bid={bid}
        lineItems={lineItems}
        photos={bidPhotos}
        attachments={bidAttachments}
        defaultRecipient={primaryContactName}
        proposals={proposals}
        proposalShares={proposalShares}
        totalSqft={totalSqft}
        buildingsCount={scheduleContext.buildingsTotal}
        isLargeJob={scheduleContext.isLargeJob}
        catalogCount={catalog.length}
      />

      {budget && (
        <TakeoffBudgetCard bidId={id} budget={budget} quoteTotal={pricing.grandTotal} />
      )}

      <Suspense fallback={<OsmFootprintsSkeleton />}>
        <OsmFootprintsSection
          latitude={bid.latitude}
          longitude={bid.longitude}
          bidId={bid.id}
        />
      </Suspense>

      <BidDetailSections
        bid={bid}
        buildings={buildings}
        surfacesByBuilding={surfacesByBuilding}
        lineItems={lineItems}
        accessItems={accessItems}
        totalSqft={totalSqft}
        pricing={pricing}
      />

      {catalog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add from catalog</CardTitle>
            <CardDescription>
              Pull a standardized SKU from your service catalog into this opportunity as
              a line item (charge × quantity). Manage the catalog in Settings →
              Catalog &amp; suppliers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={addCatalogLineItemAction}
              className="flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="bidId" value={bid.id} />
              <div className="flex min-w-56 flex-1 flex-col gap-1.5">
                <Label htmlFor="cat-item">Catalog item</Label>
                <select
                  id="cat-item"
                  name="priceListItemId"
                  required
                  defaultValue=""
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="" disabled>
                    — Pick a SKU —
                  </option>
                  {catalog.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                      {it.chargePerUnit != null
                        ? ` — $${Number(it.chargePerUnit)}${it.pricingUnit ? ` ${pricingUnitLabel(it.pricingUnit)}` : ""}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex w-24 flex-col gap-1.5">
                <Label htmlFor="cat-qty">Qty</Label>
                <Input
                  id="cat-qty"
                  name="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="1"
                />
              </div>
              <SubmitButton size="sm">Add</SubmitButton>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/50">
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="text-sm font-medium">Delete opportunity</p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>
          <DeleteBidButton bid={bid} />
        </CardContent>
      </Card>
    </div>
  );
}
