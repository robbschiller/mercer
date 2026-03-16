"use client";

import { useState, useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { updateBidPricingAction } from "@/lib/actions";
import {
  calculateBidPricing,
  formatCurrency,
  type PricingResult,
} from "@/lib/pricing";

interface PricingFormProps {
  bidId: string;
  totalSqft: number;
  initialValues: {
    coverageSqftPerGallon: string | null;
    pricePerGallon: string | null;
    laborRatePerUnit: string | null;
    marginPercent: string | null;
  };
  lineItemsTotal: number;
}

export function PricingForm({
  bidId,
  totalSqft,
  initialValues,
  lineItemsTotal,
}: PricingFormProps) {
  const [coverage, setCoverage] = useState(
    initialValues.coverageSqftPerGallon ?? ""
  );
  const [pricePerGallon, setPricePerGallon] = useState(
    initialValues.pricePerGallon ?? ""
  );
  const [laborRate, setLaborRate] = useState(
    initialValues.laborRatePerUnit ?? ""
  );
  const [margin, setMargin] = useState(initialValues.marginPercent ?? "0");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const calc: PricingResult = calculateBidPricing({
    totalSqft,
    coverageSqftPerGallon: coverage ? Number(coverage) : null,
    pricePerGallon: pricePerGallon ? Number(pricePerGallon) : null,
    laborRatePerUnit: laborRate ? Number(laborRate) : null,
    marginPercent: margin ? Number(margin) : null,
    lineItems: [{ name: "total", amount: lineItemsTotal }],
  });

  const handleSave = useCallback(() => {
    startTransition(async () => {
      await updateBidPricingAction({
        id: bidId,
        coverageSqftPerGallon: coverage || null,
        pricePerGallon: pricePerGallon || null,
        laborRatePerUnit: laborRate || null,
        marginPercent: margin || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }, [bidId, coverage, pricePerGallon, laborRate, margin]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coverage">Coverage (sqft/gal)</Label>
          <Input
            id="coverage"
            type="number"
            step="any"
            placeholder="e.g. 200"
            value={coverage}
            onChange={(e) => setCoverage(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pricePerGallon">Price per gallon ($)</Label>
          <Input
            id="pricePerGallon"
            type="number"
            step="any"
            placeholder="e.g. 45"
            value={pricePerGallon}
            onChange={(e) => setPricePerGallon(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="laborRate">Labor rate ($/sqft)</Label>
          <Input
            id="laborRate"
            type="number"
            step="any"
            placeholder="e.g. 0.15"
            value={laborRate}
            onChange={(e) => setLaborRate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="margin">Margin (%)</Label>
          <Input
            id="margin"
            type="number"
            step="any"
            placeholder="0"
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-muted/50 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total sqft</span>
          <span className="tabular-nums">
            {totalSqft.toLocaleString()} sqft
          </span>
        </div>
        {calc.complete && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gallons needed</span>
              <span className="tabular-nums">
                {calc.gallonsNeeded?.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Material cost</span>
              <span className="tabular-nums">
                {formatCurrency(calc.materialCost)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Labor cost</span>
              <span className="tabular-nums">
                {formatCurrency(calc.laborCost)}
              </span>
            </div>
            {calc.lineItemsTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Line items</span>
                <span className="tabular-nums">
                  {formatCurrency(calc.lineItemsTotal)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">
                {formatCurrency(calc.subtotal)}
              </span>
            </div>
            {calc.marginAmount != null && calc.marginAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Margin ({margin}%)
                </span>
                <span className="tabular-nums">
                  {formatCurrency(calc.marginAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Total</span>
              <span className="tabular-nums">
                {formatCurrency(calc.grandTotal)}
              </span>
            </div>
          </>
        )}
        {!calc.complete && totalSqft > 0 && (
          <p className="text-muted-foreground text-xs pt-1">
            Enter coverage, price per gallon, and labor rate to see pricing.
          </p>
        )}
        {totalSqft === 0 && (
          <p className="text-muted-foreground text-xs pt-1">
            Add buildings and surfaces to calculate pricing.
          </p>
        )}
      </div>

      <div className="flex justify-end items-center gap-2">
        {saved && (
          <span className="text-sm text-muted-foreground">Saved</span>
        )}
        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending && <Loader2 className="animate-spin" />}
          Save pricing
        </Button>
      </div>
    </div>
  );
}
