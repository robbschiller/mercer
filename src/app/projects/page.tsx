import { getProjects } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusColor: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  sent: "outline",
  won: "default",
  lost: "secondary",
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button asChild>
          <a href="/projects/new">New project</a>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground">No projects yet.</p>
            <Button asChild>
              <a href="/projects/new">Create your first project</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <a key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {project.clientName}
                    </CardTitle>
                    <Badge variant={statusColor[project.status] ?? "secondary"}>
                      {project.status}
                    </Badge>
                  </div>
                  <CardDescription>{project.address}</CardDescription>
                </CardHeader>
                {project.notes && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.notes}
                    </p>
                  </CardContent>
                )}
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
