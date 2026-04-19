import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getBidPageData, getProjectByBidId } from "@/lib/store";
import { calculateBidPricing } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BidSummary } from "@/components/bid-summary";
import { BidDetailSections } from "@/components/bid-detail-sections";
import { DeleteBidButton } from "@/components/delete-bid-button";
import { OsmFootprintsSection } from "@/components/osm-footprints-section";
import { OsmFootprintsSkeleton } from "@/components/page-loading";
import {
  projectStatusLabel,
  projectStatusVariant,
} from "@/lib/status-meta";

export default async function BidPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, project] = await Promise.all([
    getBidPageData(id),
    getProjectByBidId(id),
  ]);

  if (!data) {
    notFound();
  }

  const {
    bid,
    buildings,
    surfacesByBuilding,
    lineItems,
    totalSqft,
    proposals,
    proposalShares,
  } = data;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
  });

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/bids">&larr; Bids</Link>
        </Button>
      </div>

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
                  "Bid moved into delivery."
                )}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${project.id}`}>Open project</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Suspense fallback={<OsmFootprintsSkeleton />}>
        <OsmFootprintsSection
          latitude={bid.latitude}
          longitude={bid.longitude}
        />
      </Suspense>

      <BidDetailSections
        bid={bid}
        buildings={buildings}
        surfacesByBuilding={surfacesByBuilding}
        lineItems={lineItems}
        totalSqft={totalSqft}
        proposals={proposals}
        proposalShares={proposalShares}
        pricing={pricing}
        siteUrl={siteUrl}
      />

      <Card className="border-destructive/50">
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="text-sm font-medium">Delete bid</p>
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
