"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { deleteBidAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import type { Bid } from "@/lib/store";

export function DeleteBidButton({ bid }: { bid: Bid }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", bid.id);
      await deleteBidAction(formData);
    });
  };

  return (
    <DeleteConfirmDialog
      trigger={
        <Button variant="destructive" size="sm" disabled={isPending}>
          {isPending && <Loader2 className="animate-spin" />}
          Delete
        </Button>
      }
      title={`Delete "${bid.propertyName}"?`}
      description="This will permanently delete the bid, all its buildings, surfaces, and proposals. This cannot be undone."
      onConfirm={handleDelete}
    />
  );
}
