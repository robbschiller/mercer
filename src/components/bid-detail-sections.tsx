"use client";

import { useState, useCallback } from "react";
import { Building2, DollarSign, FileText, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { BuildingList } from "@/components/building-list";
import { PricingSection } from "@/components/pricing-section";
import { ProposalList } from "@/components/proposal-list";
import { formatCurrency } from "@/lib/pricing";
import type { Bid, Surface, LineItem, Proposal } from "@/lib/store";
import type { PricingResult } from "@/lib/pricing";

type Section = "buildings" | "pricing" | "proposals";

interface BuildingWithSqft {
  id: string;
  bidId: string;
  label: string;
  count: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  totalSqft: number;
}

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
  const [open, setOpen] = useState<Set<Section>>(new Set());

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

  return (
    <>
      {open.has("buildings") ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Buildings</CardTitle>
                <CardDescription>
                  Add building types with counts and measurements.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggle("buildings")}
              >
                Done
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <BuildingList
              bidId={bid.id}
              buildings={buildings}
              surfacesByBuilding={surfacesByBuilding}
            />
          </CardContent>
        </Card>
      ) : (
        <Card
          className="cursor-pointer hover:border-foreground/20 transition-colors"
          onClick={() => toggle("buildings")}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Buildings</CardTitle>
                  <CardDescription>
                    {buildings.length === 0
                      ? "No buildings added yet"
                      : `${buildings.length} building${buildings.length !== 1 ? "s" : ""}${grandTotal > 0 ? ` · ${grandTotal.toLocaleString()} sqft` : ""}`}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle("buildings");
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {open.has("pricing") ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Pricing</CardTitle>
                <CardDescription>
                  Set rates and margins to calculate your bid price.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggle("pricing")}
              >
                Done
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <PricingSection
              bid={bid}
              lineItems={lineItems}
              totalSqft={totalSqft}
            />
          </CardContent>
        </Card>
      ) : (
        <Card
          className="cursor-pointer hover:border-foreground/20 transition-colors"
          onClick={() => toggle("pricing")}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Pricing</CardTitle>
                  <CardDescription>
                    {pricing.complete
                      ? `${formatCurrency(pricing.grandTotal)}${lineItemsTotal > 0 ? ` · ${lineItems.length} line item${lineItems.length !== 1 ? "s" : ""}` : ""}`
                      : "Set up pricing to calculate your bid"}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle("pricing");
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {open.has("proposals") ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Proposals</CardTitle>
                <CardDescription>
                  Generate a client-facing PDF proposal from this bid.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggle("proposals")}
              >
                Done
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ProposalList
              proposals={proposals}
              bidId={bid.id}
              pricingComplete={pricing.complete}
            />
          </CardContent>
        </Card>
      ) : (
        <Card
          className="cursor-pointer hover:border-foreground/20 transition-colors"
          onClick={() => toggle("proposals")}
        >
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Proposals</CardTitle>
                  <CardDescription>
                    {proposals.length === 0
                      ? "No proposals generated yet"
                      : `${proposals.length} proposal${proposals.length !== 1 ? "s" : ""} · Last sent ${new Date(proposals[0].createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle("proposals");
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}
    </>
  );
}
