"use client";

import { SurfaceRow } from "@/components/surface-row";
import type { Surface } from "@/lib/store";

export function SurfaceList({
  surfaces,
  bidId,
}: {
  surfaces: Surface[];
  bidId: string;
}) {
  if (surfaces.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-1">
        No surfaces yet. Add one below.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {surfaces.map((surface) => (
        <SurfaceRow key={surface.id} surface={surface} bidId={bidId} />
      ))}
    </div>
  );
}
