-- Migration 00023: Medical Certificates
-- Doctors can generate fitness/sick-leave/discharge certificates

CREATE TYPE certificate_type AS ENUM ('fitness', 'sick_leave', 'discharge', 'referral', 'death');

CREATE TABLE medical_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  certificate_type certificate_type NOT NULL DEFAULT 'fitness',
  diagnosis TEXT DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  from_date DATE,
  to_date DATE,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medical_certificates_patient ON medical_certificates(patient_id);
CREATE INDEX idx_medical_certificates_doctor ON medical_certificates(doctor_id);

ALTER TABLE medical_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage medical_certificates" ON medical_certificates FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Doctors manage own medical_certificates" ON medical_certificates FOR ALL
  USING (doctor_id = auth.uid());

CREATE POLICY "Patients view own medical_certificates" ON medical_certificates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = medical_certificates.patient_id
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'patient' AND phone = p.phone)
    )
  );
