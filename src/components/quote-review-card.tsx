"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  Lock,
  Paintbrush,
  Droplets,
  Hammer,
  Wrench,
  Layers,
  Fence,
  PenLine,
  PanelTop,
  ArrowUpDown,
  Package,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createQuoteLineAction,
  deleteLineItemAction,
  updateQuoteLineAction,
} from "@/lib/actions";
import { formatCurrency } from "@/lib/pricing";
import {
  PRICE_LIST_CATEGORIES,
  priceListCategoryLabel,
} from "@/lib/status-meta";
import type { LineItem, Photo } from "@/lib/store";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  painting: Paintbrush,
  pressure_washing: Droplets,
  wood_repair: Hammer,
  stucco: Wrench,
  stair_systems: Layers,
  railings: Fence,
  caulking: PenLine,
  gutters: PanelTop,
  access: ArrowUpDown,
  other: Package,
  __manual: Plus,
};

const fmtQty = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function lineGroups(items: LineItem[]) {
  const groups: { key: string; label: string; items: LineItem[] }[] = [];
  for (const cat of PRICE_LIST_CATEGORIES) {
    const inCat = items.filter(
      (li) => (li.category ?? "other") === cat && li.source !== "manual",
    );
    if (inCat.length > 0) {
      groups.push({ key: cat, label: priceListCategoryLabel(cat), items: inCat });
    }
  }
  const manual = items.filter((li) => li.source === "manual");
  if (manual.length > 0) {
    groups.push({ key: "__manual", label: "Added by you", items: manual });
  }
  return groups;
}

/** Click-to-edit cell: button → input, commit on blur/Enter, Escape cancels. */
function EditableCell({
  value,
  display,
  onCommit,
  align = "right",
  className,
}: {
  value: string;
  display: React.ReactNode;
  onCommit: (next: string) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        className={cn(
          "h-7 w-full rounded-md border border-input bg-transparent px-1.5 text-sm tabular-nums shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          align === "right" ? "text-right" : "text-left",
          className,
        )}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => {
          setEditing(false);
          if (draft.trim() && draft !== value) onCommit(draft.trim());
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
      />
    );
  }
  return (
    <button
      type="button"
      className={cn(
        "group/cell inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 hover:bg-accent",
        align === "right" ? "justify-end text-right" : "justify-start text-left",
        className,
      )}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="Click to edit"
    >
      <Pencil className="size-2.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/cell:opacity-100" />
      <span className="truncate">{display}</span>
    </button>
  );
}

function EvidenceDrawer({ line, photo }: { line: LineItem; photo: Photo | null }) {
  return (
    <div className="mx-4 mb-3 flex gap-3 rounded-lg border bg-muted/40 p-3 sm:mx-12">
      {photo && (
        <a
          href={photo.url}
          target="_blank"
          rel="noreferrer"
          className="relative block h-20 w-28 shrink-0 overflow-hidden rounded-md border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- remote supabase URL, thumbnail only */}
          <img
            src={photo.url}
            alt={photo.caption ?? "Evidence photo"}
            className="h-full w-full object-cover"
          />
        </a>
      )}
      <div className="min-w-0 text-xs leading-relaxed">
        {line.flagNote && (
          <p className="mb-1 flex items-start gap-1.5 font-medium text-amber-700 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 size-3 shrink-0" />
            {line.flagNote}
          </p>
        )}
        {line.aiRationale && (
          <p className="text-muted-foreground">{line.aiRationale}</p>
        )}
        {photo?.caption && (
          <p className="mt-1 text-muted-foreground">Photo: {photo.caption}</p>
        )}
        {line.sku && (
          <p className="mt-1 text-muted-foreground">
            Priced from SKU <span className="font-medium">{line.sku}</span>
          </p>
        )}
        {!line.flagNote && !line.aiRationale && !line.sku && (
          <p className="text-muted-foreground">No evidence recorded.</p>
        )}
      </div>
    </div>
  );
}

