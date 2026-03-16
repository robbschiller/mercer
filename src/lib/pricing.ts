export interface PricingInput {
  totalSqft: number;
  coverageSqftPerGallon: number | null;
  pricePerGallon: number | null;
  laborRatePerUnit: number | null;
  marginPercent: number | null;
  lineItems: { name: string; amount: number }[];
}

export interface PricingResult {
  totalSqft: number;
  gallonsNeeded: number | null;
  materialCost: number | null;
  laborCost: number | null;
  subtotal: number | null;
  lineItemsTotal: number;
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
  } = input;

  const lineItemsTotal = lineItems.reduce((sum, li) => sum + li.amount, 0);

  const hasCore =
    coverageSqftPerGallon != null &&
    coverageSqftPerGallon > 0 &&
    pricePerGallon != null &&
    laborRatePerUnit != null;

  if (!hasCore || totalSqft === 0) {
    return {
      totalSqft,
      gallonsNeeded: null,
      materialCost: null,
      laborCost: null,
      subtotal: null,
      lineItemsTotal,
      marginAmount: null,
      grandTotal: null,
      complete: false,
    };
  }

  const gallonsNeeded = totalSqft / coverageSqftPerGallon;
  const materialCost = gallonsNeeded * pricePerGallon!;
  const laborCost = totalSqft * laborRatePerUnit!;
  const subtotal = materialCost + laborCost + lineItemsTotal;
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
