"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { updateUserDefaultsAction } from "@/lib/actions";

interface DefaultsFormProps {
  initialValues: {
    coverageSqftPerGallon: string | null;
    pricePerGallon: string | null;
    laborRatePerUnit: string | null;
    marginPercent: string | null;
  };
}

export function DefaultsForm({ initialValues }: DefaultsFormProps) {
  const [coverage, setCoverage] = useState(
    initialValues.coverageSqftPerGallon ?? ""
  );
  const [pricePerGallon, setPricePerGallon] = useState(
    initialValues.pricePerGallon ?? ""
  );
  const [laborRate, setLaborRate] = useState(
    initialValues.laborRatePerUnit ?? ""
  );
  const [margin, setMargin] = useState(initialValues.marginPercent ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await updateUserDefaultsAction({
        coverageSqftPerGallon: coverage || null,
        pricePerGallon: pricePerGallon || null,
        laborRatePerUnit: laborRate || null,
        marginPercent: margin || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        These values pre-populate pricing on every new bid. They also update
        automatically each time you save pricing on a bid.
      </p>

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

      <div className="flex justify-end items-center gap-2">
        {saved && (
          <span className="text-sm text-muted-foreground">Saved</span>
        )}
        <Button onClick={handleSave} disabled={isPending} size="sm">
          {isPending && <Loader2 className="animate-spin" />}
          Save defaults
        </Button>
      </div>
    </div>
  );
}
