-- Migration 00022: Emergency / ER Triage
-- Track emergency cases with triage levels

CREATE TYPE triage_level AS ENUM ('critical', 'urgent', 'non_urgent', 'stable');
CREATE TYPE er_status AS ENUM ('waiting', 'in_treatment', 'stabilized', 'referred', 'discharged');

CREATE TABLE emergency_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_phone TEXT DEFAULT '',
  age INTEGER,
  gender TEXT,
  chief_complaint TEXT NOT NULL,
  triage_level triage_level NOT NULL DEFAULT 'urgent',
  status er_status NOT NULL DEFAULT 'waiting',
  vitals JSONB DEFAULT '{}'::jsonb,
  assigned_doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  arrived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  treated_at TIMESTAMPTZ,
  discharged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emergency_cases_status ON emergency_cases(status);
CREATE INDEX idx_emergency_cases_triage ON emergency_cases(triage_level);

ALTER TABLE emergency_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage emergency_cases" ON emergency_cases FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Staff manage emergency_cases" ON emergency_cases FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'nurse')));

CREATE POLICY "Doctors manage emergency_cases" ON emergency_cases FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'));

CREATE TRIGGER set_emergency_cases_updated_at
  BEFORE UPDATE ON emergency_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
