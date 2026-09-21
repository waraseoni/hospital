-- Migration 00021: Progress Notes / Case Sheet
-- Doctors can add notes during OPD or IPD encounters

CREATE TABLE progress_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  admission_id UUID REFERENCES admissions(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  note_type TEXT NOT NULL DEFAULT 'opd' CHECK (note_type IN ('opd', 'ipd', 'emergency')),
  subjective TEXT DEFAULT '',
  objective TEXT DEFAULT '',
  assessment TEXT DEFAULT '',
  plan TEXT DEFAULT '',
  vitals_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_progress_notes_patient ON progress_notes(patient_id);
CREATE INDEX idx_progress_notes_doctor ON progress_notes(doctor_id);
CREATE INDEX idx_progress_notes_admission ON progress_notes(admission_id);

ALTER TABLE progress_notes ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins manage progress_notes"
  ON progress_notes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Doctors can manage their own notes
CREATE POLICY "Doctors manage own progress_notes"
  ON progress_notes FOR ALL
  USING (
    doctor_id = auth.uid()
  );

-- Nurses can view progress notes
CREATE POLICY "Nurses can view progress_notes"
  ON progress_notes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'nurse')
  );

-- Patients can view their own notes
CREATE POLICY "Patients view own progress_notes"
  ON progress_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = progress_notes.patient_id
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'patient' AND phone = p.phone)
    )
  );
