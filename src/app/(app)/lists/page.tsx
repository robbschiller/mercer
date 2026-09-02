import Link from "next/link";
import { ClipboardList, Upload } from "lucide-react";
import { getLists } from "@/lib/store";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Lists (Jordan 2026-09-02): "just raw CSV of people ... unrelated object to
 * anything else, lives on its own." Nobody here is a lead until converted.
 */
export default async function ListsPage() {
  const lists = await getLists();

  return (
    <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-24 pt-7">
      <header className="mb-5 flex flex-wrap items-end gap-5">
        <div>
          <p className="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
            <ClipboardList className="size-3.5" />
            Raw people, untouched
          </p>
          <h1 className="text-[27px] font-semibold leading-tight tracking-tight">
            Lists
          </h1>
          <p className="mt-1 max-w-[640px] text-[13.5px] text-muted-foreground">
            A list is a CSV exactly as it arrived — trade-show attendees, a
            purchased roster. Nobody on it is a lead until you convert them.
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href="/lists/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-foreground bg-foreground px-3.5 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
          >
            <Upload className="size-3.5" />
            Import list
          </Link>
        </div>
      </header>

      {lists.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border bg-card px-8 py-14 text-center shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <span className="mb-5 flex size-[54px] items-center justify-center rounded-2xl bg-muted text-foreground/60">
            <ClipboardList className="size-6" />
          </span>
          <h3 className="mb-2 text-xl font-semibold tracking-tight">
            No lists yet
          </h3>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Upload a CSV of people. It stays here as a list, and you convert
            the ones with real work into leads one at a time.
          </p>
          <Link
            href="/lists/new"
            className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3.5 text-[13px] font-medium transition-colors hover:bg-muted"
          >
            Import a list
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                <th className="px-4 py-3">List</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">People</th>
                <th className="px-4 py-3 text-right">Converted</th>
                <th className="px-4 py-3 text-right">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {lists.map((l) => (
                <tr
                  key={l.id}
                  className="border-b last:border-b-0 transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/lists/${l.id}`}
                      className="font-semibold tracking-tight hover:underline"
                    >
                      {l.name}
                    </Link>
                    {l.fileName && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {l.fileName}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {l.sourceTag ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {l.rowCount}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {l.convertedCount}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {fmtDate(l.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
