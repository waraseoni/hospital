-- Migration 00019: Doctor Schedule & Slot Booking
-- Defines available time slots per doctor per weekday

CREATE TABLE doctor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_time < end_time),
  UNIQUE (doctor_id, weekday, start_time)
);

CREATE INDEX idx_doctor_schedules_doctor ON doctor_schedules(doctor_id);
CREATE INDEX idx_doctor_schedules_weekday ON doctor_schedules(weekday);

ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins manage doctor schedules"
  ON doctor_schedules FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Doctors can view and update their own schedules
CREATE POLICY "Doctors manage own schedules"
  ON doctor_schedules FOR ALL
  USING (
    doctor_id = auth.uid()
  );

-- Staff can view all schedules (for reception booking)
CREATE POLICY "Staff can view doctor schedules"
  ON doctor_schedules FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin', 'nurse'))
  );

CREATE TRIGGER set_doctor_schedules_updated_at
  BEFORE UPDATE ON doctor_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
