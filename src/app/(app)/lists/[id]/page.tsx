import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ClipboardList,
  Search,
} from "lucide-react";
import { getList, getListRows } from "@/lib/store";
import { DeleteListButton } from "@/components/delete-list-button";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 200;

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  propertyName: "Property",
  address: "Address",
  address2: "Address 2",
  city: "City",
  state: "State",
  zip: "Zip",
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ListDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string; imported?: string }>;
}) {
  const [{ id }, { q, page: pageParam, imported }] = await Promise.all([
    params,
    searchParams,
  ]);
  const list = await getList(id);
  if (!list) notFound();

  const page = Math.max(1, Number(pageParam) || 1);
  const { rows, total, convertedCount } = await getListRows(id, {
    q: q ?? null,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const mapped = Object.entries(list.mapping ?? {}).filter(
    ([, header]) => header,
  );

  const pageHref = (p: number) =>
    `/lists/${id}?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(p > 1 ? { page: String(p) } : {}),
    }).toString()}`;

  return (
    <div className="relative mx-auto w-full max-w-[1240px] px-6 pb-24 pt-7">
      <div className="mb-4">
        <Link
          href="/lists"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Lists
        </Link>
      </div>

      <header className="mb-5 flex flex-wrap items-end gap-5">
        <div className="min-w-0">
          <p className="mb-2.5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.05em] text-muted-foreground">
            <ClipboardList className="size-3.5" />
            List
          </p>
          <h1 className="text-[27px] font-semibold leading-tight tracking-tight">
            {list.name}
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            <b className="font-semibold text-foreground/80">{list.rowCount}</b>{" "}
            people ·{" "}
            <b className="font-semibold text-foreground/80">{convertedCount}</b>{" "}
            converted
            {list.sourceTag && <> · source “{list.sourceTag}”</>}
            {" · "}uploaded {fmtDate(list.createdAt)}
            {list.fileName && <> from {list.fileName}</>}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <DeleteListButton id={list.id} name={list.name} />
        </div>
      </header>

      {imported && (
        <div className="mb-4 rounded-xl border border-emerald-600/30 bg-emerald-600/5 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          Imported {imported} {imported === "1" ? "person" : "people"}. They
          live here until you convert them.
        </div>
      )}

      {mapped.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="mr-1 font-medium">Columns read:</span>
          {mapped.map(([field, header]) => (
            <span
              key={field}
              className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5"
            >
              <span className="font-medium text-foreground/80">
                {FIELD_LABELS[field] ?? field}
              </span>
              <span className="text-muted-foreground/70">←</span>
              <span className="font-mono">{header}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form action={`/lists/${id}`} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search people, companies, properties…"
            className="h-9 w-72 rounded-[10px] border bg-card pl-9 pr-3 text-[13.5px] outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-foreground/30"
          />
        </form>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {q ? (
            <>
              <b className="font-semibold text-foreground/80">{total}</b> match
              {total === 1 ? "" : "es"}
            </>
          ) : (
            <>
              page <b className="font-semibold text-foreground/80">{page}</b> of{" "}
              {pages}
            </>
          )}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-card px-8 py-12 text-center text-sm text-muted-foreground">
          {q ? `Nobody matches “${q}”.` : "This list is empty."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3 text-right">Lead</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const converted = r.convertedLeadId != null;
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b last:border-b-0 transition-colors",
                      converted ? "bg-muted/20" : "hover:bg-muted/30",
                    )}
                  >
                    <td className="px-4 py-2.5 align-top">
                      <span className="font-semibold tracking-tight">
                        {r.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {[r.email, r.phone].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 align-top text-muted-foreground">
                      {r.company ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <span className="text-foreground/90">
                        {r.propertyName ?? "—"}
                      </span>
                      {r.address && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {r.address}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right align-top">
                      {converted ? (
                        <Link
                          href={`/leads/${r.convertedLeadId}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium text-emerald-700 hover:bg-emerald-600/10 dark:text-emerald-400"
                        >
                          <Check className="size-3.5" />
                          Converted
                          {r.convertedAt && (
                            <span className="text-muted-foreground">
                              {fmtDate(r.convertedAt)}
                            </span>
                          )}
                          <ArrowUpRight className="size-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href={`/leads/new?listRow=${r.id}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-[12.5px] font-medium transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
                        >
                          Convert
                          <ArrowRight className="size-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link
              href={pageHref(page - 1)}
              className="rounded-lg border bg-card px-3 py-1.5 hover:bg-muted"
            >
              ← Previous
            </Link>
          )}
          <span className="text-muted-foreground">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link
              href={pageHref(page + 1)}
              className="rounded-lg border bg-card px-3 py-1.5 hover:bg-muted"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
