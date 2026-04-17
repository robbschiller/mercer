import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getBidPageData } from "@/lib/store";
import { calculateBidPricing } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BidSummary } from "@/components/bid-summary";
import { BidDetailSections } from "@/components/bid-detail-sections";
import { DeleteBidButton } from "@/components/delete-bid-button";
import { OsmFootprintsSection } from "@/components/osm-footprints-section";
import { OsmFootprintsSkeleton } from "@/components/page-loading";

export default async function BidPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getBidPageData(id);

  if (!data) {
    notFound();
  }

  const { bid, buildings, surfacesByBuilding, lineItems, totalSqft, proposals } =
    data;

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
        pricing={pricing}
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
