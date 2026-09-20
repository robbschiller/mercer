import Link from "next/link";

const PAGE_BUTTON =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground/25 hover:bg-muted/40";
const PAGE_BUTTON_OFF =
  "inline-flex h-8 items-center rounded-lg border bg-muted/30 px-3 text-xs font-medium text-muted-foreground/50";

export function Pagination({
  page,
  limit,
  total,
  hrefFor,
}: {
  page: number;
  limit: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  if (total <= limit) return null;
  const offset = (page - 1) * limit;
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center gap-3">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={PAGE_BUTTON}>
          ‹ Prev
        </Link>
      ) : (
        <span aria-disabled className={PAGE_BUTTON_OFF}>
          ‹ Prev
        </span>
      )}
      <span className="text-xs tabular-nums text-muted-foreground">
        Page <b className="font-semibold text-foreground/80">{page}</b> of{" "}
        {pages}
      </span>
      {end < total ? (
        <Link href={hrefFor(page + 1)} className={PAGE_BUTTON}>
          Next ›
        </Link>
      ) : (
        <span aria-disabled className={PAGE_BUTTON_OFF}>
          Next ›
        </span>
      )}
      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
        {start}–{end} of {total}
      </span>
    </nav>
  );
}
