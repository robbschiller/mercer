/**
 * Org voice rules enforced at render, not vibes (composer plan §A7).
 * Today: Jordan's rule — never em dashes in customer-facing copy.
 */
export function stripEmDashes(s: string): string {
  return s.replace(/\s*—\s*/g, ", ").replace(/—/g, "-");
}
