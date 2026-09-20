import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, Check, Users } from "lucide-react";
import { getList, getListRows } from "@/lib/store";
import { DeleteListButton } from "@/components/delete-list-button";
import { ListRowContactCell } from "@/components/list-row-contact-cell";
import {
  EmptyState,
  PageContainer,
  PageError,
  PageHeader,
  PageNotice,
  Pagination,
  ResultSummary,
  SearchForm,
  TABLE_HEAD_ROW,
  TableFrame,
  Toolbar,
} from "@/components/chrome";
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
  searchParams: Promise<{
    q?: string;
    page?: string;
    imported?: string;
    error?: string;
  }>;
}) {
  const [{ id }, { q, page: pageParam, imported, error }] = await Promise.all([
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
  const mapped = Object.entries(list.mapping ?? {}).filter(
    ([, header]) => header,
  );

  const pageHref = (p: number) =>
    `/lists/${id}?${new URLSearchParams({
      ...(q ? { q } : {}),
      ...(p > 1 ? { page: String(p) } : {}),
    }).toString()}`;

  const rangeStart = rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = (page - 1) * PAGE_SIZE + rows.length;

  return (
    <PageContainer>
      <PageHeader
        back={{ href: "/lists", label: "Lists" }}
        title={list.name}
        description={
          <>
            <b className="font-semibold text-foreground/80">{list.rowCount}</b>{" "}
            people ·{" "}
            <b className="font-semibold text-foreground/80">{convertedCount}</b>{" "}
            converted
            {list.sourceTag && <> · source “{list.sourceTag}”</>}
            {" · "}uploaded {fmtDate(list.createdAt)}
            {list.fileName && <> from {list.fileName}</>}
          </>
        }
        actions={<DeleteListButton id={list.id} name={list.name} />}
      />

      {imported && (
        <PageNotice>
          Imported {imported} {imported === "1" ? "person" : "people"}. They
          live here until you convert them.
        </PageNotice>
      )}
      <PageError message={error} />

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

      <Toolbar
        summary={
          <ResultSummary
            start={rangeStart}
            end={rangeEnd}
            total={total}
            noun="people"
          />
        }
      >
        <SearchForm
          action={`/lists/${id}`}
          q={q ?? ""}
          placeholder="Search people, accounts, properties…"
        />
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={q ? `Nobody matches “${q}”` : "This list is empty"}
          description={
            q
              ? "Try a different name, account, or property."
              : "Every row from the upload lands here. Nothing to show yet."
          }
        />
      ) : (
        <TableFrame minWidth="min-w-[1040px]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={TABLE_HEAD_ROW}>
                <th className="px-4 py-2.5 font-semibold">Person</th>
                <th className="px-4 py-2.5 font-semibold">Account</th>
                <th className="px-4 py-2.5 font-semibold">Property</th>
                <th className="px-4 py-2.5 font-semibold">Last contact</th>
                <th className="px-4 py-2.5 text-right font-semibold">Lead</th>
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
                      converted ? "bg-muted/20" : "hover:bg-muted/20",
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
                    <td className="px-4 py-2 align-top">
                      <ListRowContactCell
                        rowId={r.id}
                        lastContactedAt={r.lastContactedAt?.toISOString() ?? null}
                        attempts={r.contactAttempts}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right align-top">
                      {converted ? (
                        <Link
                          href={`/leads/${r.convertedLeadId}`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium text-success-foreground hover:bg-success-soft"
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
        </TableFrame>
      )}

      <Pagination page={page} limit={PAGE_SIZE} total={total} hrefFor={pageHref} />
    </PageContainer>
  );
}
