import Link from "next/link";
import { getPropertiesIndex } from "@/lib/store";

/**
 * Repeat business is the whole game: exteriors get repainted on a cycle.
 * A property whose last won job is 6+ years old is due for a call.
 */
const REPAINT_CYCLE_MS = 6 * 365.25 * 24 * 60 * 60 * 1000;
function repaintDue(lastWonAt: Date | null): boolean {
  return (
    lastWonAt != null && Date.now() - lastWonAt.getTime() > REPAINT_CYCLE_MS
  );
}
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function PropertiesPage() {
  const rows = await getPropertiesIndex();

  return (
    <div className="flex flex-col gap-4 p-3 lg:p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-medium">Properties</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/leads/new">New lead</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-muted-foreground">No properties yet.</p>
            <p className="max-w-sm text-sm text-muted-foreground/80">
              Properties are the durable records — every lead, bid, and job at
              an address builds its history here.
            </p>
            <Button variant="outline" asChild>
              <Link href="/leads/new">Add a lead</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Property</th>
                  <th className="py-2 pr-4 font-medium">Management</th>
                  <th className="py-2 pr-4 font-medium">Contacts</th>
                  <th className="py-2 pr-4 font-medium">Open deals</th>
                  <th className="py-2 pr-4 font-medium">Jobs</th>
                  <th className="py-2 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b align-middle last:border-0">
                    <td className="py-2.5 pr-4">
                      <Link
                        href={`/properties/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.name ?? p.address ?? "Untitled property"}
                      </Link>
                      {p.name && p.address ? (
                        <span className="block text-xs text-muted-foreground">
                          {p.address}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {p.managementName ?? "—"}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {p.contactCount}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      {p.openDealCount > 0 ? (
                        <span className="font-medium">{p.openDealCount}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">
                      <span className="inline-flex items-center gap-2">
                        {p.jobCount > 0 ? (
                          p.jobCount
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                        {repaintDue(p.lastWonAt) && (
                          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-px text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            Repaint due
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">
                      {p.lastActivityAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
