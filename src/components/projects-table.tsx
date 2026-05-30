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
  PROJECT_STATUSES,
  projectStatusLabel,
  projectStatusVariant,
  type ProjectStatus,
} from "@/lib/status-meta";
import type { getProjects } from "@/lib/store";

type ProjectWithBid = Awaited<ReturnType<typeof getProjects>>[number];

type ProjectRow = {
  id: string;
  href: string;
  propertyName: string;
  clientName: string;
  status: ProjectStatus;
  targetStartDate: string | null;
  targetEndDate: string | null;
  assignedSub: string | null;
  updatedAt: Date | null;
};

const STATUS_OPTIONS = PROJECT_STATUSES.map((status) => ({
  label: projectStatusLabel(status),
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

function formatShortDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ProjectsTable({
  projects,
  initialStatus,
}: {
  projects: ProjectWithBid[];
  initialStatus?: ProjectStatus | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const rows = useMemo<ProjectRow[]>(
    () =>
      projects.map(({ project, bid }) => ({
        id: project.id,
        href: `/projects/${project.id}`,
        propertyName: bid.propertyName,
        clientName: bid.clientName,
        status: project.status,
        targetStartDate: project.targetStartDate,
        targetEndDate: project.targetEndDate,
        assignedSub: project.assignedSub,
        updatedAt: project.updatedAt,
      })),
    [projects],
  );

  const columns = useMemo<DataTableColumnDef<ProjectRow>[]>(
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
          <Badge variant={projectStatusVariant(row.original.status)}>
            {projectStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: "targetStartDate",
        enableSorting: true,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Target start</HeaderLabel>,
        cell: ({ row }) => (
          <MutedCell>{formatShortDate(row.original.targetStartDate)}</MutedCell>
        ),
      },
      {
        accessorKey: "targetEndDate",
        enableSorting: true,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Target end</HeaderLabel>,
        cell: ({ row }) => (
          <MutedCell>{formatShortDate(row.original.targetEndDate)}</MutedCell>
        ),
      },
      {
        accessorKey: "assignedSub",
        enableSorting: true,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Sub</HeaderLabel>,
        cell: ({ row }) => (
          <span className="block max-w-[24ch] truncate text-muted-foreground">
            {row.original.assignedSub || "—"}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        enableSorting: true,
        enableColumnFilter: false,
        header: () => <HeaderLabel>Updated</HeaderLabel>,
        cell: ({ row }) => (
          <MutedCell>{formatShortDate(row.original.updatedAt)}</MutedCell>
        ),
      },
    ],
    [],
  );

  const initialColumnFilters = useMemo(() => {
    if (!initialStatus) return [];
    const filter: ExtendedColumnFilter<ProjectRow> = {
      id: "status",
      value: initialStatus,
      variant: FILTER_VARIANTS.SELECT,
      operator: FILTER_OPERATORS.EQ,
      filterId: `status-eq-${initialStatus}`,
      joinOperator: JOIN_OPERATORS.AND,
    };
    return [{ id: "status", value: filter }];
  }, [initialStatus]);

  return (
    <DataTableRoot
      className="flex min-h-0 flex-1 flex-col space-y-0"
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      initialState={{
        columnFilters: initialColumnFilters,
        sorting: [{ id: "updatedAt", desc: true }],
      }}
      config={{
        enableFilters: true,
        enableSorting: true,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <DataTableToolbarSection className="flex-wrap justify-between gap-2 border-b p-0 px-3 py-2">
          <div className="min-w-0 flex-1">
            <DataTableSearchFilter<ProjectRow>
              placeholder="Search projects..."
              className="w-full max-w-md [&_input]:border-0 [&_input]:shadow-none [&_input]:focus-visible:ring-0"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DataTableFilterMenu<ProjectRow>
              autoOptions={false}
              showCounts={false}
            />
            <DataTableSortMenu<ProjectRow> />
          </div>
        </DataTableToolbarSection>
        <DataTable className="min-h-0 flex-1 rounded-none border-0">
          <DataTableHeader className="bg-muted/40" />
          <DataTableBody<ProjectRow>
            onRowClick={(row) => {
              startTransition(() => router.push(row.href));
            }}
          >
            <DataTableEmptyBody className="h-28 text-center text-sm text-muted-foreground">
              No projects match this view.
            </DataTableEmptyBody>
          </DataTableBody>
        </DataTable>
        <div className="border-t bg-background">
          <DataTablePagination<ProjectRow>
            pageSizeOptions={[25, 50, 100, 250]}
            defaultPageSize={50}
          />
        </div>
      </div>
    </DataTableRoot>
  );
}
