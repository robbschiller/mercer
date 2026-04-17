"use client";

import { useState, useTransition } from "react";
import {
  acceptProposalShareAction,
  declineProposalShareAction,
} from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function PublicProposalResponse({
  slug,
  isAccepted,
  isDeclined,
  acceptedByName,
  acceptedByTitle,
  declineReason,
}: {
  slug: string;
  isAccepted: boolean;
  isDeclined: boolean;
  acceptedByName: string | null;
  acceptedByTitle: string | null;
  declineReason: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [accepted, setAccepted] = useState(isAccepted);
  const [declined, setDeclined] = useState(isDeclined);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");

  function onAccept() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("slug", slug);
      fd.set("acceptedByName", name);
      fd.set("acceptedByTitle", title);
      const result = await acceptProposalShareAction(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setAccepted(true);
      setDeclined(false);
    });
  }

  function onDecline() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("slug", slug);
      fd.set("reason", reason);
      const result = await declineProposalShareAction(fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDeclined(true);
      setAccepted(false);
    });
  }

  if (accepted) {
    return (
      <p className="text-sm text-emerald-700">
        Proposal accepted
        {acceptedByName ? ` by ${acceptedByName}` : ""}.
        {acceptedByTitle ? ` (${acceptedByTitle})` : ""}
      </p>
    );
  }

  if (declined) {
    return (
      <p className="text-sm text-destructive">
        Proposal declined{declineReason ? `: ${declineReason}` : "."}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
        />
        <Input
          placeholder="Title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onAccept} disabled={isPending || name.trim().length === 0}>
          Accept proposal
        </Button>
      </div>

      <div className="space-y-2 border-t pt-4">
        <p className="text-xs text-muted-foreground">Not ready to proceed?</p>
        <Textarea
          placeholder="Optional decline reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isPending}
        />
        <Button variant="outline" onClick={onDecline} disabled={isPending}>
          Decline
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
