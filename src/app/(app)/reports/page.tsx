import {
  getDeclineReasons,
  getReportData,
  getWinLossByCompany,
  type ReportJobsSlice,
} from "@/lib/store";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  LEAD_STATUSES,
  leadStatusLabel,
  bidStatusLabel,
} from "@/lib/status-meta";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function marginPct(slice: ReportJobsSlice): string {
  if (slice.contracted === 0) return "—";
  return `${Math.round((slice.profit / slice.contracted) * 100)}%`;
}

export default async function ReportsPage() {
  const [data, winLoss, declines] = await Promise.all([
    getReportData(),
    getWinLossByCompany(),
    getDeclineReasons(),
  ]);

  const leadCounts = new Map(data.leadFunnel.map((r) => [r.status, r]));
  const closedWon = leadCounts.get("won")?.count ?? 0;
  const closedLost =
    (leadCounts.get("lost")?.count ?? 0) +
    (leadCounts.get("no_response")?.count ?? 0) +
    (leadCounts.get("expired")?.count ?? 0);
  const bidWon = data.bidFunnel.find((r) => r.status === "won")?.count ?? 0;
  const bidLost = data.bidFunnel.find((r) => r.status === "lost")?.count ?? 0;

  return (
    <div className="container mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
      <header>
        <h1 className="text-2xl font-medium tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Everything here is derived live — win rates, pipeline, and margin
          come from the same rows the rest of the app writes.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Open pipeline"
          value={money.format(data.pipeline.openPipelineUsd)}
          hint="Latest proposal value on draft/sent bids"
        />
        <StatCard
          label="Lead win rate"
          value={pct(closedWon, closedWon + closedLost)}
          hint={`${closedWon} won / ${closedLost} lost of closed leads`}
        />
        <StatCard
          label="Bid win rate"
          value={pct(bidWon, bidWon + bidLost)}
          hint={`${bidWon} won, ${bidLost} lost`}
        />
        <StatCard
          label="Delivered margin"
          value={marginPct(data.delivered)}
          hint={`${money.format(data.delivered.profit)} profit on ${data.delivered.count} job${data.delivered.count === 1 ? "" : "s"}`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <JobsCard
          title="Jobs in flight"
          slice={data.active}
          description="Contracted vs spent on jobs not yet complete."
        />
        <JobsCard
          title="Jobs delivered"
          slice={data.delivered}
          description="Complete or under warranty watch."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead funnel</CardTitle>
          <CardDescription>
            Where every lead sits right now, with rough pipeline value where
            estimated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {LEAD_STATUSES.map((status) => {
                const row = leadCounts.get(status);
                return (
                  <tr key={status} className="border-b last:border-0">
                    <td className="py-1.5">{leadStatusLabel(status)}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {row?.count ?? 0}
                    </td>
                    <td className="py-1.5 w-32 text-right tabular-nums text-muted-foreground">
                      {row && row.estValue > 0
                        ? money.format(row.estValue)
                        : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead sources</CardTitle>
          <CardDescription>
            Top sources by volume, with closed-won conversion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Source</th>
                  <th className="py-2 text-right font-medium">Leads</th>
                  <th className="py-2 text-right font-medium">Won</th>
                  <th className="py-2 text-right font-medium">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((s) => (
                  <tr key={s.sourceTag ?? "untagged"} className="border-b last:border-0">
                    <td className="py-1.5">{s.sourceTag ?? "Untagged"}</td>
                    <td className="py-1.5 text-right tabular-nums">{s.total}</td>
                    <td className="py-1.5 text-right tabular-nums">{s.won}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {pct(s.won, s.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last six months</CardTitle>
          <CardDescription>
            New leads in, bids won, and contracted value by month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">Month</th>
                <th className="py-2 text-right font-medium">New leads</th>
                <th className="py-2 text-right font-medium">Bids won</th>
                <th className="py-2 text-right font-medium">Contracted</th>
              </tr>
            </thead>
            <tbody>
              {data.monthly.map((m) => (
                <tr key={m.month} className="border-b last:border-0">
                  <td className="py-1.5">{m.month}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {m.leadsCreated}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{m.bidsWon}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {m.wonValue > 0 ? money.format(m.wonValue) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bid funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              {data.bidFunnel.map((r) => (
                <tr key={r.status} className="border-b last:border-0">
                  <td className="py-1.5">{bidStatusLabel(r.status)}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {winLoss.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Win rate by company</CardTitle>
            <CardDescription>
              Who says yes — and what it&apos;s been worth.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Company</th>
                  <th className="py-2 text-right font-medium">Won</th>
                  <th className="py-2 text-right font-medium">Lost</th>
                  <th className="py-2 text-right font-medium">Open</th>
                  <th className="py-2 text-right font-medium">Win rate</th>
                  <th className="py-2 text-right font-medium">Won value</th>
                </tr>
              </thead>
              <tbody>
                {winLoss.map((r) => (
                  <tr key={r.company} className="border-b last:border-0">
                    <td className="py-1.5">{r.company}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.won}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.lost}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.open}</td>
                    <td className="py-1.5 text-right tabular-nums">
                      {pct(r.won, r.won + r.lost)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {r.wonValue > 0 ? money.format(r.wonValue) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {declines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Why deals declined</CardTitle>
            <CardDescription>
              Verbatim from the customer, newest first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col">
              {declines.map((d, i) => (
                <li
                  key={i}
                  className="flex items-start justify-between gap-3 border-b py-2 text-sm last:border-0"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{d.propertyName}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {d.company} — {d.reason}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {d.declinedAt.toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function JobsCard({
  title,
  slice,
  description,
}: {
  title: string;
  slice: ReportJobsSlice;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Jobs</p>
          <p className="font-semibold tabular-nums">{slice.count}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Contracted</p>
          <p className="font-semibold tabular-nums">
            {money.format(slice.contracted)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="font-semibold tabular-nums">
            {money.format(slice.spent)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {slice.profit < 0 ? "Over" : "Profit"}
          </p>
          <p
            className={
              "font-semibold tabular-nums " +
              (slice.profit < 0 ? "text-destructive" : "")
            }
          >
            {money.format(Math.abs(slice.profit))}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
