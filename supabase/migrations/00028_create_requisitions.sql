-- Migration 00028: Department Requisitions

CREATE TYPE req_status AS ENUM ('pending', 'approved', 'issued', 'rejected');

CREATE TABLE requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  req_number TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL,
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status req_status NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_requisitions_status ON requisitions(status);
CREATE INDEX idx_requisitions_dept ON requisitions(department);

ALTER TABLE requisitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on requisitions"
  ON requisitions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Staff manage requisitions"
  ON requisitions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'nurse', 'lab', 'doctor')));

CREATE TRIGGER set_requisitions_updated_at
  BEFORE UPDATE ON requisitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE requisition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  req_id UUID NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  issued_qty INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_requisition_items_req ON requisition_items(req_id);

ALTER TABLE requisition_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on requisition_items"
  ON requisition_items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Staff manage requisition_items"
  ON requisition_items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'nurse', 'lab', 'doctor')));

CREATE TRIGGER audit_requisitions
  AFTER INSERT OR UPDATE OR DELETE ON requisitions
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();
