"use client";

import type { LineItem } from "@/lib/store";
import { LineItemRow } from "@/components/line-item-row";
import { AddLineItemForm } from "@/components/add-line-item-form";

export function LineItemList({
  items,
  bidId,
}: {
  items: LineItem[];
  bidId: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.length > 0 && (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <LineItemRow key={item.id} item={item} bidId={bidId} />
          ))}
        </div>
      )}
      <AddLineItemForm bidId={bidId} />
    </div>
  );
}
