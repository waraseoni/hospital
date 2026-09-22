-- Migration 00037: Blood Bank

CREATE TYPE blood_group_enum AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
CREATE TYPE blood_component AS ENUM ('whole', 'prbc', 'ffp', 'platelets', 'cryo', 'plasma');
CREATE TYPE blood_unit_status AS ENUM ('available', 'reserved', 'issued', 'expired', 'discarded', 'quarantined');
CREATE TYPE blood_request_status AS ENUM ('pending', 'approved', 'issued', 'rejected', 'cancelled');
CREATE TYPE crossmatch_result AS ENUM ('compatible', 'incompatible', 'pending');

CREATE TABLE blood_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name TEXT NOT NULL,
  donor_phone TEXT DEFAULT '',
  donor_age INTEGER,
  donor_gender TEXT,
  blood_group blood_group_enum NOT NULL,
  volume_ml INTEGER NOT NULL DEFAULT 350,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  screened BOOLEAN NOT NULL DEFAULT false,
  screening_notes TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE blood_donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on blood_donations" ON blood_donations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Staff manage blood_donations" ON blood_donations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin', 'lab', 'nurse')));

CREATE TABLE blood_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID REFERENCES blood_donations(id) ON DELETE SET NULL,
  blood_group blood_group_enum NOT NULL,
  component blood_component NOT NULL DEFAULT 'whole',
  unit_code TEXT NOT NULL UNIQUE,
  volume_ml INTEGER NOT NULL DEFAULT 350,
  expiry_date DATE NOT NULL,
  status blood_unit_status NOT NULL DEFAULT 'available',
  location TEXT DEFAULT 'Blood Bank',
  reserved_for UUID REFERENCES patients(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blood_inv_group ON blood_inventory(blood_group);
CREATE INDEX idx_blood_inv_status ON blood_inventory(status);
CREATE INDEX idx_blood_inv_expiry ON blood_inventory(expiry_date);

ALTER TABLE blood_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on blood_inventory" ON blood_inventory FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Staff manage blood_inventory" ON blood_inventory FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin', 'lab', 'nurse', 'doctor')));

CREATE TRIGGER set_blood_inventory_updated_at BEFORE UPDATE ON blood_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL DEFAULT '',
  blood_group blood_group_enum NOT NULL,
  component blood_component NOT NULL DEFAULT 'whole',
  quantity INTEGER NOT NULL DEFAULT 1,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('routine', 'urgent', 'emergency')),
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  department TEXT DEFAULT '',
  status blood_request_status NOT NULL DEFAULT 'pending',
  crossmatch crossmatch_result NOT NULL DEFAULT 'pending',
  notes TEXT DEFAULT '',
  issued_unit_ids UUID[] DEFAULT '{}',
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blood_req_status ON blood_requests(status);
CREATE INDEX idx_blood_req_group ON blood_requests(blood_group);

ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access on blood_requests" ON blood_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Staff manage blood_requests" ON blood_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin', 'lab', 'nurse', 'doctor')));

CREATE TRIGGER set_blood_requests_updated_at BEFORE UPDATE ON blood_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_blood_requests AFTER INSERT OR UPDATE OR DELETE ON blood_requests
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();
CREATE TRIGGER audit_blood_inventory AFTER INSERT OR UPDATE OR DELETE ON blood_inventory
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();
