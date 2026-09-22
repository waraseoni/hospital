-- Migration 00024: Vaccination Records
-- Track patient vaccinations with next due dates

CREATE TABLE vaccinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  administered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  vaccine_name TEXT NOT NULL,
  dose_number INTEGER DEFAULT 1,
  batch_number TEXT DEFAULT '',
  site TEXT DEFAULT '',
  route TEXT DEFAULT 'IM',
  administered_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vaccinations_patient ON vaccinations(patient_id);
CREATE INDEX idx_vaccinations_next_due ON vaccinations(next_due_date);

ALTER TABLE vaccinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage vaccinations" ON vaccinations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Nurses manage vaccinations" ON vaccinations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'nurse'));

CREATE POLICY "Doctors can view vaccinations" ON vaccinations FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'));

CREATE POLICY "Patients view own vaccinations" ON vaccinations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = vaccinations.patient_id
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'patient' AND phone = p.phone)
    )
  );
