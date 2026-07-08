"use client";

import { useState, useCallback } from "react";
import { Building2, DollarSign, ArrowUpDown } from "lucide-react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { BuildingList } from "@/components/building-list";
import { AccessItemsSection } from "@/components/access-items-section";
import { PricingSection } from "@/components/pricing-section";
import { formatCurrency } from "@/lib/pricing";
import type {
  Bid,
  Surface,
  LineItem,
  AccessItem,
  BuildingWithSqft,
} from "@/lib/store";
import type { PricingResult } from "@/lib/pricing";

// Proposals moved into the quote engine's version-history rail
// (quote-engine.tsx) — this component keeps the takeoff-detail sections.
type Section = "buildings" | "access" | "pricing";

interface BidDetailSectionsProps {
  bid: Bid;
  buildings: BuildingWithSqft[];
  surfacesByBuilding: Record<string, Surface[]>;
  lineItems: LineItem[];
  accessItems: AccessItem[];
  totalSqft: number;
  pricing: PricingResult;
}

export function BidDetailSections({
  bid,
  buildings,
  surfacesByBuilding,
  lineItems,
  accessItems,
  totalSqft,
  pricing,
}: BidDetailSectionsProps) {
  const [open, setOpen] = useState<Set<Section>>(() => {
    const initial = new Set<Section>();
    if (buildings.length === 0) initial.add("buildings");
    if (!pricing.complete) initial.add("pricing");
    return initial;
  });

  const toggle = useCallback((section: Section) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const grandTotal = buildings.reduce(
    (sum, b) => sum + b.totalSqft * b.count,
    0
  );

  const lineItemsTotal = lineItems.reduce(
    (sum, li) => sum + Number(li.amount),
    0
  );

  const accessTotal = accessItems.reduce(
    (sum, a) => sum + Number(a.amount),
    0
  );

  const accessSummary =
    accessItems.length === 0
      ? "No access items added"
      : `${accessItems.length} item${accessItems.length !== 1 ? "s" : ""} · ${formatCurrency(accessTotal)}`;

  const buildingSummary =
    buildings.length === 0
      ? "No buildings added yet"
      : `${buildings.length} building${buildings.length !== 1 ? "s" : ""}${grandTotal > 0 ? ` · ${grandTotal.toLocaleString()} sqft` : ""}`;

  const pricingSummary = pricing.complete
    ? `${formatCurrency(pricing.grandTotal)}${lineItemsTotal > 0 ? ` · ${lineItems.length} line item${lineItems.length !== 1 ? "s" : ""}` : ""}`
    : "Set up pricing to calculate your bid";

  return (
    <>
      <CollapsibleSection
        icon={Building2}
        title="Buildings"
        description="Add building types with counts and measurements."
        summary={buildingSummary}
        open={open.has("buildings")}
        onToggle={() => toggle("buildings")}
      >
        <BuildingList
          bidId={bid.id}
          buildings={buildings}
          surfacesByBuilding={surfacesByBuilding}
        />
      </CollapsibleSection>

      <CollapsibleSection
        icon={ArrowUpDown}
        title="Access"
        description="Lifts, scaffold, swing stage, and safety to reach the work."
        summary={accessSummary}
        open={open.has("access")}
        onToggle={() => toggle("access")}
      >
        <AccessItemsSection bidId={bid.id} items={accessItems} />
      </CollapsibleSection>

      <CollapsibleSection
        icon={DollarSign}
        title="Pricing"
        description="Set rates and margins to calculate your bid price."
        summary={pricingSummary}
        open={open.has("pricing")}
        onToggle={() => toggle("pricing")}
      >
        <PricingSection
          bid={bid}
          lineItems={lineItems}
          totalSqft={totalSqft}
          accessTotal={accessTotal}
        />
      </CollapsibleSection>
    </>
  );
}
