-- Migration 00009: Vitals Records (Nursing)

CREATE TABLE vitals_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  nurse_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  bp_systolic INTEGER NOT NULL CHECK (bp_systolic > 0 AND bp_systolic < 300),
  bp_diastolic INTEGER NOT NULL CHECK (bp_diastolic > 0 AND bp_diastolic < 200),
  pulse INTEGER NOT NULL CHECK (pulse > 0 AND pulse < 300),
  spo2 INTEGER NOT NULL CHECK (spo2 > 0 AND spo2 <= 100),
  temperature NUMERIC(5,2) NOT NULL CHECK (temperature > 30 AND temperature < 45),
  weight NUMERIC(5,2),
  height NUMERIC(5,2),
  respiratory_rate INTEGER,
  pain_scale INTEGER CHECK (pain_scale >= 0 AND pain_scale <= 10),
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vitals_patient ON vitals_records(patient_id);
CREATE INDEX idx_vitals_recorded ON vitals_records(recorded_at);

ALTER TABLE vitals_records ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access on vitals_records"
  ON vitals_records FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Nurses can manage vitals
CREATE POLICY "Nurses can manage vitals"
  ON vitals_records FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'nurse')
  );

-- Doctors can view vitals
CREATE POLICY "Doctors can view vitals"
  ON vitals_records FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor')
  );

-- Patients can view their own vitals
CREATE POLICY "Patients view own vitals"
  ON vitals_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = vitals_records.patient_id
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'patient' AND phone = p.phone)
    )
  );
