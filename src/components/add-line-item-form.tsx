"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createLineItemAction } from "@/lib/actions";

export function AddLineItemForm({ bidId }: { bidId: string }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!adding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => setAdding(true)}
      >
        <Plus className="h-4 w-4" />
        Add line item
      </Button>
    );
  }

  function handleSubmit() {
    if (!name.trim() || !amount.trim()) return;

    startTransition(async () => {
      await createLineItemAction({
        bidId,
        name: name.trim(),
        amount,
      });
      setName("");
      setAmount("");
      setAdding(false);
    });
  }

  return (
    <div className="flex items-end gap-2">
      <Input
        placeholder="Description"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1"
        autoFocus
      />
      <Input
        type="number"
        step="any"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-28"
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={isPending || !name.trim() || !amount.trim()}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setAdding(false)}
        disabled={isPending}
      >
        Cancel
      </Button>
    </div>
  );
}
