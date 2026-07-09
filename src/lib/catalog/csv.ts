/**
 * Column mapper + normalizers for price-list CSV imports (Settings → Catalog).
 *
 * Jordan's lists arrive as spreadsheets with ad-hoc headers ("Item", "Price",
 * "UOM", …), so mapping is alias-based like the leads importer, and category /
 * unit values are normalized into the app enums rather than rejected.
 */

import {
  PRICE_LIST_CATEGORIES,
  PRICING_UNITS,
  type PriceListCategory,
  type PricingUnit,
} from "@/lib/status-meta";

export type CatalogColumnMapping = {
  sku: string | null;
  name: string | null;
  description: string | null;
  category: string | null;
  pricingUnit: string | null;
  chargePerUnit: string | null;
  subCostPerUnit: string | null;
};

export type CatalogImportRow = {
  sku: string;
  name: string;
  description: string | null;
  category: PriceListCategory | null;
  pricingUnit: PricingUnit | null;
  chargePerUnit: number | null;
  subCostPerUnit: number | null;
};

const HEADER_ALIASES: Record<keyof CatalogColumnMapping, string[]> = {
  sku: ["sku", "code", "item code", "item #", "item number", "item no"],
  name: ["name", "item", "service", "line item", "item name"],
  description: ["description", "details", "notes"],
  category: ["category", "type", "trade"],
  pricingUnit: ["unit", "uom", "pricing unit", "per", "units"],
  chargePerUnit: [
    "charge",
    "charge per unit",
    "charge/unit",
    "price",
    "unit price",
    "rate",
    "price per unit",
  ],
  subCostPerUnit: [
    "cost",
    "sub cost",
    "sub cost per unit",
    "sub rate",
    "labor cost",
    "sub cost/unit",
  ],
};

export function autoMapCatalogColumns(headers: string[]): CatalogColumnMapping {
  const normalized = headers.map((h) => h.toLowerCase().trim());
  const mapping: CatalogColumnMapping = {
    sku: null,
    name: null,
    description: null,
    category: null,
    pricingUnit: null,
    chargePerUnit: null,
    subCostPerUnit: null,
  };
  for (const field of Object.keys(HEADER_ALIASES) as Array<
    keyof CatalogColumnMapping
  >) {
    for (const alias of HEADER_ALIASES[field]) {
      const idx = normalized.indexOf(alias);
      if (idx !== -1 && !Object.values(mapping).includes(headers[idx])) {
        mapping[field] = headers[idx];
        break;
      }
    }
  }
  // A lone "description" column doubles as the name when nothing better maps.
  if (!mapping.name && mapping.description) {
    mapping.name = mapping.description;
    mapping.description = null;
  }
  return mapping;
}

const UNIT_SYNONYMS: Record<string, PricingUnit> = {
  sf: "sf",
  sqft: "sf",
  "sq ft": "sf",
  "sq. ft.": "sf",
  "square foot": "sf",
  "square feet": "sf",
  lf: "lf",
  "lin ft": "lf",
  "linear ft": "lf",
  "linear foot": "lf",
  "linear feet": "lf",
  qty: "qty",
  quantity: "qty",
  each: "each",
  ea: "each",
  system: "system",
  bldg: "bldg",
  building: "bldg",
  unit: "unit",
  "per unit": "unit",
};

export function normalizePricingUnit(raw: string): PricingUnit | null {
  const key = raw.toLowerCase().replace(/\s+/g, " ").trim();
  if (!key) return null;
  if ((PRICING_UNITS as readonly string[]).includes(key)) {
    return key as PricingUnit;
  }
  return UNIT_SYNONYMS[key] ?? null;
}

const CATEGORY_PATTERNS: Array<[RegExp, PriceListCategory]> = [
  [/paint/i, "painting"],
  [/pressure|wash|pw/i, "pressure_washing"],
  [/wood|rot/i, "wood_repair"],
  [/stucco/i, "stucco"],
  [/stair/i, "stair_systems"],
  [/rail/i, "railings"],
  [/caulk/i, "caulking"],
  [/gutter/i, "gutters"],
  [/access|lift|scaffold|swing/i, "access"],
];

export function normalizeCategory(raw: string): PriceListCategory | null {
  const key = raw.toLowerCase().replace(/[\s-]+/g, "_").trim();
  if (!key) return null;
  if ((PRICE_LIST_CATEGORIES as readonly string[]).includes(key)) {
    return key as PriceListCategory;
  }
  for (const [pattern, category] of CATEGORY_PATTERNS) {
    if (pattern.test(raw)) return category;
  }
  return "other";
}

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Map parsed CSV rows to insertable catalog items. Rows without a usable
 * SKU + name are skipped; duplicate SKUs within the file keep the first row.
 */
export function mapRowsToCatalogItems(
  rows: Array<Record<string, string>>,
  mapping: CatalogColumnMapping,
): { items: CatalogImportRow[]; skipped: number } {
  const items: CatalogImportRow[] = [];
  const seenSkus = new Set<string>();
  let skipped = 0;

  for (const row of rows) {
    const get = (col: string | null) => (col ? (row[col] ?? "").trim() : "");
    const name = get(mapping.name);
    // No SKU column (or blank cell) → derive a stable-ish SKU from the name
    // so hand-made lists without codes still import.
    const sku =
      get(mapping.sku) ||
      name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 32);

    if (!sku || !name || seenSkus.has(sku)) {
      skipped++;
      continue;
    }
    seenSkus.add(sku);

    items.push({
      sku,
      name,
      description: get(mapping.description) || null,
      category: normalizeCategory(get(mapping.category)),
      pricingUnit: normalizePricingUnit(get(mapping.pricingUnit)),
      chargePerUnit: parseMoney(get(mapping.chargePerUnit)),
      subCostPerUnit: parseMoney(get(mapping.subCostPerUnit)),
    });
  }

  return { items, skipped };
}
