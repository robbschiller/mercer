"use client";

import { useState, useTransition } from "react";
import { createSurfaceAction } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DimensionInput } from "@/components/dimension-input";
import { SurfacePresets } from "@/components/surface-presets";

export function AddSurfaceForm({
  buildingId,
  bidId,
}: {
  buildingId: string;
  bidId: string;
}) {
  const [name, setName] = useState("");
  const [dimensions, setDimensions] = useState<number[][]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!name || dimensions.length === 0) return;

    startTransition(async () => {
      await createSurfaceAction({
        buildingId,
        bidId,
        name,
        dimensions,
      });
      setName("");
      setDimensions([]);
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Surface name"
          className="h-8 text-sm flex-1"
        />
        <SurfacePresets onSelect={setName} />
      </div>
      <DimensionInput
        key={isPending ? "reset" : "active"}
        value={dimensions}
        onChange={setDimensions}
      />
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          className="h-7 text-xs"
          disabled={isPending || !name || dimensions.length === 0}
          onClick={handleSubmit}
        >
          Add surface
        </Button>
      </div>
    </div>
  );
}
