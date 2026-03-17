"use client";

import { useState, useCallback } from "react";
import { Building2, DollarSign, FileText } from "lucide-react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { BuildingList } from "@/components/building-list";
import { PricingSection } from "@/components/pricing-section";
import { ProposalList } from "@/components/proposal-list";
import { formatCurrency } from "@/lib/pricing";
import type { Bid, Surface, LineItem, Proposal, BuildingWithSqft } from "@/lib/store";
import type { PricingResult } from "@/lib/pricing";

type Section = "buildings" | "pricing" | "proposals";

interface BidDetailSectionsProps {
  bid: Bid;
  buildings: BuildingWithSqft[];
  surfacesByBuilding: Record<string, Surface[]>;
  lineItems: LineItem[];
  totalSqft: number;
  proposals: Proposal[];
  pricing: PricingResult;
}

export function BidDetailSections({
  bid,
  buildings,
  surfacesByBuilding,
  lineItems,
  totalSqft,
  proposals,
  pricing,
}: BidDetailSectionsProps) {
  const [open, setOpen] = useState<Set<Section>>(() => {
    const initial = new Set<Section>();
    if (buildings.length === 0) initial.add("buildings");
    if (!pricing.complete) initial.add("pricing");
    if (proposals.length === 0) initial.add("proposals");
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

  const buildingSummary =
    buildings.length === 0
      ? "No buildings added yet"
      : `${buildings.length} building${buildings.length !== 1 ? "s" : ""}${grandTotal > 0 ? ` · ${grandTotal.toLocaleString()} sqft` : ""}`;

  const pricingSummary = pricing.complete
    ? `${formatCurrency(pricing.grandTotal)}${lineItemsTotal > 0 ? ` · ${lineItems.length} line item${lineItems.length !== 1 ? "s" : ""}` : ""}`
    : "Set up pricing to calculate your bid";

  const proposalSummary =
    proposals.length === 0
      ? "No proposals generated yet"
      : `${proposals.length} proposal${proposals.length !== 1 ? "s" : ""} · Last sent ${new Date(proposals[0].createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

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
        />
      </CollapsibleSection>

      <CollapsibleSection
        icon={FileText}
        title="Proposals"
        description="Generate a client-facing PDF proposal from this bid."
        summary={proposalSummary}
        open={open.has("proposals")}
        onToggle={() => toggle("proposals")}
      >
        <ProposalList
          proposals={proposals}
          bidId={bid.id}
          pricingComplete={pricing.complete}
        />
      </CollapsibleSection>
    </>
  );
}
