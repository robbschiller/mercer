-- 023_invoices_change_orders.sql
-- AQP reconciliation, Phase 1b. Money layer continued, off the bid spine.
--   change_orders: signed scope adjustments; approved ones adjust the derived
--                  contract baseline.
--   invoices:      customer billing (draws / deposit+final); CO invoices link
--                  back to a change order.
-- See docs/build-plans/aqp_reconciliation.plan.md.

CREATE TABLE IF NOT EXISTS change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bid_id uuid NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  number text,
  description text NOT NULL DEFAULT '',
  detail text NOT NULL DEFAULT '',
  reason text CHECK (reason IN (
    'discovered_during_work','customer_requested','scope_correction',
    'weather','other'
  )),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','sent','approved','denied'
  )),
  approved_by text,
  approved_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS change_orders_bid_idx ON change_orders(bid_id, created_at DESC);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bid_id uuid NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  number text,
  type text NOT NULL DEFAULT 'draw' CHECK (type IN (
    'mobilization','draw','deposit','final','change_order','other'
  )),
  sequence integer,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','invoiced','paid','overdue','cancelled'
  )),
  trigger text,
  invoiced_at date,
  due_at date,
  paid_at date,
  change_order_id uuid REFERENCES change_orders(id) ON DELETE SET NULL,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invoices_bid_status_idx ON invoices(bid_id, status);
