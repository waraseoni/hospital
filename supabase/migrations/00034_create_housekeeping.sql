-- Migration 00034: Housekeeping Workflow

CREATE TYPE hk_task_type AS ENUM ('deep', 'regular', 'discharge', 'spill');
CREATE TYPE hk_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');

CREATE TABLE housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
  room_label TEXT NOT NULL DEFAULT '',
  task_type hk_task_type NOT NULL DEFAULT 'regular',
  status hk_status NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hk_status ON housekeeping_tasks(status);
CREATE INDEX idx_hk_bed ON housekeeping_tasks(bed_id);

ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on housekeeping_tasks" ON housekeeping_tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Staff manage housekeeping_tasks" ON housekeeping_tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'nurse', 'admin')));
CREATE POLICY "Doctors view housekeeping_tasks" ON housekeeping_tasks FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'));

CREATE TRIGGER set_housekeeping_tasks_updated_at BEFORE UPDATE ON housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_housekeeping AFTER INSERT OR UPDATE OR DELETE ON housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();
