import { Scale } from "lucide-react";
import type { BidBudgetData } from "@/lib/budget";
import { budgetTotals } from "@/lib/budget";
import { expenseCategoryLabel } from "@/lib/status-meta";
import { formatCurrency } from "@/lib/pricing";
import type { Expense } from "@/lib/store";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * "Budget clones over from the opportunity" (Jordan's notes §7 / plan C1):
 * the takeoff budget stamped at sale becomes the job's baseline, and every
 * logged expense burns against it live, per category.
 */
export function BudgetVsActualCard({
  budget,
  expenses,
}: {
  budget: BidBudgetData;
  expenses: Expense[];
}) {
  const t = budgetTotals(budget);

  // Planned direct costs by category: materials lines roll up under their
  // own category; labor plans under paint_labor. Admin/commission are
  // overhead (no expense category) — they live only in the baseline total.
  const planned = new Map<string, number>();
  for (const l of budget.materials) {
    planned.set(
      l.category,
      (planned.get(l.category) ?? 0) + l.qty * l.unitCost,
    );
  }
  if (budget.laborCost > 0) {
    planned.set(
      "paint_labor",
      (planned.get("paint_labor") ?? 0) + budget.laborCost,
    );
  }

  const actual = new Map<string, number>();
  let actualTotal = 0;
  for (const e of expenses) {
    const amt = Number(e.amount) + Number(e.tax ?? 0);
    actual.set(e.category, (actual.get(e.category) ?? 0) + amt);
    actualTotal += amt;
  }

  const categories = [
    ...new Set([...planned.keys(), ...actual.keys()]),
  ].sort((a, b) => (planned.get(b) ?? 0) - (planned.get(a) ?? 0));

  const remaining = t.buildUpTotal - actualTotal;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="size-4" />
          Budget vs actual
        </CardTitle>
        <CardDescription>
          The takeoff budget from the opportunity is this job&apos;s baseline
          — expenses burn against it live.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between rounded-lg border bg-muted/30 px-3 py-2.5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Remaining budget
            </p>
            <p
              className={cn(
                "font-mono text-lg font-bold tabular-nums",
                remaining < 0 && "text-red-600 dark:text-red-400",
              )}
            >
              {formatCurrency(remaining)}
            </p>
          </div>
          <p className="text-right text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">
              {formatCurrency(actualTotal)}
            </span>{" "}
            spent of{" "}
            <span className="font-mono tabular-nums">
              {formatCurrency(t.buildUpTotal)}
            </span>{" "}
            budgeted
          </p>
        </div>

        <ul className="flex flex-col gap-2.5">
          {categories.map((cat) => {
            const p = planned.get(cat) ?? 0;
            const a = actual.get(cat) ?? 0;
            const over = p > 0 ? a > p : a > 0;
            const pct = p > 0 ? Math.min(1, a / p) : a > 0 ? 1 : 0;
            return (
              <li key={cat}>
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-medium">
                    {expenseCategoryLabel(cat)}
                  </span>
                  <span
                    className={cn(
                      "font-mono tabular-nums text-muted-foreground",
                      over && "font-semibold text-amber-600",
                    )}
                  >
                    {formatCurrency(a)}
                    <span className="text-muted-foreground/60">
                      {" "}
                      / {p > 0 ? formatCurrency(p) : "unbudgeted"}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      over ? "bg-amber-500" : "bg-foreground/70",
                    )}
                    style={{ width: `${Math.round(pct * 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Baseline includes {formatCurrency(t.admin)} admin (
          {budget.adminPct}%) and {formatCurrency(t.commission)} commission (
          {budget.commissionPct}%) as overhead — they carry no expense
          category and appear only in the total.
        </p>
      </CardContent>
    </Card>
  );
}
