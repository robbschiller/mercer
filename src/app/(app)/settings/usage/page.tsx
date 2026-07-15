import { Coins, Info } from "lucide-react";
import { getUsageSummary } from "@/lib/store";
import {
  AI_FEATURE_LABELS,
  TOKEN_PRICING_PER_MTOK,
  usageCostUsd,
  type AiFeature,
} from "@/lib/usage";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default async function UsagePage() {
  const { monthStart, rows } = await getUsageSummary();
  const monthLabel = new Date(monthStart).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const totals = rows.reduce(
    (t, r) => ({
      calls: t.calls + r.calls,
      inputTokens: t.inputTokens + r.inputTokens,
      outputTokens: t.outputTokens + r.outputTokens,
      cacheWriteTokens: t.cacheWriteTokens + r.cacheWriteTokens,
      cacheReadTokens: t.cacheReadTokens + r.cacheReadTokens,
    }),
    {
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
    },
  );
  const totalCost = usageCostUsd(totals);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="size-4" />
            Usage & billing
          </CardTitle>
          <CardDescription>
            Every AI feature is metered by the token. This is {monthLabel}{" "}
            month-to-date — the same ledger your invoice is computed from.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="AI calls" value={String(totals.calls)} />
            <Stat
              label="Tokens processed"
              value={fmtTokens(
                totals.inputTokens +
                  totals.outputTokens +
                  totals.cacheWriteTokens +
                  totals.cacheReadTokens,
              )}
            />
            <Stat label="Month-to-date charges" value={money.format(totalCost)} />
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No AI usage yet this month. Generate a quote, ask Mercer a
              question, or refresh the morning brief and it lands here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Feature</th>
                    <th className="py-2 pr-4 text-right font-medium">Calls</th>
                    <th className="py-2 pr-4 text-right font-medium">Input</th>
                    <th className="py-2 pr-4 text-right font-medium">Output</th>
                    <th className="py-2 pr-4 text-right font-medium">Cache</th>
                    <th className="py-2 text-right font-medium">Charges</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.feature} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        {AI_FEATURE_LABELS[r.feature as AiFeature] ?? r.feature}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {r.calls}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-[13px] tabular-nums">
                        {fmtTokens(r.inputTokens)}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-[13px] tabular-nums">
                        {fmtTokens(r.outputTokens)}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-[13px] tabular-nums text-muted-foreground">
                        {fmtTokens(r.cacheWriteTokens + r.cacheReadTokens)}
                      </td>
                      <td className="py-2 text-right font-mono text-[13px] font-medium tabular-nums">
                        {money.format(usageCostUsd(r))}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2">
                    <td className="py-2.5 pr-4 font-semibold">Total</td>
                    <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
                      {totals.calls}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[13px] font-semibold tabular-nums">
                      {fmtTokens(totals.inputTokens)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[13px] font-semibold tabular-nums">
                      {fmtTokens(totals.outputTokens)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-[13px] font-semibold tabular-nums text-muted-foreground">
                      {fmtTokens(
                        totals.cacheWriteTokens + totals.cacheReadTokens,
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono text-[13px] font-semibold tabular-nums">
                      {money.format(totalCost)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-start gap-2.5 rounded-xl border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0" />
            <span>
              Rates per million tokens: input{" "}
              {money.format(TOKEN_PRICING_PER_MTOK.input)}, output{" "}
              {money.format(TOKEN_PRICING_PER_MTOK.output)}, cache write{" "}
              {money.format(TOKEN_PRICING_PER_MTOK.cacheWrite)}, cache read{" "}
              {money.format(TOKEN_PRICING_PER_MTOK.cacheRead)}. Charges accrue
              month-to-date and bill at the start of the next month.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 px-3.5 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-xl font-medium tabular-nums">
        {value}
      </p>
    </div>
  );
}
