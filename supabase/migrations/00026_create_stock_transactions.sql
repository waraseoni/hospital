-- Migration 00026: Stock Transactions (pharmacy/inventory in-out audit)

CREATE TYPE stock_txn_type AS ENUM ('in', 'out');
CREATE TYPE stock_ref_type AS ENUM ('manual', 'purchase_order', 'dispense', 'requisition', 'pos', 'adjustment');

CREATE TABLE stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  type stock_txn_type NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  ref_type stock_ref_type NOT NULL DEFAULT 'manual',
  ref_id UUID,
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_txn_item ON stock_transactions(item_id);
CREATE INDEX idx_stock_txn_created ON stock_transactions(created_at);
CREATE INDEX idx_stock_txn_ref ON stock_transactions(ref_type, ref_id);

ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on stock_transactions"
  ON stock_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Staff can view stock_transactions"
  ON stock_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'nurse', 'lab', 'doctor')));

CREATE POLICY "Staff can insert stock_transactions"
  ON stock_transactions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')));

CREATE TRIGGER audit_stock_transactions
  AFTER INSERT OR UPDATE OR DELETE ON stock_transactions
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();
