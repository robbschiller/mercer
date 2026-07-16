import { NextResponse } from "next/server";
import { getBid, getBidBudget } from "@/lib/store";
import { budgetTotals } from "@/lib/budget";

/**
 * Takeoff-budget xlsx download (composer plan P1-8) — the same shape as
 * Jordan's own spreadsheet (docs/jordan/Azur_at_Metrowest_Take_Off_Budget.xlsx):
 * customer block, structures, materials with bases, labor, cost build-up,
 * and the margin check against the quoted number. Internal use only.
 * Auth: getBid/getBidBudget are org-scoped via requireUser — an outsider
 * gets a 404, same as the app pages.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bidId: string }> },
) {
  const { bidId } = await params;
  let bid, budget;
  try {
    [bid, budget] = await Promise.all([getBid(bidId), getBidBudget(bidId)]);
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!bid || !budget) {
    return NextResponse.json({ error: "No budget on file" }, { status: 404 });
  }

  const t = budgetTotals(budget);
  const rows: (string | number | null)[][] = [
    [bid.propertyName || bid.clientName || "Takeoff budget"],
    [`Take Off Budget — internal use only. Do not send to customer.`],
    [],
    ["CUSTOMER"],
    ["Company", bid.clientName],
    ["Property", [bid.propertyName, bid.address].filter(Boolean).join(", ")],
    [],
    ["SCOPE"],
    ["Total SF", budget.totalSf],
    ["Total units", budget.units],
    ["Buildings", budget.buildings],
    [],
    ["MATERIALS"],
    ["Item", "Basis", "Qty", "Unit cost", "Cost"],
    ...budget.materials.map((l) => [
      l.item,
      l.basis,
      l.qty,
      l.unitCost,
      l.qty * l.unitCost,
    ]),
    ["Materials subtotal", null, null, null, t.materialsSubtotal],
    [
      `Taxes and fees (${budget.materialsTaxPct}%)`,
      null,
      null,
      null,
      t.materialsTax,
    ],
    ["Materials total", null, null, null, t.materialsTotal],
    [],
    ["LABOR"],
    ["Labor rate per SF", budget.laborRatePerSf],
    ["Labor cost", budget.laborCost],
    [],
    ["COST BUILD-UP"],
    ["Costs (materials + labor)", t.costs],
    [`Admin (${budget.adminPct}% of costs)`, t.admin],
    [`Commission (${budget.commissionPct}% of costs + admin)`, t.commission],
    ["Build-up total", t.buildUpTotal],
    ["Build-up per SF", t.perSf],
    ["Build-up per door", t.perDoor],
  ];
  if (budget.notes) rows.push([], ["NOTES"], [budget.notes]);

  const { utils, write } = await import("xlsx");
  const ws = utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 42 }, { wch: 34 }, { wch: 10 }, { wch: 10 }, { wch: 12 }];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Take Off");
  const buf = write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const safeName = (bid.propertyName || "takeoff")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeName}_Take_Off_Budget.xlsx"`,
    },
  });
}
