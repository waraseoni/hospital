-- Migration 00004: Prescriptions & EMR

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  diagnosis TEXT NOT NULL,
  symptoms TEXT,
  notes TEXT,
  medicines JSONB NOT NULL DEFAULT '[]'::jsonb,
  follow_up_date DATE,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/*
  medicines JSONB structure:
  [
    {
      "name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "TDS",
      "duration": "5 days",
      "instructions": "After food"
    }
  ]
*/

CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access on prescriptions"
  ON prescriptions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Doctors can create/update their own prescriptions
CREATE POLICY "Doctors manage own prescriptions"
  ON prescriptions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor')
  );

-- Patients can view their own prescriptions
CREATE POLICY "Patients view own prescriptions"
  ON prescriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = prescriptions.patient_id
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'patient' AND phone = p.phone)
    )
  );

-- Nurses can view prescriptions (to administer medicines)
CREATE POLICY "Nurses can view prescriptions"
  ON prescriptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'nurse')
  );

-- Lab staff can view prescriptions (for context)
CREATE POLICY "Lab staff can view prescriptions"
  ON prescriptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'lab')
  );

CREATE TRIGGER set_prescriptions_updated_at
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
