"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  updateLineItemAction,
  deleteLineItemAction,
} from "@/lib/actions";
import { formatCurrency } from "@/lib/pricing";
import type { LineItem } from "@/lib/store";

export function LineItemRow({
  item,
  bidId,
}: {
  item: LineItem;
  bidId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(item.amount);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    function handleSave() {
      startTransition(async () => {
        await updateLineItemAction({
          id: item.id,
          bidId,
          name,
          amount,
        });
        setEditing(false);
      });
    }

    return (
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
          autoFocus
        />
        <Input
          type="number"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <Button size="sm" onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setName(item.name);
            setAmount(item.amount);
            setEditing(false);
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between group">
      <span className="text-sm">{item.name}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm tabular-nums">
          {formatCurrency(Number(item.amount))}
        </span>
        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() =>
              startTransition(async () => {
                await deleteLineItemAction({ id: item.id, bidId });
              })
            }
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
