import { Calculator, ChevronDown, TriangleAlert } from "lucide-react";
import type { BidBudgetData } from "@/lib/budget";
import { budgetTotals } from "@/lib/budget";
import { formatCurrency } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * The internal face of the proposal (composer plan §A3/P1-5): the takeoff
 * budget behind a "show the working" fold. Mirrors Jordan's own spreadsheet
 * — materials with their spread-rate bases, labor, admin & commission
 * build-up, and the margin readout against the live quote total. Internal
 * only; never rendered customer-side.
 */
export function BudgetCard({
  budget,
  quoteTotal,
}: {
  budget: BidBudgetData;
  quoteTotal: number | null;
}) {
  const t = budgetTotals(budget);
  const margin = quoteTotal != null ? quoteTotal - t.buildUpTotal : null;
  const under = margin != null && margin < 0;

  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-foreground/60">
          <Calculator className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            Takeoff budget — show the working
          </span>
          <span className="block text-xs text-muted-foreground">
            Internal only. What this job costs you, line by line.
          </span>
        </span>
        {margin != null && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums",
              under
                ? "border-red-600/40 bg-red-600/10 text-red-700 dark:text-red-400"
                : "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
            )}
          >
            {under && <TriangleAlert className="size-3" />}
            {under ? "−" : "+"}
            {formatCurrency(Math.abs(margin))} vs build-up
          </span>
        )}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t px-4 pb-4 pt-3">
        {/* scope stats */}
        <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          {budget.totalSf != null && (
            <span>
              <b className="font-mono font-medium tabular-nums text-foreground/80">
                {Math.round(budget.totalSf).toLocaleString()}
              </b>{" "}
              SF
            </span>
          )}
          {budget.units != null && (
            <span>
              <b className="font-mono font-medium tabular-nums text-foreground/80">
                {budget.units}
              </b>{" "}
              units
            </span>
          )}
          {budget.buildings != null && (
            <span>
              <b className="font-mono font-medium tabular-nums text-foreground/80">
                {budget.buildings}
              </b>{" "}
              buildings
            </span>
          )}
        </div>

        {/* materials */}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Material</th>
                <th className="px-3 py-2">Basis</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Unit cost</th>
                <th className="px-3 py-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {budget.materials.map((l, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-1.5">{l.item}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">
                    {l.basis}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums">
                    {l.qty.toLocaleString(undefined, {
                      maximumFractionDigits: 1,
                    })}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-xs tabular-nums">
                    {formatCurrency(l.unitCost)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-xs font-medium tabular-nums">
                    {formatCurrency(l.qty * l.unitCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* build-up */}
        <dl className="mt-3 ml-auto flex max-w-sm flex-col gap-1 text-sm">
          <Row label="Materials subtotal" value={t.materialsSubtotal} />
          <Row
            label={`Taxes & fees (${budget.materialsTaxPct}%)`}
            value={t.materialsTax}
          />
          <Row
            label={
              budget.laborRatePerSf != null
                ? `Labor ($${budget.laborRatePerSf}/SF)`
                : "Labor"
            }
            value={budget.laborCost}
          />
          <Row label={`Admin (${budget.adminPct}%)`} value={t.admin} />
          <Row
            label={`Commission (${budget.commissionPct}%)`}
            value={t.commission}
          />
          <div className="mt-1 flex items-baseline justify-between border-t pt-1.5">
            <dt className="text-sm font-semibold">Build-up total</dt>
            <dd className="font-mono text-base font-bold tabular-nums">
              {formatCurrency(t.buildUpTotal)}
            </dd>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <dt>
              {t.perSf != null && (
                <>
                  <span className="font-mono tabular-nums">
                    ${t.perSf.toFixed(2)}
                  </span>
                  /SF
                </>
              )}
            </dt>
            <dd>
              {t.perDoor != null && (
                <>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(t.perDoor)}
                  </span>
                  /door
                </>
              )}
            </dd>
          </div>
        </dl>

        {budget.notes && (
          <p className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {budget.notes}
          </p>
        )}
      </div>
    </details>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xs tabular-nums">
        {formatCurrency(value)}
      </dd>
    </div>
  );
}
