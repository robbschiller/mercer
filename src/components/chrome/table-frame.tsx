import { cn } from "@/lib/utils";

/** Rounded card that wraps a table or a grid list; scrolls sideways. */
export function TableFrame({
  minWidth,
  children,
}: {
  /** Tailwind min-w-* class for the inner scroll surface. */
  minWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-card border bg-card shadow-card">
      <div className={minWidth}>{children}</div>
    </div>
  );
}

export const TABLE_HEAD_CELL =
  "text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground";

/** `<thead>` row styling for classic `<table>` layouts. */
export const TABLE_HEAD_ROW = cn("border-b bg-muted/30", TABLE_HEAD_CELL);
