"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
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
import type { DataTableColumnDef } from "@/components/niko-table/types";
import { FILTER_VARIANTS } from "@/components/niko-table/lib/constants";
import {
  BID_STATUSES,
  bidStatusLabel,
  bidStatusVariant,
} from "@/lib/status-meta";
import { calculateBidPricing, formatCurrency } from "@/lib/pricing";
import type { getBidsWithSummary } from "@/lib/store";

type BidSummary = Awaited<ReturnType<typeof getBidsWithSummary>>[number];

type BidRow = BidSummary & {
  href: string;
  grandTotal: number | null;
};

const STATUS_OPTIONS = BID_STATUSES.map((status) => ({
  label: bidStatusLabel(status),
  value: status,
}));

function HeaderLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase text-muted-foreground">
      {children}
    </span>
  );
}

function MutedCell({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

function formatShortDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function computeBidTotal(bid: BidSummary): number | null {
  const pricing = calculateBidPricing({
    totalSqft: bid.totalSqft,
    coverageSqftPerGallon: bid.coverageSqftPerGallon
      ? Number(bid.coverageSqftPerGallon)
      : null,
    pricePerGallon: bid.pricePerGallon ? Number(bid.pricePerGallon) : null,
    laborRatePerUnit: bid.laborRatePerUnit
      ? Number(bid.laborRatePerUnit)
      : null,
    marginPercent: bid.marginPercent ? Number(bid.marginPercent) : null,
    lineItems: [],
  });
  return pricing.grandTotal;
}

export function BidsTable({ bids }: { bids: BidSummary[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const rows = useMemo<BidRow[]>(
    () =>
      bids.map((bid) => ({
        ...bid,
        href: `/bids/${bid.id}`,
        grandTotal: computeBidTotal(bid),
      })),
    [bids],
  );

  const columns = useMemo<DataTableColumnDef<BidRow>[]>(
    () => [
      {
        accessorKey: "propertyName",
        enableSorting: true,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Property</HeaderLabel>,
        cell: ({ row }) => (
          <Link
            href={row.original.href}
            className="font-medium text-foreground"
          >
            {row.original.propertyName || "—"}
          </Link>
        ),
      },
      {
        accessorKey: "clientName",
        enableSorting: true,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Account</HeaderLabel>,
        cell: ({ row }) => (
          <MutedCell>{row.original.clientName || "—"}</MutedCell>
        ),
      },
      {
        accessorKey: "address",
        enableSorting: false,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Address</HeaderLabel>,
        cell: ({ row }) => (
          <span className="block max-w-[24ch] truncate text-muted-foreground">
            {row.original.address || "—"}
          </span>
        ),
      },
      {
        accessorKey: "buildingCount",
        enableSorting: true,
        enableColumnFilter: false,
        header: () => (
          <span className="block text-right text-xs font-medium uppercase text-muted-foreground">
            Buildings
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {row.original.buildingCount || "—"}
          </span>
        ),
      },
      {
        accessorKey: "totalSqft",
        enableSorting: true,
        enableColumnFilter: false,
        header: () => (
          <span className="block text-right text-xs font-medium uppercase text-muted-foreground">
            Sqft
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {row.original.totalSqft > 0
              ? row.original.totalSqft.toLocaleString()
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "grandTotal",
        enableSorting: true,
        enableColumnFilter: false,
        header: () => (
          <span className="block text-right text-xs font-medium uppercase text-muted-foreground">
            Bid total
          </span>
        ),
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">
            {row.original.grandTotal != null
              ? formatCurrency(row.original.grandTotal)
              : "—"}
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
          <Badge variant={bidStatusVariant(row.original.status)}>
            {bidStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: "lastProposalAt",
        enableSorting: true,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Proposal</HeaderLabel>,
        cell: ({ row }) => (
          <MutedCell>{formatShortDate(row.original.lastProposalAt)}</MutedCell>
        ),
      },
    ],
    [],
  );

  return (
    <DataTableRoot
      data={rows}
      columns={columns}
      getRowId={(bid) => bid.id}
      config={{
        enableFilters: true,
        enableSorting: true,
      }}
    >
      <div className="overflow-hidden rounded-md border bg-card">
        <DataTableToolbarSection className="justify-between border-b p-0 px-3 py-2">
          <DataTableSearchFilter<BidRow>
            placeholder="Search bids..."
            className="min-w-64 max-w-md [&_input]:border-0 [&_input]:shadow-none [&_input]:focus-visible:ring-0"
          />
          <div className="flex items-center gap-2">
            <DataTableFilterMenu<BidRow>
              autoOptions={false}
              showCounts={false}
            />
            <DataTableSortMenu<BidRow> />
          </div>
        </DataTableToolbarSection>
        <DataTable className="rounded-none border-0 border-b">
          <DataTableHeader className="bg-muted/40" />
          <DataTableBody<BidRow>
            onRowClick={(bid) => {
              startTransition(() => router.push(bid.href));
            }}
          >
            <DataTableEmptyBody className="h-28 text-center text-sm text-muted-foreground">
              No bids match this view.
            </DataTableEmptyBody>
          </DataTableBody>
        </DataTable>
        <DataTablePagination<BidRow>
          pageSizeOptions={[25, 50, 100, 250]}
          defaultPageSize={50}
        />
      </div>
    </DataTableRoot>
  );
}
