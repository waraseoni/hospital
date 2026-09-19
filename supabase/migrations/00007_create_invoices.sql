-- Migration 00007: Invoices & Billing

CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'upi', 'insurance');

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_method payment_method,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  pdf_url TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/*
  line_items JSONB structure:
  [
    {
      "description": "OPD Consultation",
      "category": "opd",
      "amount": 500,
      "quantity": 1
    }
  ]
*/

CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(payment_status);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins full access on invoices"
  ON invoices FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Staff can create and view invoices
CREATE POLICY "Staff can manage invoices"
  ON invoices FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

-- Doctors can view invoices (for context)
CREATE POLICY "Doctors can view invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor')
  );

-- Patients can view their own invoices
CREATE POLICY "Patients view own invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = invoices.patient_id
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'patient' AND phone = p.phone)
    )
  );

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
