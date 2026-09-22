-- Migration 00038: Patient Experience — Feedback + Patient Documents + reminders

-- ---------------------------------------------------------------------------
-- Feedback Survey
-- ---------------------------------------------------------------------------
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'opd', 'ipd', 'lab', 'pharmacy', 'billing', 'facility', 'staff', 'other')),
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_patient ON feedback(patient_id);
CREATE INDEX idx_feedback_created ON feedback(created_at);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Patients can submit feedback and view their own
CREATE POLICY "Patients manage own feedback"
  ON feedback FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = feedback.patient_id
      AND p.user_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "Admins full access on feedback"
  ON feedback FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Medical staff can view feedback
CREATE POLICY "Medical staff can view feedback"
  ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('doctor', 'nurse', 'lab', 'staff')
    )
  );

-- ---------------------------------------------------------------------------
-- Patient Documents (uploaded scans / reports)
-- ---------------------------------------------------------------------------
CREATE TABLE patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'prescription' CHECK (category IN ('prescription', 'lab_report', 'invoice', 'scan', 'other')),
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_documents_patient ON patient_documents(patient_id);
CREATE INDEX idx_patient_documents_created ON patient_documents(created_at);

ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- Patients can manage their own documents (upload, list, delete)
CREATE POLICY "Patients manage own documents"
  ON patient_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_documents.patient_id
      AND p.user_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "Admins full access on patient_documents"
  ON patient_documents FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Medical staff can view patient documents
CREATE POLICY "Medical staff can view patient documents"
  ON patient_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('doctor', 'nurse', 'lab', 'staff')
    )
  );

-- ---------------------------------------------------------------------------
-- Appointment reminder tracking (idempotent cron dedupe)
-- ---------------------------------------------------------------------------
ALTER TABLE appointments ADD COLUMN reminder_sent_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Signup prefills: ensure blood_group/gender/address land on the patient record
-- (supersedes the handle_new_user defined in 00001/00012)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Always create a profile
  INSERT INTO public.profiles (id, full_name, role, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email
  );

  -- If role is patient, also auto-create a patient record
  IF COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient') = 'patient' THEN
    INSERT INTO public.patients (user_id, name, dob, gender, phone, address, blood_group)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Patient'),
      COALESCE((NEW.raw_user_meta_data->>'dob')::date, '2000-01-01'),
      COALESCE(NEW.raw_user_meta_data->>'gender', 'other'),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      COALESCE(NEW.raw_user_meta_data->>'address', ''),
      NEW.raw_user_meta_data->>'blood_group'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;