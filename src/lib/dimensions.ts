/**
 * Compute total square footage from dimension groups.
 * Each group is an array of factors whose product is the group's sq ft.
 * Groups are summed for the surface total.
 *
 * Example: [[90, 33], [8, 3, 2]] => (90*33) + (8*3*2) = 2970 + 48 = 3018
 * Raw sq ft: [[1000]] => 1000
 */
export function computeTotalSqft(dimensions: number[][] | null): number {
  if (!dimensions || dimensions.length === 0) return 0;

  return dimensions.reduce((total, group) => {
    if (group.length === 0) return total;
    const groupProduct = group.reduce((product, factor) => product * factor, 1);
    return total + groupProduct;
  }, 0);
}

/**
 * Format dimension groups for display.
 * [[90, 33]] => "90 x 33"
 * [[8, 3, 2], [17, 8, 9]] => "(8 x 3 x 2) + (17 x 8 x 9)"
 * [[1000]] => "1,000"  (raw sqft)
 */
export function formatDimensions(dimensions: number[][] | null): string {
  if (!dimensions || dimensions.length === 0) return "";

  const groups = dimensions.map((group) => {
    if (group.length === 1) return group[0].toLocaleString();
    return group.join(" x ");
  });

  if (groups.length === 1) return groups[0];
  return groups.map((g) => `(${g})`).join(" + ");
}
