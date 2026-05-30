import Link from "next/link";
import { getProjects } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectsTable } from "@/components/projects-table";
import {
  PROJECT_STATUSES,
  projectStatusLabel,
  type ProjectStatus,
} from "@/lib/status-meta";

function parseProjectStatus(value: string | undefined): ProjectStatus | null {
  if (!value) return null;
  return PROJECT_STATUSES.includes(value as ProjectStatus)
    ? (value as ProjectStatus)
    : null;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const initialStatus = parseProjectStatus(status);
  const projects = await getProjects();

  return (
    <div className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full flex-col overflow-hidden">
      {projects.length === 0 ? (
        <div className="p-3 lg:p-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-muted-foreground">
                {initialStatus
                  ? `No projects in “${projectStatusLabel(initialStatus)}” right now.`
                  : "No projects yet."}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground/80">
                Projects appear here automatically when a property manager
                accepts a proposal.
              </p>
              {initialStatus ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/projects">Clear filter</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <ProjectsTable projects={projects} initialStatus={initialStatus} />
      )}
    </div>
  );
}
