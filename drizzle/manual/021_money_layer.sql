-- 021_money_layer.sql
-- AQP reconciliation, Phase 1 (the money layer). Model A: the bid row IS the
-- project, so the money layer hangs off bids.
--   1. contract_value: immutable contract baseline, snapshotted from the
--      accepted proposal total at acceptance. All profitability derives from
--      it; never recomputed.
--   2. expenses: dated spend rows (AQP principle #5 — money flows through
--      dated events; job financial state is derived, never stored). category +
--      payment_type are canonical enums for reporting.
-- See docs/build-plans/aqp_reconciliation.plan.md.

ALTER TABLE bids ADD COLUMN IF NOT EXISTS contract_value numeric;

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bid_id uuid NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
  date date NOT NULL,
  category text NOT NULL CHECK (category IN (
    'staging','lifts','primer_sealer','topcoat','metal_paint_primer',
    'floor_paint','supplies','caulk','patch','cleaners','misc_supplies',
    'travel','repairs','non_paint_labor','paint_labor','other'
  )),
  payment_type text CHECK (payment_type IN (
    'spark_cc','amex','chase','ach','check','sw_charge','hd_charge',
    'florida_paints','lanco','cash','refund','other'
  )),
  vendor text,
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL,
  tax numeric NOT NULL DEFAULT '0',
  invoice_number text,
  receipt_url text,
  entered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_bid_date_idx ON expenses(bid_id, date DESC);
CREATE INDEX IF NOT EXISTS expenses_bid_cat_idx ON expenses(bid_id, category);
