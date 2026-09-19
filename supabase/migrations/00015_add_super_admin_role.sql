-- Migration: Add super_admin role
-- Adds 'super_admin' to the user_role ENUM type

-- Step 1: Add super_admin to the ENUM
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin';

-- Step 2: Update RLS policies to include super_admin where admin is checked
-- Profiles: super_admin gets full access like admin
DROP POLICY IF EXISTS "Admins have full access on profiles" ON profiles;
CREATE POLICY "Admins have full access on profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Profiles: super_admin can view other profiles
DROP POLICY IF EXISTS "Medical staff can view other profiles" ON profiles;
CREATE POLICY "Medical staff can view other profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'doctor', 'nurse', 'lab')
    )
  );

-- Beds policies
DROP POLICY IF EXISTS "Admins can manage beds" ON beds;
CREATE POLICY "Admins can manage beds"
  ON beds FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Lab reports policies
DROP POLICY IF EXISTS "Admins have full access on lab_reports" ON lab_reports;
CREATE POLICY "Admins have full access on lab_reports"
  ON lab_reports FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Appointments policies
DROP POLICY IF EXISTS "Admins can manage appointments" ON appointments;
CREATE POLICY "Admins can manage appointments"
  ON appointments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Patients policies
DROP POLICY IF EXISTS "Admins can manage patients" ON patients;
CREATE POLICY "Admins can manage patients"
  ON patients FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Prescriptions policies
DROP POLICY IF EXISTS "Admins can manage prescriptions" ON prescriptions;
CREATE POLICY "Admins can manage prescriptions"
  ON prescriptions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Vitals policies
DROP POLICY IF EXISTS "Admins can manage vitals" ON vitals_records;
CREATE POLICY "Admins can manage vitals"
  ON vitals_records FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Inventory policies
DROP POLICY IF EXISTS "Admins have full access on inventory_items" ON inventory_items;
CREATE POLICY "Admins have full access on inventory_items"
  ON inventory_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Audit logs policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- WhatsApp logs policies
DROP POLICY IF EXISTS "Admins can manage whatsapp_logs" ON whatsapp_logs;
CREATE POLICY "Admins can manage whatsapp_logs"
  ON whatsapp_logs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Invoices policies
DROP POLICY IF EXISTS "Admins can manage invoices" ON invoices;
CREATE POLICY "Admins can manage invoices"
  ON invoices FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
