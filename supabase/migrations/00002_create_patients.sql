-- Migration 00002: Patients
-- Patient master database with UHID

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uhid TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  phone TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  blood_group TEXT,
  emergency_contact TEXT,
  allergies TEXT,
  medical_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_uhid ON patients(uhid);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_name ON patients(name);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins have full access on patients"
  ON patients FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Doctors & Nurses can read/write
CREATE POLICY "Medical staff can manage patients"
  ON patients FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('doctor', 'nurse', 'lab')
    )
  );

-- Patients can read their own record
CREATE POLICY "Patients can view own record"
  ON patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role = 'patient' AND phone = patients.phone
    )
  );

-- Staff can read patients (for transport/cleaning)
CREATE POLICY "Staff can view patients"
  ON patients FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff')
  );

CREATE TRIGGER set_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
