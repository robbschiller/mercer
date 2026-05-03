"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import type {
  ColumnSort,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { Building2, CalendarClock, MapPin, Users } from "lucide-react";
import type {
  LeadPropertyGroup,
  LeadSourceOption,
} from "@/lib/store";
import { leadFullName } from "@/lib/leads/name";
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
import {
  LEAD_STATUSES,
  leadStatusLabel,
  leadStatusVariant,
} from "@/lib/status-meta";

type PropertyTableQuery = {
  q: string;
  status: string | null;
  source: string | null;
  followUp: string | null;
  sort: string | null;
  limit: number;
  page: number;
  view: "property" | "contact";
};

type PropertyTableRow = LeadPropertyGroup & {
  href: string;
  status: string | null;
  sourceTag: string | null;
  followUpAt: string | null;
  lastContactedAt: Date | null;
  createdAt: Date | null;
};

const FOLLOW_UP_OPTIONS = [
  { label: "Overdue", value: "overdue" },
  { label: "Due today", value: "today" },
  { label: "Due this week", value: "this_week" },
  { label: "No follow-up", value: "none" },
];

const STATUS_OPTIONS = LEAD_STATUSES.map((status) => ({
  label: leadStatusLabel(status),
  value: status,
}));

function sortingStateFor(sort: PropertyTableQuery["sort"]): SortingState {
  switch (sort) {
    case "recent":
      return [{ id: "createdAt", desc: true }];
    case "last_contact":
      return [{ id: "lastContactedAt", desc: true }];
    case "stalest":
      return [{ id: "lastContactedAt", desc: false }];
    case "follow_up":
    default:
      return [{ id: "followUpAt", desc: false }];
  }
}

function sortParamFor(
  sorting: ColumnSort[] | null,
): PropertyTableQuery["sort"] {
  const first = sorting?.[0];
  if (!first) return null;
  if (first.id === "followUpAt") return "follow_up";
  if (first.id === "lastContactedAt") {
    return first.desc ? "last_contact" : "stalest";
  }
  if (first.id === "createdAt") return "recent";
  return null;
}

function filterFor(
  id: "status" | "sourceTag" | "followUpAt",
  value: string,
): ExtendedColumnFilter<PropertyTableRow> {
  return {
    id,
    value,
    variant: FILTER_VARIANTS.SELECT,
    operator: FILTER_OPERATORS.EQ,
    filterId: `${id}-eq-${value}`,
    joinOperator: JOIN_OPERATORS.AND,
  };
}

function filtersFor({
  status,
  source,
  followUp,
}: Pick<PropertyTableQuery, "status" | "source" | "followUp">) {
  const filters: ExtendedColumnFilter<PropertyTableRow>[] = [];
  if (status) filters.push(filterFor("status", status));
  if (source) filters.push(filterFor("sourceTag", source));
  if (followUp) filters.push(filterFor("followUpAt", followUp));
  return filters;
}

function filterValue(
  filters: ExtendedColumnFilter<PropertyTableRow>[] | null,
  id: "status" | "sourceTag" | "followUpAt",
) {
  const value = filters?.find((filter) => filter.id === id)?.value;
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === "string" && value ? value : null;
}

function buildQueryString(
  query: PropertyTableQuery,
  overrides: Partial<PropertyTableQuery> & { property?: string | null },
) {
  const next = { ...query, ...overrides };
  const sp = new URLSearchParams();
  if (next.q) sp.set("q", next.q);
  if (next.status) sp.set("status", next.status);
  if (next.source) sp.set("source", next.source);
  if (next.followUp) sp.set("followUp", next.followUp);
  if (next.sort) sp.set("sort", next.sort);
  if (next.limit !== 100) sp.set("limit", String(next.limit));
  if (next.page > 1) sp.set("page", String(next.page));
  if (next.view === "contact") sp.set("view", "contact");
  if (overrides.property) sp.set("property", overrides.property);
  return sp.toString();
}

function HeaderLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase text-muted-foreground">
      {children}
    </span>
  );
}

