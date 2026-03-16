"use client";

import { useState, useTransition } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateProposalAction } from "@/lib/actions";
import type { Proposal } from "@/lib/store";

export function ProposalList({
  proposals,
  bidId,
  pricingComplete,
}: {
  proposals: Proposal[];
  bidId: string;
  pricingComplete: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateProposalAction({ bidId });
      if (result.error) {
        setError(result.error);
      } else if (result.pdfUrl) {
        window.open(result.pdfUrl, "_blank");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button
          onClick={handleGenerate}
          disabled={isPending || !pricingComplete}
          size="sm"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Generate Proposal
        </Button>
      </div>

      {!pricingComplete && (
        <p className="text-xs text-muted-foreground">
          Complete all pricing fields to generate a proposal.
        </p>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {proposals.length > 0 && (
        <div className="flex flex-col gap-1">
          {proposals.map((proposal) => (
            <div
              key={proposal.id}
              className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span>
                  {new Date(proposal.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={proposal.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
