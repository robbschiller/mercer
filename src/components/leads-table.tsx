"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useMemo, useTransition } from "react"
import type {
  ColumnSort,
  PaginationState,
  SortingState,
} from "@tanstack/react-table"
import type { Lead, LeadSourceOption } from "@/lib/store"
import {
  LEAD_STATUSES,
  enrichmentLabel,
  leadStatusLabel,
  leadStatusVariant,
} from "@/lib/status-meta"
import { leadFullName } from "@/lib/leads/name"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/niko-table/core/data-table"
import { DataTableRoot } from "@/components/niko-table/core/data-table-root"
import {
  DataTableBody,
  DataTableEmptyBody,
  DataTableHeader,
} from "@/components/niko-table/core/data-table-structure"
import { DataTableToolbarSection } from "@/components/niko-table/components/data-table-toolbar-section"
import { DataTableSearchFilter } from "@/components/niko-table/components/data-table-search-filter"
import { DataTableSortMenu } from "@/components/niko-table/components/data-table-sort-menu"
import { DataTableFilterMenu } from "@/components/niko-table/components/data-table-filter-menu"
import { DataTablePagination } from "@/components/niko-table/components/data-table-pagination"
import type {
  DataTableColumnDef,
  ExtendedColumnFilter,
} from "@/components/niko-table/types"
import {
  FILTER_OPERATORS,
  FILTER_VARIANTS,
  JOIN_OPERATORS,
} from "@/components/niko-table/lib/constants"
import {
  CheckCircle2,
  CircleSlash,
  Clock,
  XCircle,
  type LucideIcon,
} from "lucide-react"

type LeadsTableQuery = {
  q: string
  status: string | null
  source: string | null
  followUp: string | null
  sort: string | null
  limit: number
  page: number
  view: "property" | "contact"
}

type LeadTableRow = Lead & {
  href: string
}

const FOLLOW_UP_OPTIONS = [
  { label: "Overdue", value: "overdue" },
  { label: "Due today", value: "today" },
  { label: "Due this week", value: "this_week" },
  { label: "No follow-up", value: "none" },
]

const STATUS_OPTIONS = LEAD_STATUSES.map(status => ({
  label: leadStatusLabel(status),
  value: status,
}))

function enrichmentIcon(
  status: Lead["enrichmentStatus"],
): { Icon: LucideIcon; className: string } | null {
  switch (status) {
    case "success":
      return {
        Icon: CheckCircle2,
        className: "text-emerald-600 dark:text-emerald-400",
      }
    case "failed":
      return { Icon: XCircle, className: "text-destructive" }
    case "pending":
      return { Icon: Clock, className: "text-muted-foreground" }
    case "skipped":
      return { Icon: CircleSlash, className: "text-muted-foreground/60" }
    default:
      return null
  }
}

function sortingStateFor(sort: LeadsTableQuery["sort"]): SortingState {
  switch (sort) {
    case "follow_up":
      return [{ id: "followUpAt", desc: false }]
    case "last_contact":
      return [{ id: "lastContactedAt", desc: true }]
    case "stalest":
      return [{ id: "lastContactedAt", desc: false }]
    case "recent":
    default:
      return [{ id: "createdAt", desc: true }]
  }
}

function sortParamFor(sorting: ColumnSort[] | null): LeadsTableQuery["sort"] {
  const first = sorting?.[0]
  if (!first) return null
  if (first.id === "followUpAt") return "follow_up"
  if (first.id === "lastContactedAt") {
    return first.desc ? "last_contact" : "stalest"
  }
  if (first.id === "createdAt") return "recent"
  return null
}

function filterFor(
  id: "status" | "sourceTag" | "followUpAt",
  value: string,
): ExtendedColumnFilter<LeadTableRow> {
  return {
    id,
    value,
    variant: FILTER_VARIANTS.SELECT,
    operator: FILTER_OPERATORS.EQ,
    filterId: `${id}-eq-${value}`,
    joinOperator: JOIN_OPERATORS.AND,
  } as ExtendedColumnFilter<LeadTableRow> & { label?: string }
}

function filtersFor({
  status,
  source,
  followUp,
}: Pick<LeadsTableQuery, "status" | "source" | "followUp">) {
  const filters: ExtendedColumnFilter<LeadTableRow>[] = []
  if (status) filters.push(filterFor("status", status))
  if (source) filters.push(filterFor("sourceTag", source))
  if (followUp) {
    filters.push(filterFor("followUpAt", followUp))
  }
  return filters
}

function filterValue(
  filters: ExtendedColumnFilter<LeadTableRow>[] | null,
  id: "status" | "sourceTag" | "followUpAt",
) {
  const value = filters?.find(filter => filter.id === id)?.value
  if (Array.isArray(value)) return value[0] ?? null
  return typeof value === "string" && value ? value : null
}

function buildQueryString(
  query: LeadsTableQuery,
  overrides: Partial<LeadsTableQuery>,
) {
  const next = { ...query, ...overrides }
  const sp = new URLSearchParams()
  if (next.q) sp.set("q", next.q)
  if (next.status) sp.set("status", next.status)
  if (next.source) sp.set("source", next.source)
  if (next.followUp) sp.set("followUp", next.followUp)
  if (next.sort) sp.set("sort", next.sort)
  if (next.limit !== 100) sp.set("limit", String(next.limit))
  if (next.page > 1) sp.set("page", String(next.page))
  if (next.view === "contact") sp.set("view", "contact")
  return sp.toString()
}

function HeaderLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase text-muted-foreground">
      {children}
    </span>
  )
}

