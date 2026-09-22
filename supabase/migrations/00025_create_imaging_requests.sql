-- Migration 00025: Radiology / Imaging Requests
-- Doctors order imaging studies; lab/radiology processes them

CREATE TYPE imaging_status AS ENUM ('ordered', 'in_progress', 'completed', 'cancelled');

CREATE TABLE imaging_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  ordered_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  modality TEXT NOT NULL CHECK (modality IN ('xray', 'mri', 'ct', 'ultrasound', 'mammography', 'other')),
  body_part TEXT NOT NULL DEFAULT '',
  clinical_indication TEXT DEFAULT '',
  status imaging_status NOT NULL DEFAULT 'ordered',
  findings TEXT DEFAULT '',
  impression TEXT DEFAULT '',
  images_urls JSONB DEFAULT '[]'::jsonb,
  report_pdf_url TEXT,
  priority TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'stat')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_imaging_requests_patient ON imaging_requests(patient_id);
CREATE INDEX idx_imaging_requests_status ON imaging_requests(status);

ALTER TABLE imaging_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage imaging" ON imaging_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Doctors manage own imaging orders" ON imaging_requests FOR ALL
  USING (ordered_by = auth.uid());

CREATE POLICY "Lab manage imaging" ON imaging_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'lab'));

CREATE POLICY "Nurses can view imaging" ON imaging_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'nurse'));

CREATE POLICY "Patients view own imaging" ON imaging_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = imaging_requests.patient_id
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'patient' AND phone = p.phone)
    )
  );

CREATE TRIGGER set_imaging_requests_updated_at
  BEFORE UPDATE ON imaging_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
