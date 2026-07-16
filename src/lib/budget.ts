/**
 * The internal face of a proposal: the takeoff budget (bid_budgets.data).
 * Shape mirrors Jordan's own takeoff spreadsheet (docs/jordan/
 * Azur_at_Metrowest_Take_Off_Budget.xlsx): materials with spread-rate
 * bases, labor at $/SF, then a cost build-up (+admin, +commission) the
 * margin guardrail compares against the quote total. Stored amounts are
 * the model's; totals are always recomputed here — never trusted.
 */

export type BudgetLine = {
  /** Expense category slug (matches EXPENSE_CATEGORIES where possible). */
  category: string;
  /** e.g. "Latitude Exterior Satin". */
  item: string;
  /** The spread-rate basis, e.g. "1 gal per 200 SF", "1 tube per unit". */
  basis: string;
  qty: number;
  unitCost: number;
};

export type BidBudgetData = {
  totalSf: number | null;
  units: number | null;
  buildings: number | null;
  materials: BudgetLine[];
  /** Sales tax + fees on materials, e.g. 10. */
  materialsTaxPct: number;
  laborRatePerSf: number | null;
  laborCost: number;
  /** Overhead on costs, e.g. 30. */
  adminPct: number;
  /** Commission on costs + admin, e.g. 4. */
  commissionPct: number;
  /** Model-stated assumptions and caveats — always shown with the numbers. */
  notes: string | null;
};

export type BudgetTotals = {
  materialsSubtotal: number;
  materialsTax: number;
  materialsTotal: number;
  costs: number;
  admin: number;
  commission: number;
  buildUpTotal: number;
  perSf: number | null;
  perDoor: number | null;
};

export function budgetTotals(d: BidBudgetData): BudgetTotals {
  const materialsSubtotal = d.materials.reduce(
    (n, l) => n + l.qty * l.unitCost,
    0,
  );
  const materialsTax = materialsSubtotal * (d.materialsTaxPct / 100);
  const materialsTotal = materialsSubtotal + materialsTax;
  const costs = materialsTotal + d.laborCost;
  const admin = costs * (d.adminPct / 100);
  const commission = (costs + admin) * (d.commissionPct / 100);
  const buildUpTotal = costs + admin + commission;
  return {
    materialsSubtotal,
    materialsTax,
    materialsTotal,
    costs,
    admin,
    commission,
    buildUpTotal,
    perSf: d.totalSf ? buildUpTotal / d.totalSf : null,
    perDoor: d.units ? buildUpTotal / d.units : null,
  };
}

/** Margin of the quoted number over the build-up (negative = under cost). */
export function marginOverBuildUp(
  quoteTotal: number,
  d: BidBudgetData,
): number {
  return quoteTotal - budgetTotals(d).buildUpTotal;
}

/** Defensive parse of a stored jsonb blob — shape drift must not crash. */
export function parseBudgetData(raw: unknown): BidBudgetData | null {
  if (raw == null || typeof raw !== "object") return null;
  const d = raw as Partial<BidBudgetData>;
  if (!Array.isArray(d.materials)) return null;
  const num = (v: unknown, fallback = 0) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  const numOrNull = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  return {
    totalSf: numOrNull(d.totalSf),
    units: numOrNull(d.units),
    buildings: numOrNull(d.buildings),
    materials: d.materials
      .filter((l): l is BudgetLine => l != null && typeof l === "object")
      .map((l) => ({
        category: String(l.category ?? "other"),
        item: String(l.item ?? ""),
        basis: String(l.basis ?? ""),
        qty: num(l.qty),
        unitCost: num(l.unitCost),
      })),
    materialsTaxPct: num(d.materialsTaxPct, 10),
    laborRatePerSf: numOrNull(d.laborRatePerSf),
    laborCost: num(d.laborCost),
    adminPct: num(d.adminPct, 30),
    commissionPct: num(d.commissionPct, 4),
    notes: typeof d.notes === "string" ? d.notes : null,
  };
}
