-- 027_catalog_suppliers.sql
-- AQP reconciliation, Phase 3. Org-scoped config tables: the service catalog
-- (SKUs for small-job takeoffs + large-job add-ons) and supplier product
-- pricing. AQP's hardcoded price/supplier sheets become per-org config.
-- See docs/build-plans/aqp_reconciliation.plan.md.

CREATE TABLE IF NOT EXISTS price_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sku text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  short_description text,
  category text CHECK (category IN (
    'painting','pressure_washing','wood_repair','stair_systems',
    'caulking','gutters','other'
  )),
  pricing_unit text CHECK (pricing_unit IN (
    'sf','lf','qty','each','system','bldg','unit'
  )),
  charge_per_unit numeric,
  sub_cost_per_unit numeric,
  typical_material_cost numeric,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- SKUs unique per org.
CREATE UNIQUE INDEX IF NOT EXISTS price_list_sku_per_user ON price_list_items(user_id, sku);
CREATE INDEX IF NOT EXISTS price_list_user_active_idx ON price_list_items(user_id, active);

CREATE TABLE IF NOT EXISTS supplier_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  supplier text NOT NULL,
  product_name text NOT NULL,
  product_type text CHECK (product_type IN (
    'paint','primer','caulk','cleaner','equipment','consumable'
  )),
  unit text,
  unit_price numeric,
  spread_rate numeric,
  expense_category text CHECK (expense_category IN (
    'staging','lifts','primer_sealer','topcoat','metal_paint_primer',
    'floor_paint','supplies','caulk','patch','cleaners','misc_supplies',
    'travel','repairs','non_paint_labor','paint_labor','other'
  )),
  supplier_rep_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  last_updated date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS supplier_products_user_active_idx ON supplier_products(user_id, active);
