-- Migration 00020: IPD Admissions
-- Tracks patient admissions, bed assignments, and discharges

CREATE TYPE admission_status AS ENUM ('active', 'discharged', 'cancelled');

CREATE TABLE admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
  admission_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  discharge_date TIMESTAMPTZ,
  ward_type TEXT NOT NULL DEFAULT 'general',
  status admission_status NOT NULL DEFAULT 'active',
  diagnosis TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  discharge_summary TEXT DEFAULT '',
  total_charges NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admissions_patient ON admissions(patient_id);
CREATE INDEX idx_admissions_doctor ON admissions(doctor_id);
CREATE INDEX idx_admissions_bed ON admissions(bed_id);
CREATE INDEX idx_admissions_status ON admissions(status);

ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins manage admissions"
  ON admissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Doctors can view and update their own admissions
CREATE POLICY "Doctors manage own admissions"
  ON admissions FOR ALL
  USING (
    doctor_id = auth.uid()
  );

-- Nurses can view and update admissions (for discharge etc.)
CREATE POLICY "Nurses can manage admissions"
  ON admissions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'nurse')
  );

-- Staff can view admissions
CREATE POLICY "Staff can view admissions"
  ON admissions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff')
  );

-- Patients can view their own admissions
CREATE POLICY "Patients view own admissions"
  ON admissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = admissions.patient_id
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'patient' AND phone = p.phone)
    )
  );

CREATE TRIGGER set_admissions_updated_at
  BEFORE UPDATE ON admissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