function LineRow({
  line,
  photo,
  expanded,
  onToggle,
  onEdit,
  onRemove,
}: {
  line: LineItem;
  photo: Photo | null;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (
    patch: { name?: string; qty?: number; unitPrice?: number },
  ) => void;
  onRemove: () => void;
}) {
  const flagged = line.confidence === "low";
  const hasEvidence = Boolean(photo || line.flagNote || line.aiRationale);
  const qty = line.qty != null ? Number(line.qty) : null;
  const unitPrice = line.unitPrice != null ? Number(line.unitPrice) : null;
  const amount = Number(line.amount);

  return (
    <>
      <div
        className={cn(
          "group grid grid-cols-[1fr_auto] items-start gap-x-3 border-t px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_6rem_2rem]",
          flagged && "bg-amber-500/[0.04]",
        )}
      >
        {/* description */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                flagged ? "bg-amber-500" : "bg-emerald-500/70",
              )}
              title={flagged ? "Low confidence — verify" : "High confidence"}
            />
            <EditableCell
              align="left"
              className="text-sm font-medium"
              value={line.name}
              display={line.name}
              onCommit={(v) => onEdit({ name: v })}
            />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 pl-3.5">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <ClipboardList className="size-3" />
              {line.sku ?? "manual"}
            </span>
            {flagged && line.flagNote && (
              <button
                type="button"
                onClick={onToggle}
                className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-px text-[11px] font-medium text-amber-700 dark:text-amber-400"
              >
                <TriangleAlert className="size-2.5" />
                Verify
              </button>
            )}
            {hasEvidence && (
              <button
                type="button"
                onClick={onToggle}
                className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
              >
                {expanded ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
                {expanded ? "Hide" : "Why"}
              </button>
            )}
          </div>
        </div>

        {/* qty + unit */}
        <div className="hidden text-right sm:block">
          {qty != null ? (
            <>
              <EditableCell
                className="text-sm tabular-nums"
                value={String(qty)}
                display={fmtQty.format(qty)}
                onCommit={(v) => {
                  const n = parseFloat(v.replace(/[^0-9.]/g, ""));
                  if (Number.isFinite(n) && n >= 0) onEdit({ qty: n });
                }}
              />
              <div className="pr-1 text-[11px] text-muted-foreground">
                {line.unit ?? ""}
              </div>
            </>
          ) : (
            <span className="pr-1 text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* unit price */}
        <div className="hidden text-right sm:block">
          {unitPrice != null ? (
            <EditableCell
              className="text-sm tabular-nums"
              value={String(unitPrice)}
              display={`$${fmtQty.format(unitPrice)}`}
              onCommit={(v) => {
                const n = parseFloat(v.replace(/[^0-9.]/g, ""));
                if (Number.isFinite(n) && n >= 0) onEdit({ unitPrice: n });
              }}
            />
          ) : (
            <span className="pr-1 text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* total */}
        <div className="pt-0.5 text-right text-sm font-medium tabular-nums">
          {formatCurrency(amount)}
        </div>

        {/* remove */}
        <div className="hidden justify-end sm:flex">
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-destructive group-hover:opacity-100"
            title="Remove line"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      {expanded && hasEvidence && <EvidenceDrawer line={line} photo={photo} />}
    </>
  );
}

export function QuoteReviewCard({
  bidId,
  items,
  photos,
  nextVersion,
  onApprove,
  approving,
  error,
}: {
  bidId: string;
  items: LineItem[];
  photos: Photo[];
  nextVersion: number;
  onApprove: () => void;
  approving: boolean;
  error: string | null;
}) {
  // Local mirror for optimistic edits; server refresh re-syncs via props.
  const [lines, setLines] = useState(items);
  useEffect(() => setLines(items), [items]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);

  const photosById = useMemo(
    () => new Map(photos.map((p) => [p.id, p])),
    [photos],
  );
  const groups = useMemo(() => lineGroups(lines), [lines]);
  const subtotal = lines.reduce((s, li) => s + Number(li.amount), 0);
  const flagged = lines.filter((li) => li.confidence === "low").length;

  const editLine = (
    line: LineItem,
    patch: { name?: string; qty?: number; unitPrice?: number },
  ) => {
    // Optimistic local update
    setLines((xs) =>
      xs.map((x) => {
        if (x.id !== line.id) return x;
        const next = { ...x };
        if (patch.name !== undefined) next.name = patch.name;
        const qty = patch.qty ?? (x.qty != null ? Number(x.qty) : null);
        const unitPrice =
          patch.unitPrice ?? (x.unitPrice != null ? Number(x.unitPrice) : null);
        if (
          (patch.qty !== undefined || patch.unitPrice !== undefined) &&
          qty != null &&
          unitPrice != null
        ) {
          next.qty = String(qty);
          next.unitPrice = String(unitPrice);
          next.amount = String(qty * unitPrice);
          next.confidence = "high";
          next.flagNote = null;
        }
        return next;
      }),
    );
    // Persist: qty/unitPrice travel together so the server recomputes amount
    const qty = patch.qty ?? (line.qty != null ? Number(line.qty) : undefined);
    const unitPrice =
      patch.unitPrice ??
      (line.unitPrice != null ? Number(line.unitPrice) : undefined);
    const sendPrice = patch.qty !== undefined || patch.unitPrice !== undefined;
    startTransition(async () => {
      await updateQuoteLineAction({
        id: line.id,
        bidId,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(sendPrice && qty !== undefined && unitPrice !== undefined
          ? { qty, unitPrice }
          : {}),
      });
    });
  };

  const removeLine = (line: LineItem) => {
    setLines((xs) => xs.filter((x) => x.id !== line.id));
    startTransition(async () => {
      await deleteLineItemAction({ id: line.id, bidId });
    });
  };

  const addManual = () => {
    setAdding(true);
    startTransition(async () => {
      await createQuoteLineAction({ bidId });
      setAdding(false);
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between space-y-0 border-b py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <CardTitle className="text-base">Proposed line items</CardTitle>
            <Badge variant="outline">Draft v{nextVersion}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {lines.length} lines across {groups.length} categories
            {flagged > 0 && (
              <span>
                {" · "}
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  {flagged} to verify
                </span>
              </span>
            )}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={addManual} disabled={adding}>
          {adding ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Add line
        </Button>
      </CardHeader>

      {/* column headers */}
      <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_6rem_2rem] gap-x-3 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
        <span>Line item</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Unit price</span>
        <span className="text-right">Total</span>
        <span />
      </div>

      <div className="max-h-[480px] overflow-y-auto">
        {groups.map((g) => {
          const Icon = CATEGORY_ICONS[g.key] ?? Package;
          const groupTotal = g.items.reduce((s, li) => s + Number(li.amount), 0);
          return (
            <div key={g.key}>
              <div className="flex items-center gap-2 border-t bg-muted/50 px-4 py-1.5">
                <span className="flex size-5 items-center justify-center rounded border bg-background text-muted-foreground">
                  <Icon className="size-3" />
                </span>
                <span className="text-xs font-semibold">{g.label}</span>
                <span className="text-[11px] text-muted-foreground">
                  · {g.items.length} line{g.items.length !== 1 ? "s" : ""}
                </span>
                <span className="ml-auto text-xs font-medium tabular-nums">
                  {formatCurrency(groupTotal)}
                </span>
              </div>
              {g.items.map((line) => (
                <LineRow
                  key={line.id}
                  line={line}
                  photo={
                    line.evidencePhotoId
                      ? (photosById.get(line.evidencePhotoId) ?? null)
                      : null
                  }
                  expanded={Boolean(expanded[line.id])}
                  onToggle={() =>
                    setExpanded((e) => ({ ...e, [line.id]: !e[line.id] }))
                  }
                  onEdit={(patch) => editLine(line, patch)}
                  onRemove={() => removeLine(line)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* sticky action footer */}
      <div className="flex items-center gap-4 border-t bg-muted/30 px-4 py-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Subtotal
          </div>
          <div className="text-lg font-bold tracking-tight tabular-nums">
            {formatCurrency(subtotal)}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {error && (
            <span className="max-w-xs text-xs text-destructive">{error}</span>
          )}
          {flagged > 0 && (
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
              <TriangleAlert className="size-3.5 text-amber-500" />
              {flagged} flagged
            </span>
          )}
          <Button onClick={onApprove} disabled={approving || lines.length === 0}>
            {approving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Lock className="size-4" />
            )}
            Approve &amp; generate quote (v{nextVersion})
          </Button>
        </div>
      </div>
    </Card>
  );
}
