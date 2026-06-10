export interface PricingInput {
  totalSqft: number;
  coverageSqftPerGallon: number | null;
  pricePerGallon: number | null;
  laborRatePerUnit: number | null;
  marginPercent: number | null;
  lineItems: { name: string; amount: number }[];
  /** Access items (lift/scaffold/swing stage/safety). Defaults to none. */
  accessItems?: { name: string; amount: number }[];
}

export interface PricingResult {
  totalSqft: number;
  gallonsNeeded: number | null;
  materialCost: number | null;
  laborCost: number | null;
  subtotal: number | null;
  lineItemsTotal: number;
  accessTotal: number;
  marginAmount: number | null;
  grandTotal: number | null;
  complete: boolean;
}

export function calculateBidPricing(input: PricingInput): PricingResult {
  const {
    totalSqft,
    coverageSqftPerGallon,
    pricePerGallon,
    laborRatePerUnit,
    marginPercent,
    lineItems,
    accessItems = [],
  } = input;

  const lineItemsTotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const accessTotal = accessItems.reduce((sum, a) => sum + a.amount, 0);

  const hasCore =
    coverageSqftPerGallon != null &&
    coverageSqftPerGallon > 0 &&
    pricePerGallon != null &&
    laborRatePerUnit != null;

  if (!hasCore || totalSqft === 0) {
    // No paintable sqft but priced lines exist: a catalog/SKU small job
    // (or line-items-only bid). The quote IS the lines — no paint math,
    // and per-sqft rates aren't required to propose it.
    const linesOnlyTotal = lineItemsTotal + accessTotal;
    if (totalSqft === 0 && linesOnlyTotal > 0) {
      return {
        totalSqft,
        gallonsNeeded: null,
        materialCost: null,
        laborCost: null,
        subtotal: round2(linesOnlyTotal),
        lineItemsTotal: round2(lineItemsTotal),
        accessTotal: round2(accessTotal),
        marginAmount: null,
        grandTotal: round2(linesOnlyTotal),
        complete: true,
      };
    }
    return {
      totalSqft,
      gallonsNeeded: null,
      materialCost: null,
      laborCost: null,
      subtotal: null,
      lineItemsTotal,
      accessTotal: round2(accessTotal),
      marginAmount: null,
      grandTotal: null,
      complete: false,
    };
  }

  const gallonsNeeded = totalSqft / coverageSqftPerGallon;
  const materialCost = gallonsNeeded * pricePerGallon!;
  const laborCost = totalSqft * laborRatePerUnit!;
  const subtotal = materialCost + laborCost + lineItemsTotal + accessTotal;
  const margin = marginPercent ?? 0;
  const marginAmount = subtotal * (margin / 100);
  const grandTotal = subtotal + marginAmount;

  return {
    totalSqft,
    gallonsNeeded: round2(gallonsNeeded),
    materialCost: round2(materialCost),
    laborCost: round2(laborCost),
    subtotal: round2(subtotal),
    lineItemsTotal: round2(lineItemsTotal),
    accessTotal: round2(accessTotal),
    marginAmount: round2(marginAmount),
    grandTotal: round2(grandTotal),
    complete: true,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatCurrency(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
