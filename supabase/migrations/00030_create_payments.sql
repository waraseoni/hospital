-- Migration 00030: Payments (partial/full payment tracking)

CREATE TYPE payment_method AS ENUM ('cash', 'card', 'upi', 'insurance', 'other');

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL DEFAULT 'cash',
  reference TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on payments"
  ON payments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Staff manage payments"
  ON payments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')));

CREATE POLICY "Doctors view payments"
  ON payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'));

CREATE POLICY "Patients view own invoice payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN patients p ON p.id = i.patient_id
      WHERE i.id = payments.invoice_id
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'patient' AND phone = p.phone)
    )
  );

CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();
