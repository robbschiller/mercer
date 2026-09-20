import Link from "next/link";
import { ClipboardList, Upload } from "lucide-react";
import { getLists } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageContainer,
  PageHeader,
  ResultSummary,
  SearchForm,
  SortableHeader,
  type SortDirection,
  TABLE_HEAD_ROW,
  TableControls,
  TableFrame,
} from "@/components/chrome";

type ListRow = Awaited<ReturnType<typeof getLists>>[number];

const LIST_SORTS = ["recent", "name", "people", "converted"] as const;
type ListSort = (typeof LIST_SORTS)[number];

function parseSort(raw: string | undefined): ListSort {
  const v = raw?.trim();
  return (LIST_SORTS as readonly string[]).includes(v ?? "")
    ? (v as ListSort)
    : "recent";
}

function listsHref(patch: { q?: string; sort?: ListSort }): string {
  const sp = new URLSearchParams();
  if (patch.q) sp.set("q", patch.q);
  if (patch.sort && patch.sort !== "recent") sp.set("sort", patch.sort);
  const s = sp.toString();
  return s ? `/lists?${s}` : "/lists";
}

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
export default async function ListsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const sort = parseSort(params.sort);

  const all = await getLists();

  const needle = q.toLowerCase();
  const filtered = needle
    ? all.filter((l: ListRow) =>
        [l.name, l.fileName, l.sourceTag].some((v) =>
          v?.toLowerCase().includes(needle),
        ),
      )
    : all;

  const lists = [...filtered].sort((a: ListRow, b: ListRow) => {
    switch (sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "people":
        return b.rowCount - a.rowCount;
      case "converted":
        return b.convertedCount - a.convertedCount;
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  return (
    <PageContainer>
      <PageHeader
        eyebrow={{ icon: <ClipboardList className="size-3.5" />, label: "Prospecting" }}
        title="Lists"
        description="A list is a CSV exactly as it arrived — trade-show attendees, a purchased roster. Nobody on it is a lead until you convert them."
        actions={
          <Button asChild>
            <Link href="/lists/new">
              <Upload className="size-4" />
              Import list
            </Link>
          </Button>
        }
      />

      {all.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="No lists yet"
          description="Upload a CSV of people. It stays here as a list, and you convert the ones with real work into leads one at a time."
          actions={
            <Button asChild>
              <Link href="/lists/new">
                <Upload className="size-4" />
                Import list
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <TableControls
            summary={
              <ResultSummary
                start={lists.length === 0 ? 0 : 1}
                end={lists.length}
                total={lists.length}
                noun="lists"
              />
            }
          >
            <SearchForm
              action="/lists"
              q={q}
              placeholder="Search lists…"
              hidden={{ sort: sort !== "recent" ? sort : null }}
            />
          </TableControls>
          {lists.length === 0 ? (
            <EmptyState
              icon={<ClipboardList />}
              title={`No lists match “${q}”`}
              description="Try a different name, file name or source tag."
              actions={
                <Button variant="outline" asChild>
                  <Link href="/lists">Clear search</Link>
                </Button>
              }
            />
          ) : (
          <TableFrame>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <ListHead q={q} sort={sort} label="List" to="name" dir="asc" />
                  <th className="px-4 py-2.5 font-semibold">Source</th>
                  <ListHead
                    q={q}
                    sort={sort}
                    label="People"
                    to="people"
                    dir="desc"
                    align="right"
                  />
                  <ListHead
                    q={q}
                    sort={sort}
                    label="Converted"
                    to="converted"
                    dir="desc"
                    align="right"
                  />
                  <ListHead
                    q={q}
                    sort={sort}
                    label="Uploaded"
                    to="recent"
                    dir="desc"
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {lists.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b last:border-b-0 transition-colors hover:bg-muted/20"
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
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                      {l.rowCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                      {l.convertedCount}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {fmtDate(l.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
          )}
        </>
      )}
    </PageContainer>
  );
}

/**
 * A lists column header. The `<th>` carries `aria-sort` (valid here because
 * this is a real `<table>`), the link carries the arrow and the click.
 */
function ListHead({
  q,
  sort,
  label,
  to,
  dir,
  align = "left",
}: {
  q: string;
  sort: ListSort;
  label: string;
  to: ListSort;
  dir: SortDirection;
  align?: "left" | "right";
}) {
  const active = sort === to;
  return (
    <th
      aria-sort={
        active ? (dir === "asc" ? "ascending" : "descending") : "none"
      }
      className={`px-4 py-2.5 font-semibold ${align === "right" ? "text-right" : ""}`}
    >
      <SortableHeader
        label={label}
        href={listsHref({ q, sort: to })}
        direction={active ? dir : null}
        align={align}
      />
    </th>
  );
}
