import type { Bid, LineItem } from "@/lib/store";
import { PricingForm } from "@/components/pricing-form";
import { LineItemList } from "@/components/line-item-list";

export function PricingSection({
  bid,
  lineItems: items,
  totalSqft,
}: {
  bid: Bid;
  lineItems: LineItem[];
  totalSqft: number;
}) {
  const lineItemsTotal = items.reduce(
    (sum, li) => sum + Number(li.amount),
    0
  );

  return (
    <div className="flex flex-col gap-6">
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
    </div>
  );
}