export function PropertyLeadsTable({
  groups,
  query,
  activePropertyKey,
  total,
  page,
  sourceOptions,
}: {
  groups: PropertyTableRow[];
  query: PropertyTableQuery;
  activePropertyKey?: string;
  total: number;
  page: number;
  sourceOptions: LeadSourceOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const sorting = useMemo(() => sortingStateFor(query.sort), [query.sort]);
  const filters = useMemo(
    () =>
      filtersFor({
        status: query.status,
        source: query.source,
        followUp: query.followUp,
      }),
    [query.status, query.source, query.followUp],
  );
  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: page - 1,
      pageSize: query.limit,
    }),
    [page, query.limit],
  );
  const pageCount = Math.max(1, Math.ceil(total / query.limit));
  const pushQuery = (overrides: Partial<PropertyTableQuery>) => {
    const qs = buildQueryString(query, overrides);
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  };

  const columns = useMemo<DataTableColumnDef<PropertyTableRow>[]>(
    () => [
      {
        accessorKey: "propertyName",
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Property</HeaderLabel>,
        cell: ({ row }) => {
          const group = row.original;
          const heading =
            group.propertyName ?? group.address ?? "No property address";
          return (
            <div className="flex min-w-0 max-w-[22rem] flex-col gap-1 py-1">
              <Link
                href={group.href}
                scroll={false}
                className="inline-flex min-w-0 items-center gap-2 font-medium text-foreground hover:underline"
              >
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{heading}</span>
              </Link>
              <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {group.propertyName && group.address
                    ? group.address
                    : group.managementCompany || "Address needed"}
                </span>
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "managementCompany",
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Account</HeaderLabel>,
        cell: ({ row }) => (
          <span className="block max-w-[20ch] truncate text-muted-foreground">
            {row.original.managementCompany || "-"}
          </span>
        ),
      },
      {
        id: "contacts",
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Contacts</HeaderLabel>,
        cell: ({ row }) => {
          const contacts = row.original.contacts.slice(0, 3);
          const extra = row.original.contactCount - contacts.length;
          return (
            <div className="flex max-w-[20rem] flex-wrap items-center gap-1.5">
              {contacts.map((lead) => (
                <span
                  key={lead.id}
                  className="inline-flex max-w-[13rem] items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs"
                  title={lead.email ?? lead.phone ?? undefined}
                >
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{leadFullName(lead)}</span>
                </span>
              ))}
              {extra > 0 ? (
                <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  +{extra}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "pipeline",
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Pipeline</HeaderLabel>,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {statusCounts(row.original).map(({ status, count }) => (
              <Badge key={status} variant={leadStatusVariant(status)}>
                {count} {leadStatusLabel(status)}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        accessorKey: "portfolioCount",
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Portfolio</HeaderLabel>,
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {row.original.portfolioCount && row.original.portfolioCount > 1
              ? `${row.original.portfolioCount} properties`
              : "-"}
          </span>
        ),
      },
      {
        accessorKey: "followUpAt",
        enableColumnFilter: true,
        enableSorting: true,
        header: "Follow-up",
        cell: ({ row }) => {
          const value = row.original.earliestFollowUp;
          return (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              {value ? formatDate(value) : "-"}
            </span>
          );
        },
        meta: {
          label: "Follow-up",
          variant: FILTER_VARIANTS.SELECT,
          options: FOLLOW_UP_OPTIONS,
        },
      },
      {
        accessorKey: "status",
        enableColumnFilter: true,
        enableSorting: false,
        header: "Status",
        meta: {
          label: "Status",
          variant: FILTER_VARIANTS.SELECT,
          options: STATUS_OPTIONS,
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
        accessorKey: "lastContactedAt",
        enableColumnFilter: false,
        enableSorting: true,
        header: "Last contact",
        meta: {
          label: "Last contact",
          variant: FILTER_VARIANTS.DATE,
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
      data={groups}
      columns={columns}
      getRowId={(group) => group.key}
      state={{
        sorting,
        columnFilters: filters.map((filter) => ({
          id: filter.id,
          value: filter,
        })),
        globalFilter: query.q,
        pagination,
        columnVisibility: {
          status: false,
          sourceTag: false,
          lastContactedAt: false,
          createdAt: false,
        },
        rowSelection: activePropertyKey ? { [activePropertyKey]: true } : {},
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
      <DataTableToolbarSection className="mb-3 flex-wrap justify-between gap-2 p-0">
        <div className="min-w-0 flex-1">
          <DataTableSearchFilter<PropertyTableRow>
            value={query.q}
            onChange={(q) => pushQuery({ q: q.trim(), page: 1 })}
            placeholder="Search properties, accounts, contacts..."
            className="w-full max-w-md"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DataTableFilterMenu<PropertyTableRow>
            filters={filters}
            onFiltersChange={(nextFilters) => {
              pushQuery({
                status: filterValue(nextFilters, "status"),
                source: filterValue(nextFilters, "sourceTag"),
                followUp: filterValue(nextFilters, "followUpAt"),
                page: 1,
              });
            }}
            autoOptions={false}
            showCounts={false}
          />
          <DataTableSortMenu<PropertyTableRow>
            onSortingChange={(nextSorting) =>
              pushQuery({ sort: sortParamFor(nextSorting), page: 1 })
            }
          />
        </div>
      </DataTableToolbarSection>
      <DataTable className="rounded-md bg-card" maxHeight="calc(100vh - 15rem)">
        <DataTableHeader className="bg-muted/40" />
        <DataTableBody<PropertyTableRow>
          onRowClick={(group) => {
            startTransition(() => router.push(group.href, { scroll: false }));
          }}
        >
          <DataTableEmptyBody className="h-28 text-center text-sm text-muted-foreground">
            No properties match this view.
          </DataTableEmptyBody>
        </DataTableBody>
      </DataTable>
      <DataTablePagination<PropertyTableRow>
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
    </DataTableRoot>
  );
}

function statusCounts(group: LeadPropertyGroup) {
  const counts = new Map<string, number>();
  for (const lead of group.contacts) {
    counts.set(lead.status, (counts.get(lead.status) ?? 0) + 1);
  }
  return Array.from(counts, ([status, count]) => ({ status, count }));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
