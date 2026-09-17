import Link from "next/link";
import { ClipboardList, Upload } from "lucide-react";
import { getLists } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  PageContainer,
  PageHeader,
  ResultSummary,
  TABLE_HEAD_ROW,
  TableFrame,
  Toolbar,
} from "@/components/page-chrome";

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

      {lists.length === 0 ? (
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
          <Toolbar
            summary={
              <ResultSummary
                start={1}
                end={lists.length}
                total={lists.length}
                noun="lists"
              />
            }
          />
          <TableFrame>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={TABLE_HEAD_ROW}>
                  <th className="px-4 py-2.5 font-semibold">List</th>
                  <th className="px-4 py-2.5 font-semibold">Source</th>
                  <th className="px-4 py-2.5 text-right font-semibold">People</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Converted</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Uploaded</th>
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
        </>
      )}
    </PageContainer>
  );
}
