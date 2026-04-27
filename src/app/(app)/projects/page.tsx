import Link from "next/link";
import { getProjectListData } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  PROJECT_STATUSES,
  projectStatusLabel,
  projectStatusVariant,
  type ProjectStatus,
} from "@/lib/status-meta";

function parseProjectStatus(value: string | undefined): ProjectStatus | null {
  if (!value) return null;
  return PROJECT_STATUSES.includes(value as ProjectStatus)
    ? (value as ProjectStatus)
    : null;
}

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString();
}

const STATUS_FILTERS: Array<{ value: ProjectStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "punch_out", label: "Punch out" },
  { value: "on_hold", label: "On hold" },
  { value: "complete", label: "Complete" },
];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = parseProjectStatus(status);

  const { projects, counts } = await getProjectListData({ status: filter });

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-medium tracking-tight">
          Projects
        </h1>
        <p className="text-sm text-muted-foreground">
          Accepted bids that moved into delivery. One project per accepted
          bid; created automatically the moment a proposal is signed.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((opt) => {
          const isActive =
            opt.value === "all" ? !filter : filter === opt.value;
          const href = opt.value === "all" ? "/projects" : `/projects?status=${opt.value}`;
          const count = opt.value === "all" ? counts.total : counts[opt.value] ?? 0;
          return (
            <Link
              key={opt.value}
              href={href}
              className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label} <span className="ml-1 opacity-70">({count})</span>
            </Link>
          );
        })}
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {filter ? "No matching projects" : "No projects yet"}
            </CardTitle>
            <CardDescription>
              {filter
                ? `No projects in “${projectStatusLabel(filter)}” right now.`
                : "Projects appear here automatically when a property manager accepts a proposal."}
            </CardDescription>
          </CardHeader>
          {filter && (
            <CardContent>
              <Button variant="outline" size="sm" asChild>
                <Link href="/projects">Clear filter</Link>
              </Button>
            </CardContent>
          )}
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(({ project, bid }) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group rounded-lg border bg-card p-4 transition-colors hover:border-foreground/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-medium group-hover:underline">
                    {bid.propertyName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {bid.clientName}
                  </p>
                </div>
                <Badge variant={projectStatusVariant(project.status)}>
                  {projectStatusLabel(project.status)}
                </Badge>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Target start</dt>
                <dd className="text-right">
                  {formatDate(project.targetStartDate)}
                </dd>
                <dt className="text-muted-foreground">Target end</dt>
                <dd className="text-right">
                  {formatDate(project.targetEndDate)}
                </dd>
                <dt className="text-muted-foreground">Sub</dt>
                <dd className="truncate text-right">
                  {project.assignedSub ?? "—"}
                </dd>
                <dt className="text-muted-foreground">Updated</dt>
                <dd className="text-right">{formatDate(project.updatedAt)}</dd>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
