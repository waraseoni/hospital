-- Migration 00005: Lab Reports

CREATE TYPE lab_report_status AS ENUM ('pending', 'in_progress', 'finalized');

CREATE TABLE lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ordered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  test_name TEXT NOT NULL,
  test_category TEXT NOT NULL DEFAULT 'general',
  test_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  normal_ranges JSONB DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  status lab_report_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/*
  test_data JSONB structure:
  {
    "hemoglobin": "12.5 g/dL",
    "wbc_count": "7200 /mm3",
    "platelet_count": "250000 /mm3"
  }

  normal_ranges JSONB structure:
  {
    "hemoglobin": "12-16 g/dL",
    "wbc_count": "4000-11000 /mm3",
    "platelet_count": "150000-400000 /mm3"
  }
*/

CREATE INDEX idx_lab_reports_patient ON lab_reports(patient_id);
CREATE INDEX idx_lab_reports_status ON lab_reports(status);

ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access on lab_reports"
  ON lab_reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Lab staff can manage all lab reports
CREATE POLICY "Lab staff manage lab reports"
  ON lab_reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'lab')
  );

-- Doctors can view and create lab orders
CREATE POLICY "Doctors can manage lab reports"
  ON lab_reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor')
  );

-- Patients can view their own finalized reports
CREATE POLICY "Patients view own finalized reports"
  ON lab_reports FOR SELECT
  USING (
    status = 'finalized'
    AND EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = lab_reports.patient_id
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'patient' AND phone = p.phone)
    )
  );

-- Nurses can view lab reports
CREATE POLICY "Nurses can view lab reports"
  ON lab_reports FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'nurse')
  );

CREATE TRIGGER set_lab_reports_updated_at
  BEFORE UPDATE ON lab_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
