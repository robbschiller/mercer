import { getPriceListItems, getSupplierProducts } from "@/lib/store";
import {
  createPriceListItemAction,
  deletePriceListItemAction,
  setPriceListItemActiveAction,
  createSupplierProductAction,
  deleteSupplierProductAction,
} from "@/lib/actions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import {
  PRICE_LIST_CATEGORIES,
  PRICING_UNITS,
  SUPPLIER_PRODUCT_TYPES,
  EXPENSE_CATEGORIES,
  priceListCategoryLabel,
  pricingUnitLabel,
  supplierProductTypeLabel,
  expenseCategoryLabel,
} from "@/lib/status-meta";

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
function fmt(n: string | null): string {
  return n == null ? "—" : money.format(Number(n));
}

export default async function CatalogSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, items, suppliers] = await Promise.all([
    searchParams,
    getPriceListItems(),
    getSupplierProducts(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Service catalog */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service catalog</CardTitle>
          <CardDescription>
            Standardized SKUs for small-job takeoffs and large-job add-ons.
            These are per-org config — add the line items you sell.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form
            action={createPriceListItemAction}
            className="grid gap-3 rounded-md border p-3 sm:grid-cols-2"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" placeholder="WDR-PT-2X6" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pli-name">Name</Label>
              <Input
                id="pli-name"
                name="name"
                placeholder="Wood rot — 2x6 PT pine"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pli-cat">Category</Label>
              <select id="pli-cat" name="category" defaultValue="" className={SELECT_CLASS}>
                <option value="">—</option>
                {PRICE_LIST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {priceListCategoryLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pli-unit">Pricing unit</Label>
              <select id="pli-unit" name="pricingUnit" defaultValue="" className={SELECT_CLASS}>
                <option value="">—</option>
                {PRICING_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {pricingUnitLabel(u)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pli-charge">Charge / unit</Label>
              <Input
                id="pli-charge"
                name="chargePerUnit"
                type="number"
                step="0.01"
                min="0"
                placeholder="2.50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pli-sub">Sub cost / unit</Label>
              <Input
                id="pli-sub"
                name="subCostPerUnit"
                type="number"
                step="0.01"
                min="0"
                placeholder="1.40"
              />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton size="sm">Add catalog item</SubmitButton>
            </div>
          </form>

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No catalog items yet.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {it.name}
                      {!it.active && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (inactive)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {it.sku}
                      {it.category
                        ? ` · ${priceListCategoryLabel(it.category)}`
                        : ""}
                      {it.chargePerUnit != null
                        ? ` · ${fmt(it.chargePerUnit)} ${it.pricingUnit ? pricingUnitLabel(it.pricingUnit) : ""}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <form action={setPriceListItemActiveAction}>
                      <input type="hidden" name="id" value={it.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={(!it.active).toString()}
                      />
                      <button
                        type="submit"
                        className="rounded-full border px-2 py-0.5 text-[0.6875rem] text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        {it.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                    <form action={deletePriceListItemAction}>
                      <input type="hidden" name="id" value={it.id} />
                      <button
                        type="submit"
                        aria-label="Delete"
                        className="rounded p-1 text-xs text-muted-foreground hover:text-destructive"
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Supplier pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Supplier pricing</CardTitle>
          <CardDescription>
            Paint, materials, and equipment pricing from your suppliers. Feeds
            material estimates; a purchase maps to its expense category.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <form
            action={createSupplierProductAction}
            className="grid gap-3 rounded-md border p-3 sm:grid-cols-2"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sp-supplier">Supplier</Label>
              <Input
                id="sp-supplier"
                name="supplier"
                placeholder="Sherwin Williams"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sp-name">Product</Label>
              <Input
                id="sp-name"
                name="productName"
                placeholder="Latitude Satin"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sp-type">Type</Label>
              <select id="sp-type" name="productType" defaultValue="" className={SELECT_CLASS}>
                <option value="">—</option>
                {SUPPLIER_PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {supplierProductTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sp-cat">Expense category</Label>
              <select id="sp-cat" name="expenseCategory" defaultValue="" className={SELECT_CLASS}>
                <option value="">—</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {expenseCategoryLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sp-unit">Unit</Label>
              <Input id="sp-unit" name="unit" placeholder="gallon" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sp-price">Unit price</Label>
              <Input
                id="sp-price"
                name="unitPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="52.00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sp-spread">Spread rate (sqft/gal)</Label>
              <Input
                id="sp-spread"
                name="spreadRate"
                type="number"
                step="1"
                min="0"
                placeholder="350"
              />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton size="sm">Add supplier product</SubmitButton>
            </div>
          </form>

          {suppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No supplier products yet.
            </p>
          ) : (
            <ul className="flex flex-col divide-y">
              {suppliers.map((sp) => (
                <li
                  key={sp.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {sp.productName}
                      <span className="text-muted-foreground">
                        {" · "}
                        {sp.supplier}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sp.productType
                        ? `${supplierProductTypeLabel(sp.productType)} · `
                        : ""}
                      {sp.unitPrice != null
                        ? `${fmt(sp.unitPrice)}${sp.unit ? ` / ${sp.unit}` : ""}`
                        : ""}
                      {sp.expenseCategory
                        ? ` · ${expenseCategoryLabel(sp.expenseCategory)}`
                        : ""}
                    </p>
                  </div>
                  <form action={deleteSupplierProductAction}>
                    <input type="hidden" name="id" value={sp.id} />
                    <button
                      type="submit"
                      aria-label="Delete"
                      className="shrink-0 rounded p-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
