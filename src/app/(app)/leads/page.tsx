import Link from "next/link";
import { getLeads } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  new: "secondary",
  quoted: "outline",
  won: "default",
  lost: "secondary",
};

const statusLabels: Record<string, string> = {
  new: "New",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Button asChild>
          <Link href="/leads/new">New lead</Link>
        </Button>
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground">No leads yet.</p>
            <Button asChild>
              <Link href="/leads/new">Add your first lead</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leads.map((lead) => (
            <Card key={lead.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{lead.name}</CardTitle>
                  <Badge variant={statusVariant[lead.status] ?? "secondary"}>
                    {statusLabels[lead.status] ?? lead.status}
                  </Badge>
                </div>
                {(lead.company || lead.propertyName) && (
                  <CardDescription>
                    {[lead.company, lead.propertyName]
                      .filter(Boolean)
                      .join(" · ")}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1 text-sm">
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-muted-foreground hover:text-foreground truncate"
                    >
                      {lead.email}
                    </a>
                  )}
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {lead.phone}
                    </a>
                  )}
                  {lead.sourceTag && (
                    <span className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                      Source: {lead.sourceTag}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
