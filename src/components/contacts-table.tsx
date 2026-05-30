"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type {
  ColumnSort,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { Building2, Briefcase, CalendarClock, Mail, Phone } from "lucide-react";
import type {
  ContactListRow,
  ContactsSort,
  LeadSourceOption,
} from "@/lib/store";
import { useDebounce } from "@/components/niko-table/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/niko-table/core/data-table";
import { DataTableRoot } from "@/components/niko-table/core/data-table-root";
import {
  DataTableBody,
  DataTableEmptyBody,
  DataTableHeader,
} from "@/components/niko-table/core/data-table-structure";
import { DataTableToolbarSection } from "@/components/niko-table/components/data-table-toolbar-section";
import { DataTableSearchFilter } from "@/components/niko-table/components/data-table-search-filter";
import { DataTableSortMenu } from "@/components/niko-table/components/data-table-sort-menu";
import { DataTableFilterMenu } from "@/components/niko-table/components/data-table-filter-menu";
import { DataTablePagination } from "@/components/niko-table/components/data-table-pagination";
import type {
  DataTableColumnDef,
  ExtendedColumnFilter,
} from "@/components/niko-table/types";
import {
  FILTER_OPERATORS,
  FILTER_VARIANTS,
  JOIN_OPERATORS,
} from "@/components/niko-table/lib/constants";

type ContactsTableQuery = {
  q: string;
  source: string | null;
  sort: ContactsSort | null;
  limit: number;
  page: number;
};

type ContactTableRow = ContactListRow & {
  href: string;
  accountHref: string | null;
  sourceTag: string | null;
  createdAt: Date;
};

function sortingStateFor(sort: ContactsTableQuery["sort"]): SortingState {
  switch (sort) {
    case "name":
      return [{ id: "name", desc: false }];
    case "recent":
    default:
      return [{ id: "createdAt", desc: true }];
  }
}

function sortParamFor(sorting: ColumnSort[] | null): ContactsSort | null {
  const first = sorting?.[0];
  if (!first) return null;
  if (first.id === "name") return "name";
  if (first.id === "createdAt") return "recent";
  return null;
}

function filterFor(value: string): ExtendedColumnFilter<ContactTableRow> {
  return {
    id: "sourceTag",
    value,
    variant: FILTER_VARIANTS.SELECT,
    operator: FILTER_OPERATORS.EQ,
    filterId: `sourceTag-eq-${value}`,
    joinOperator: JOIN_OPERATORS.AND,
  };
}

function filterValue(filters: ExtendedColumnFilter<ContactTableRow>[] | null) {
  const value = filters?.find((filter) => filter.id === "sourceTag")?.value;
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === "string" && value ? value : null;
}

function buildQueryString(
  query: ContactsTableQuery,
  overrides: Partial<ContactsTableQuery>,
) {
  const next = { ...query, ...overrides };
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.source) sp.set("source", next.source);
  if (next.sort) sp.set("sort", next.sort);
  if (next.limit !== 100) sp.set("limit", String(next.limit));
  if (next.page > 1) sp.set("page", String(next.page));
  return sp.toString();
}

function HeaderLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase text-muted-foreground">
      {children}
    </span>
  );
}

