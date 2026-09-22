-- Migration 00035: Equipment / Asset Tracking

CREATE TYPE equip_status AS ENUM ('operational', 'maintenance', 'repair', 'retired', 'reserved');

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  department TEXT DEFAULT '',
  asset_tag TEXT UNIQUE,
  manufacturer TEXT DEFAULT '',
  model TEXT DEFAULT '',
  serial_number TEXT DEFAULT '',
  purchase_date DATE,
  purchase_cost NUMERIC(12,2) DEFAULT 0,
  warranty_until DATE,
  location TEXT DEFAULT '',
  status equip_status NOT NULL DEFAULT 'operational',
  notes TEXT DEFAULT '',
  last_service_at DATE,
  next_service_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_dept ON equipment(department);
CREATE INDEX idx_equipment_tag ON equipment(asset_tag);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on equipment" ON equipment FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Staff view equipment" ON equipment FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'nurse', 'lab', 'doctor', 'admin')));

CREATE TRIGGER set_equipment_updated_at BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL DEFAULT 'service' CHECK (maintenance_type IN ('service', 'repair', 'calibration', 'inspection')),
  description TEXT NOT NULL DEFAULT '',
  cost NUMERIC(10,2) DEFAULT 0,
  performed_by TEXT DEFAULT '',
  performed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due DATE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maint_equip ON maintenance_logs(equipment_id);

ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on maintenance_logs" ON maintenance_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Staff view maintenance_logs" ON maintenance_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'nurse', 'lab', 'doctor', 'admin')));

CREATE TRIGGER audit_equipment AFTER INSERT OR UPDATE OR DELETE ON equipment
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();