function MutedCell({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>
}

export function LeadsTable({
  leads,
  query,
  activeLeadId,
  total,
  page,
  sourceOptions,
}: {
  leads: LeadTableRow[]
  query: LeadsTableQuery
  activeLeadId?: string
  total: number
  page: number
  sourceOptions: LeadSourceOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  const sorting = useMemo(() => sortingStateFor(query.sort), [query.sort])
  const filters = useMemo(
    () =>
      filtersFor({
        status: query.status,
        source: query.source,
        followUp: query.followUp,
      }),
    [query.status, query.source, query.followUp],
  )
  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: page - 1,
      pageSize: query.limit,
    }),
    [page, query.limit],
  )
  const pageCount = Math.max(1, Math.ceil(total / query.limit))
  const pushQuery = (overrides: Partial<LeadsTableQuery>) => {
    const qs = buildQueryString(query, overrides)
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  const columns = useMemo<DataTableColumnDef<LeadTableRow>[]>(
    () => [
      {
        accessorKey: "firstName",
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Name</HeaderLabel>,
        cell: ({ row }) => {
          const lead = row.original
          return (
            <Link
              href={lead.href}
              scroll={false}
              className="font-medium text-foreground"
            >
              {leadFullName(lead)}
            </Link>
          )
        },
      },
      {
        accessorKey: "company",
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Company</HeaderLabel>,
        cell: ({ row }) => <MutedCell>{row.original.company || "-"}</MutedCell>,
      },
      {
        accessorKey: "propertyName",
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Property</HeaderLabel>,
        cell: ({ row }) => (
          <MutedCell>{row.original.propertyName || "-"}</MutedCell>
        ),
      },
      {
        accessorKey: "resolvedAddress",
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Property address</HeaderLabel>,
        cell: ({ row }) => (
          <span className="block max-w-[24ch] truncate text-muted-foreground">
            {row.original.resolvedAddress || "-"}
          </span>
        ),
      },
      {
        accessorKey: "email",
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Email address</HeaderLabel>,
        cell: ({ row }) => (
          <span className="block max-w-[20ch] truncate text-muted-foreground">
            {row.original.email || "-"}
          </span>
        ),
      },
      {
        accessorKey: "status",
        enableSorting: false,
        enableColumnFilter: true,
        meta: {
          label: "Status",
          variant: FILTER_VARIANTS.SELECT,
          options: STATUS_OPTIONS,
        },
        header: () => <HeaderLabel>Status</HeaderLabel>,
        cell: ({ row }) => (
          <Badge variant={leadStatusVariant(row.original.status)}>
            {leadStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        id: "enrichment",
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <span className="sr-only">Enrichment</span>,
        cell: ({ row }) => {
          const status = row.original.enrichmentStatus
          const enrichment = status ? enrichmentIcon(status) : null
          if (!enrichment || !status) {
            return (
              <span className="flex justify-center text-muted-foreground/60">
                -
              </span>
            )
          }
          return (
            <span
              title={enrichmentLabel(status)}
              className="flex items-center justify-center"
            >
              <enrichment.Icon
                className={`h-4 w-4 ${enrichment.className}`}
                aria-label={enrichmentLabel(status)}
              />
            </span>
          )
        },
        size: 48,
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
        accessorKey: "followUpAt",
        enableColumnFilter: true,
        enableSorting: true,
        header: "Follow-up",
        meta: {
          label: "Follow-up",
          variant: FILTER_VARIANTS.SELECT,
          options: FOLLOW_UP_OPTIONS,
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
  )

  return (
    <DataTableRoot
      data={leads}
      columns={columns}
      getRowId={(lead) => lead.id}
      state={{
        sorting,
        columnFilters: filters.map(filter => ({
          id: filter.id,
          value: filter,
        })),
        globalFilter: query.q,
        pagination,
        columnVisibility: {
          sourceTag: false,
          followUpAt: false,
          lastContactedAt: false,
          createdAt: false,
        },
        rowSelection: activeLeadId ? { [activeLeadId]: true } : {},
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
      <DataTableToolbarSection className="mb-3 justify-between p-0">
        <DataTableSearchFilter<LeadTableRow>
          value={query.q}
          onChange={(q) => pushQuery({ q: q.trim(), page: 1 })}
          placeholder="Search leads..."
          className="min-w-64 max-w-md"
        />
        <div className="flex items-center gap-2">
          <DataTableFilterMenu<LeadTableRow>
            filters={filters}
            onFiltersChange={(nextFilters) => {
              pushQuery({
                status: filterValue(nextFilters, "status"),
                source: filterValue(nextFilters, "sourceTag"),
                followUp: filterValue(nextFilters, "followUpAt"),
                page: 1,
              })
            }}
            autoOptions={false}
            showCounts={false}
          />
          <DataTableSortMenu<LeadTableRow>
            onSortingChange={(nextSorting) =>
              pushQuery({ sort: sortParamFor(nextSorting), page: 1 })
            }
          />
        </div>
      </DataTableToolbarSection>
      <DataTable className="rounded-md bg-card">
        <DataTableHeader className="bg-muted/40" />
        <DataTableBody<LeadTableRow>
          onRowClick={(lead) => {
            startTransition(() => router.push(lead.href, { scroll: false }))
          }}
        >
          <DataTableEmptyBody className="h-28 text-center text-sm text-muted-foreground">
            No leads match this view.
          </DataTableEmptyBody>
        </DataTableBody>
      </DataTable>
      <DataTablePagination<LeadTableRow>
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
  )
}
