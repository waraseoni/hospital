-- Migration 00003: Appointments & OPD Queue

CREATE TYPE appointment_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  date_slot TIMESTAMPTZ NOT NULL,
  token_no INTEGER NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  consultation_type TEXT DEFAULT 'opd' CHECK (consultation_type IN ('opd', 'ipd', 'emergency', 'follow_up')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (doctor_id, date_slot, token_no)
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(date_slot);
CREATE INDEX idx_appointments_status ON appointments(status);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access on appointments"
  ON appointments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Doctors can manage their own appointments
CREATE POLICY "Doctors manage own appointments"
  ON appointments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor')
    AND doctor_id = auth.uid()
  );

-- Nurses can view and update appointments
CREATE POLICY "Nurses can manage appointments"
  ON appointments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'nurse')
  );

-- Patients can view their own appointments
CREATE POLICY "Patients view own appointments"
  ON appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = appointments.patient_id
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'patient' AND phone = p.phone)
    )
  );

-- Patients can create appointments
CREATE POLICY "Patients can book appointments"
  ON appointments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'patient')
  );

CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
