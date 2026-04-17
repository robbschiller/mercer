import Link from "next/link";
import { ArrowRight, ClipboardList, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBidsWithSummary, getLeads } from "@/lib/store";

function pct(part: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

export default async function DashboardPage() {
  const [bids, leads] = await Promise.all([getBidsWithSummary(), getLeads()]);

  const bidStats = {
    total: bids.length,
    draft: bids.filter((b) => b.status === "draft").length,
    sent: bids.filter((b) => b.status === "sent").length,
    won: bids.filter((b) => b.status === "won").length,
    lost: bids.filter((b) => b.status === "lost").length,
  };

  const leadStats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    quoted: leads.filter((l) => l.status === "quoted").length,
    won: leads.filter((l) => l.status === "won").length,
    lost: leads.filter((l) => l.status === "lost").length,
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Snapshot of your lead and bid pipeline.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-semibold">{leadStats.total}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="New" value={leadStats.new} />
              <Stat label="Quoted" value={leadStats.quoted} />
              <Stat label="Won" value={leadStats.won} />
              <Stat label="Lost" value={leadStats.lost} />
            </div>
            <p className="text-xs text-muted-foreground">
              Win rate: {pct(leadStats.won, leadStats.total)}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/leads">
                View leads
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">Bids</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-semibold">{bidStats.total}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label="Draft" value={bidStats.draft} />
              <Stat label="Sent" value={bidStats.sent} />
              <Stat label="Won" value={bidStats.won} />
              <Stat label="Lost" value={bidStats.lost} />
            </div>
            <p className="text-xs text-muted-foreground">
              Win rate: {pct(bidStats.won, bidStats.total)}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/bids">
                View bids
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-medium">{value}</p>
    </div>
  );
}
