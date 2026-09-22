-- Migration 00036: Ambulance Module

CREATE TYPE ambulance_type AS ENUM ('BLS', 'ALS', 'patient_transport', 'neonatal');
CREATE TYPE ambulance_status AS ENUM ('available', 'on_trip', 'maintenance', 'offline');
CREATE TYPE ambulance_call_status AS ENUM ('received', 'assigned', 'en_route', 'arrived', 'completed', 'cancelled');

CREATE TABLE ambulances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_no TEXT NOT NULL UNIQUE,
  ambulance_type ambulance_type NOT NULL DEFAULT 'BLS',
  driver_name TEXT DEFAULT '',
  driver_phone TEXT DEFAULT '',
  status ambulance_status NOT NULL DEFAULT 'available',
  base_location TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on ambulances" ON ambulances FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Staff manage ambulances" ON ambulances FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin', 'nurse')));

CREATE TRIGGER set_ambulances_updated_at BEFORE UPDATE ON ambulances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE ambulance_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_number TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  patient_name TEXT DEFAULT '',
  patient_phone TEXT DEFAULT '',
  pickup_address TEXT NOT NULL DEFAULT '',
  drop_address TEXT DEFAULT '',
  condition_notes TEXT DEFAULT '',
  trip_type TEXT NOT NULL DEFAULT 'emergency' CHECK (trip_type IN ('emergency', 'transfer', 'discharge', 'routine')),
  status ambulance_call_status NOT NULL DEFAULT 'received',
  ambulance_id UUID REFERENCES ambulances(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  distance_km NUMERIC(8,2) DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_amb_calls_status ON ambulance_calls(status);
CREATE INDEX idx_amb_calls_amb ON ambulance_calls(ambulance_id);

ALTER TABLE ambulance_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on ambulance_calls" ON ambulance_calls FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Staff manage ambulance_calls" ON ambulance_calls FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin', 'nurse', 'doctor')));

CREATE TRIGGER set_ambulance_calls_updated_at BEFORE UPDATE ON ambulance_calls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_ambulance_calls AFTER INSERT OR UPDATE OR DELETE ON ambulance_calls
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();