export function ContactsTable({
  contacts,
  query,
  total,
  page,
  sourceOptions,
}: {
  contacts: ContactTableRow[];
  query: ContactsTableQuery;
  total: number;
  page: number;
  sourceOptions: LeadSourceOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [localQ, setLocalQ] = useState(query.q);
  const debouncedQ = useDebounce(localQ, 300);
  const lastSyncedQRef = useRef(query.q);

  const sorting = useMemo(() => sortingStateFor(query.sort), [query.sort]);
  const filters = useMemo(
    () => (query.source ? [filterFor(query.source)] : []),
    [query.source],
  );
  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: page - 1,
      pageSize: query.limit,
    }),
    [page, query.limit],
  );
  const pageCount = Math.max(1, Math.ceil(total / query.limit));
  const pushQuery = (overrides: Partial<ContactsTableQuery>) => {
    const qs = buildQueryString(query, overrides);
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  };

  useEffect(() => {
    if (query.q === lastSyncedQRef.current) return;
    lastSyncedQRef.current = query.q;
    setLocalQ(query.q);
  }, [query.q]);

  useEffect(() => {
    const trimmed = debouncedQ.trim();
    if (trimmed === query.q) return;
    lastSyncedQRef.current = trimmed;
    pushQuery({ q: trimmed, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const columns = useMemo<DataTableColumnDef<ContactTableRow>[]>(
    () => [
      {
        id: "name",
        size: 260,
        enableSorting: true,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Contact</HeaderLabel>,
        accessorFn: (row) => row.contact.name,
        cell: ({ row }) => {
          const contact = row.original.contact;
          return (
            <div className="flex min-w-0 flex-col gap-1 py-1">
              <Link
                href={row.original.href}
                scroll={false}
                className="truncate font-medium text-foreground hover:underline"
              >
                {contact.name}
              </Link>
              {contact.title ? (
                <span className="truncate text-xs text-muted-foreground">
                  {contact.title}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "reach",
        size: 250,
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Reach</HeaderLabel>,
        cell: ({ row }) => {
          const { email, phone } = row.original.contact;
          return (
            <div className="flex min-w-0 flex-col gap-1 text-sm text-muted-foreground">
              {email ? (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex min-w-0 items-center gap-1.5 hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{email}</span>
                </a>
              ) : null}
              {phone ? (
                <a
                  href={`tel:${phone}`}
                  className="inline-flex min-w-0 items-center gap-1.5 hover:text-foreground"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{phone}</span>
                </a>
              ) : null}
              {!email && !phone ? <span>-</span> : null}
            </div>
          );
        },
      },
      {
        id: "account",
        size: 180,
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Management group</HeaderLabel>,
        cell: ({ row }) => {
          const { accountName, accountHref } = row.original;
          if (!accountName) {
            return <span className="text-muted-foreground">-</span>;
          }
          const content = (
            <>
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{accountName}</span>
            </>
          );
          return accountHref ? (
            <Link
              href={accountHref}
              scroll={false}
              className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline"
            >
              {content}
            </Link>
          ) : (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
              {content}
            </span>
          );
        },
      },
      {
        accessorKey: "propertyCount",
        size: 130,
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Properties</HeaderLabel>,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {row.original.propertyCount}
          </span>
        ),
      },
      {
        accessorKey: "leadCount",
        size: 110,
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Leads</HeaderLabel>,
        cell: ({ row }) =>
          row.original.leadCount > 0 ? (
            <Badge variant="secondary">{row.original.leadCount}</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        accessorKey: "nextFollowUpAt",
        size: 128,
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Follow-up</HeaderLabel>,
        cell: ({ row }) => {
          const value = row.original.nextFollowUpAt;
          return (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              {value ? formatDate(value) : "-"}
            </span>
          );
        },
      },
      {
        accessorKey: "sourceTag",
        enableColumnFilter: true,
        enableSorting: false,
        header: "Source",
        meta: {
          label: "Source",
          variant: FILTER_VARIANTS.SELECT,
          options: sourceOptions,
        },
      },
      {
        accessorKey: "createdAt",
        enableColumnFilter: false,
        enableSorting: true,
        header: "Created",
        meta: {
          label: "Created",
          variant: FILTER_VARIANTS.DATE,
        },
      },
    ],
    [sourceOptions],
  );

  return (
    <DataTableRoot
      className="flex min-h-0 flex-1 flex-col space-y-0"
      data={contacts}
      columns={columns}
      getRowId={(row) => row.contact.id}
      state={{
        sorting,
        columnFilters: filters.map((filter) => ({
          id: filter.id,
          value: filter,
        })),
        globalFilter: query.q,
        pagination,
        columnVisibility: {
          sourceTag: false,
          createdAt: false,
        },
        rowSelection: {},
      }}
      config={{
        enableFilters: true,
        enableSorting: true,
        manualFiltering: true,
        manualPagination: true,
        manualSorting: true,
        pageCount,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <DataTableToolbarSection className="flex-wrap justify-between gap-2 border-b p-0 px-3 py-2">
          <div className="min-w-0 flex-1">
            <DataTableSearchFilter<ContactTableRow>
              value={localQ}
              onChange={setLocalQ}
              placeholder="Search contacts, properties, groups..."
              className="w-full max-w-md [&_input]:border-0 [&_input]:shadow-none [&_input]:focus-visible:ring-0"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DataTableFilterMenu<ContactTableRow>
              filters={filters}
              onFiltersChange={(nextFilters) => {
                pushQuery({
                  source: filterValue(nextFilters),
                  page: 1,
                });
              }}
              autoOptions={false}
              showCounts={false}
            />
            <DataTableSortMenu<ContactTableRow>
              onSortingChange={(nextSorting) =>
                pushQuery({ sort: sortParamFor(nextSorting), page: 1 })
              }
            />
          </div>
        </DataTableToolbarSection>
        <DataTable
          className="min-h-0 flex-1 rounded-none border-0"
          tableClassName="table-fixed"
        >
          <DataTableHeader className="bg-muted/40" />
          <DataTableBody<ContactTableRow>
            onRowClick={(row) => {
              startTransition(() => router.push(row.href, { scroll: false }));
            }}
          >
            <DataTableEmptyBody className="h-28 text-center text-sm text-muted-foreground">
              No contacts match this view.
            </DataTableEmptyBody>
          </DataTableBody>
        </DataTable>
        <div className="border-t bg-background">
          <DataTablePagination<ContactTableRow>
            totalCount={total}
            pageSizeOptions={[25, 50, 100, 250, 500]}
            defaultPageSize={query.limit}
            onPageChange={(pageIndex) => pushQuery({ page: pageIndex + 1 })}
            onNextPage={(pageIndex) => pushQuery({ page: pageIndex + 1 })}
            onPreviousPage={(pageIndex) => pushQuery({ page: pageIndex + 1 })}
            onPageSizeChange={(limit, pageIndex) =>
              pushQuery({ limit, page: pageIndex + 1 })
            }
          />
        </div>
      </div>
    </DataTableRoot>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
