import { getBid, getLineItemsForBid, getBidTotalSqft } from "@/lib/store";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { PricingForm } from "@/components/pricing-form";
import { LineItemList } from "@/components/line-item-list";

export async function PricingSection({ bidId }: { bidId: string }) {
  const [bid, items, totalSqft] = await Promise.all([
    getBid(bidId),
    getLineItemsForBid(bidId),
    getBidTotalSqft(bidId),
  ]);

  if (!bid) return null;

  const lineItemsTotal = items.reduce(
    (sum, li) => sum + Number(li.amount),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pricing</CardTitle>
        <CardDescription>
          Set rates and margins to calculate your bid price.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <PricingForm
          bidId={bid.id}
          totalSqft={totalSqft}
          initialValues={{
            coverageSqftPerGallon: bid.coverageSqftPerGallon,
            pricePerGallon: bid.pricePerGallon,
            laborRatePerUnit: bid.laborRatePerUnit,
            marginPercent: bid.marginPercent,
          }}
          lineItemsTotal={lineItemsTotal}
        />

        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-3">Custom line items</h3>
          <LineItemList items={items} bidId={bid.id} />
        </div>
      </CardContent>
    </Card>
  );
}
