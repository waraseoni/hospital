-- Migration 00006: Beds & Ward Management

CREATE TYPE bed_type AS ENUM ('general', 'semi_private', 'private', 'icu', 'emergency');

CREATE TABLE beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_name TEXT NOT NULL,
  bed_number TEXT NOT NULL,
  bed_type bed_type NOT NULL DEFAULT 'general',
  is_occupied BOOLEAN NOT NULL DEFAULT false,
  current_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  daily_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_ready BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ward_name, bed_number)
);

CREATE INDEX idx_beds_ward ON beds(ward_name);
CREATE INDEX idx_beds_occupied ON beds(is_occupied);
CREATE INDEX idx_beds_patient ON beds(current_patient_id);

ALTER TABLE beds ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access on beds"
  ON beds FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Nurses can view and update beds (allotment/transfer)
CREATE POLICY "Nurses can manage beds"
  ON beds FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'nurse')
  );

-- Staff can update bed readiness/cleaning status
CREATE POLICY "Staff can view and update bed status"
  ON beds FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'doctor'))
  );

CREATE POLICY "Staff can update bed readiness"
  ON beds FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff')
  );

CREATE TRIGGER set_beds_updated_at
  BEFORE UPDATE ON beds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
