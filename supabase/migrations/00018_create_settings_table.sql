-- Migration 00018: Settings / Hospital Profile
-- Key-value JSONB table for org settings (single row)

CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_name TEXT NOT NULL DEFAULT 'Hospital',
  hospital_address TEXT DEFAULT '',
  hospital_phone TEXT DEFAULT '',
  hospital_email TEXT DEFAULT '',
  hospital_gstin TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  receipt_footer TEXT DEFAULT 'Thank you for choosing our hospital.',
  whatsapp_number TEXT DEFAULT '',
  upi_id TEXT DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'INR',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins manage settings"
  ON settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Everyone can read settings (for PDFs, display, etc.)
CREATE POLICY "All authenticated users can read settings"
  ON settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER set_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed default settings row
INSERT INTO settings (hospital_name) VALUES ('Hospital Management System');
