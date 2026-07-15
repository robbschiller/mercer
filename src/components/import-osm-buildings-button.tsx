"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importOsmBuildingsAction } from "@/lib/actions/import-osm-buildings";

/** One tap: OSM footprints → building types with wall-surface estimates. */
export function ImportOsmBuildingsButton({ bidId }: { bidId: string }) {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          setError(null);
          start(async () => {
            const r = await importOsmBuildingsAction({ bidId });
            if (r.error) setError(r.error);
            else
              setResult(
                `Added ${r.created} building type${r.created === 1 ? "" : "s"} with wall estimates — verify heights below.`,
              );
          });
        }}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : result ? (
          <Check className="size-3.5" />
        ) : (
          <Wand2 className="size-3.5" />
        )}
        Add as buildings
      </Button>
      {result && (
        <span className="text-xs text-muted-foreground">{result}</span>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
