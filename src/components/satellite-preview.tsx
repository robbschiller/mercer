"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { buildSatelliteProxyPath } from "@/lib/maps/satellite-path";

type SatellitePreviewProps = {
  lat: number;
  lng: number;
  /** Stored proxy path from DB; must match lat/lng for consistent imagery. */
  satellitePath?: string | null;
  className?: string;
  width?: number;
  height?: number;
  zoom?: number;
};

export function SatellitePreview({
  lat,
  lng,
  satellitePath,
  className,
  width = 600,
  height = 360,
  zoom = 18,
}: SatellitePreviewProps) {
  const [failed, setFailed] = useState(false);
  const src =
    satellitePath?.trim() ||
    buildSatelliteProxyPath(lat, lng, { w: width, h: height, zoom }) ||
    "";

  if (!src) {
    return null;
  }

  if (failed) {
    return (
      <div
        className={cn(
          "rounded-md border border-border bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground",
          className
        )}
      >
        Satellite preview unavailable. Configure{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">
          GOOGLE_MAPS_STATIC_API_KEY
        </code>{" "}
        and enable the Maps Static API.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- proxied Google Static API; dynamic query */}
      <img
        src={src}
        alt="Satellite view of the property"
        className="w-full rounded-md border border-border object-cover"
        width={width}
        height={height}
        onError={() => setFailed(true)}
      />
      <p className="text-[10px] text-muted-foreground">Map imagery © Google</p>
    </div>
  );
}
