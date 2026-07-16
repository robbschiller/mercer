"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import {
  createAccessItemAction,
  updateAccessItemAction,
  deleteAccessItemAction,
} from "@/lib/actions";
import { formatCurrency } from "@/lib/pricing";
import { ACCESS_TYPES, accessTypeLabel } from "@/lib/status-meta";
import type { AccessItem } from "@/lib/store";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function AccessItemsSection({
  bidId,
  items,
}: {
  bidId: string;
  items: AccessItem[];
}) {
  const total = items.reduce((sum, a) => sum + Number(a.amount), 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Lifts, scaffold, swing stage, and safety — how crews reach the surfaces.
        Cost scales by height and building type, not square footage, and is
        included in the quote total.
      </p>
      {items.length > 0 && (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <AccessItemRow key={item.id} item={item} bidId={bidId} />
          ))}
          <div className="flex items-center justify-between border-t pt-2 text-sm font-medium">
            <span>Access total</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>
      )}
      <AddAccessItemForm bidId={bidId} />
    </div>
  );
}

function AccessItemRow({ item, bidId }: { item: AccessItem; bidId: string }) {
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState(item.type);
  const [method, setMethod] = useState(item.method ?? "");
  const [amount, setAmount] = useState(item.amount);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    const handleSave = () => {
      startTransition(async () => {
        await updateAccessItemAction({
          id: item.id,
          bidId,
          type,
          method: method.trim() || null,
          amount,
        });
        setEditing(false);
      });
    };

    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AccessItem["type"])}
            className={selectClass}
          >
            {ACCESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {accessTypeLabel(t)}
              </option>
            ))}
          </select>
          <Input
            placeholder="Method (e.g. 7-story swing stage)"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="flex-1 min-w-40"
          />
          <Input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setType(item.type);
              setMethod(item.method ?? "");
              setAmount(item.amount);
              setEditing(false);
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between group">
      <span className="text-sm">
        {accessTypeLabel(item.type)}
        {item.method ? (
          <span className="text-muted-foreground"> · {item.method}</span>
        ) : null}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-sm tabular-nums">
          {formatCurrency(Number(item.amount))}
        </span>
        <div className="flex sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 sm:h-7 sm:w-7"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <DeleteConfirmDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 sm:h-7 sm:w-7 text-destructive"
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            }
            title={`Delete "${accessTypeLabel(item.type)}"?`}
            description="This cannot be undone."
            onConfirm={() =>
              startTransition(async () => {
                await deleteAccessItemAction({ id: item.id, bidId });
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

function AddAccessItemForm({ bidId }: { bidId: string }) {
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<AccessItem["type"]>("swing_stage");
  const [method, setMethod] = useState("");
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
        Add access item
      </Button>
    );
  }

  const handleSubmit = () => {
    if (!amount.trim()) return;
    startTransition(async () => {
      await createAccessItemAction({
        bidId,
        type,
        method: method.trim() || null,
        amount,
      });
      setType("swing_stage");
      setMethod("");
      setAmount("");
      setAdding(false);
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as AccessItem["type"])}
        className={selectClass}
      >
        {ACCESS_TYPES.map((t) => (
          <option key={t} value={t}>
            {accessTypeLabel(t)}
          </option>
        ))}
      </select>
      <Input
        placeholder="Method (optional)"
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        className="flex-1 min-w-40"
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
        disabled={isPending || !amount.trim()}
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
