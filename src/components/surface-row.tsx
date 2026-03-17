"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { updateSurfaceAction, deleteSurfaceAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DimensionInput } from "@/components/dimension-input";
import { formatDimensions } from "@/lib/dimensions";
import type { Surface } from "@/lib/store";

export function SurfaceRow({
  surface,
  bidId,
}: {
  surface: Surface;
  bidId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(surface.name);
  const [dimensions, setDimensions] = useState<number[][]>(
    (surface.dimensions as number[][]) ?? []
  );
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await updateSurfaceAction({
        id: surface.id,
        bidId,
        name,
        dimensions,
      });
      setEditing(false);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteSurfaceAction({ id: surface.id, bidId });
    });
  };

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-md border p-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Surface name"
          className="h-8 text-sm"
        />
        <DimensionInput value={dimensions} onChange={setDimensions} />
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setName(surface.name);
              setDimensions((surface.dimensions as number[][]) ?? []);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs"
            disabled={isPending || !name || dimensions.length === 0}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  const sqft = surface.totalSqft ? Number(surface.totalSqft) : 0;

  return (
    <div className="flex items-center gap-2 group text-sm py-0.5">
      <span className="truncate min-w-0 flex-1">{surface.name}</span>
      <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">
        {formatDimensions(surface.dimensions as number[][] | null)}
      </span>
      <span className="text-sm tabular-nums shrink-0 font-medium">
        {sqft > 0 ? `${sqft.toLocaleString()} sqft` : "—"}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setEditing(true)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        disabled={isPending}
        onClick={handleDelete}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
