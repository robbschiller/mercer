import Link from "next/link";
import { notFound } from "next/navigation";
import { getBidPageData } from "@/lib/store";
import { deleteBidAction } from "@/lib/actions";
import { calculateBidPricing } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { BidSummary } from "@/components/bid-summary";
import { BuildingList } from "@/components/building-list";
import { PricingSection } from "@/components/pricing-section";
import { ProposalList } from "@/components/proposal-list";

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

      <BuildingList
        bidId={bid.id}
        buildings={buildings}
        surfacesByBuilding={surfacesByBuilding}
      />

      <PricingSection
        bid={bid}
        lineItems={lineItems}
        totalSqft={totalSqft}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Proposals</CardTitle>
          <CardDescription>
            Generate a client-facing PDF proposal from this bid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProposalList
            proposals={proposals}
            bidId={bid.id}
            pricingComplete={pricing.complete}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="text-sm font-medium">Delete bid</p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>
          <form action={deleteBidAction}>
            <input type="hidden" name="id" value={bid.id} />
            <SubmitButton variant="destructive" size="sm">
              Delete
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
