"use client";

import { useState, useTransition } from "react";
import { FileText, Download, Loader2, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createProposalShareAction, generateProposalAction } from "@/lib/actions";
import type { Proposal, ProposalShare } from "@/lib/store";

export function ProposalList({
  proposals,
  proposalShares,
  bidId,
  pricingComplete,
  siteUrl,
}: {
  proposals: Proposal[];
  proposalShares: { proposalId: string; share: ProposalShare }[];
  bidId: string;
  pricingComplete: boolean;
  siteUrl: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareUrls, setShareUrls] = useState<Record<string, string>>({});

  function handleGenerate() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await generateProposalAction({ bidId });
      if (result.error) {
        setError(result.error);
        return;
      }
      // Stay on bid page and refresh so new proposal appears in list.
      router.refresh();
      setNotice("Proposal generated. Use Share or Download below.");
    });
  }

  function handleShare(proposalId: string, existingShareId?: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      if (existingShareId) {
        const existingUrl = `${siteUrl}/p/${existingShareId}`;
        setShareUrls((prev) => ({ ...prev, [proposalId]: existingUrl }));
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(existingUrl);
          setNotice("Share link copied to clipboard.");
        } else {
          setNotice("Share link ready to copy.");
        }
        return;
      }

      const result = await createProposalShareAction({ proposalId });
      if (result.error || !result.shareUrl) {
        setError(result.error ?? "Could not create share link");
        return;
      }
      setShareUrls((prev) => ({ ...prev, [proposalId]: result.shareUrl! }));
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.shareUrl);
        setNotice("Share link copied to clipboard.");
      } else {
        setNotice("Share link ready to copy.");
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button
          onClick={handleGenerate}
          disabled={isPending || !pricingComplete}
          size="sm"
          variant="amber"
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
      {notice && <p className="text-xs text-muted-foreground">{notice}</p>}

      {proposals.length > 0 && (
        <div className="flex flex-col gap-1">
          {proposals.map((proposal) => {
            const sharesForProposal = proposalShares.filter(
              (s) => s.proposalId === proposal.id
            );
            const existingShare = sharesForProposal[0];
            const shareStatus = existingShare?.share.acceptedAt
              ? "Accepted"
              : existingShare?.share.declinedAt
                ? "Declined"
                : existingShare
                  ? "Open"
                  : null;
            return (
              <div
                key={proposal.id}
                className="space-y-1.5 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
              >
              <div className="flex items-center justify-between gap-2">
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
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleShare(proposal.id, existingShare?.share.id)}
                    disabled={isPending}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {existingShare ? "Copy share link" : "Share"}
                  </Button>
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
              </div>

                {(shareUrls[proposal.id] || existingShare) && (
                  <div className="space-y-0.5">
                    <p className="truncate text-xs text-muted-foreground">
                      Share URL:{" "}
                      {shareUrls[proposal.id] ?? `${siteUrl}/p/${existingShare?.share.id}`}
                    </p>
                    {shareStatus && (
                      <p className="text-xs text-muted-foreground">
                        Status: {shareStatus}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
