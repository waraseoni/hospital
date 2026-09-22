-- Migration 00033: Staff Attendance, Leaves & Duty Roster

CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'half_day', 'leave');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE leave_type AS ENUM ('sick', 'casual', 'earned', 'maternity', 'unpaid', 'other');
CREATE TYPE roster_shift AS ENUM ('morning', 'evening', 'night', 'general');

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL DEFAULT 'present',
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  marked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, work_date)
);

CREATE INDEX idx_attendance_date ON attendance(work_date);
CREATE INDEX idx_attendance_staff ON attendance(staff_id);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on attendance" ON attendance FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Staff manage own attendance" ON attendance FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'doctor', 'nurse', 'lab', 'admin')));

CREATE TRIGGER set_attendance_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL DEFAULT 'casual',
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status leave_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approval_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leaves_status ON leaves(status);
CREATE INDEX idx_leaves_staff ON leaves(staff_id);

ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on leaves" ON leaves FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Staff manage own leaves" ON leaves FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'doctor', 'nurse', 'lab', 'admin')));

CREATE TRIGGER set_leaves_updated_at BEFORE UPDATE ON leaves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  roster_date DATE NOT NULL,
  shift roster_shift NOT NULL DEFAULT 'general',
  department TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, roster_date, shift)
);

CREATE INDEX idx_rosters_date ON rosters(roster_date);

ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on rosters" ON rosters FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Staff view rosters" ON rosters FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'doctor', 'nurse', 'lab', 'admin')));

CREATE TRIGGER set_rosters_updated_at BEFORE UPDATE ON rosters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_attendance AFTER INSERT OR UPDATE OR DELETE ON attendance
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();
CREATE TRIGGER audit_leaves AFTER INSERT OR UPDATE OR DELETE ON leaves
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();
