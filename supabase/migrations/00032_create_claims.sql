-- Migration 00032: Insurance / TPA Claims

CREATE TYPE claim_stage AS ENUM ('intimation', 'preauth', 'claim', 'settled', 'rejected');
CREATE TYPE claim_status AS ENUM ('draft', 'submitted', 'approved', 'paid', 'rejected');

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number TEXT NOT NULL UNIQUE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  panel_id UUID REFERENCES insurance_panels(id) ON DELETE SET NULL,
  insurer_code TEXT NOT NULL DEFAULT '',
  policy_no TEXT DEFAULT '',
  approval_no TEXT DEFAULT '',
  stage claim_stage NOT NULL DEFAULT 'intimation',
  status claim_status NOT NULL DEFAULT 'draft',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claims_invoice ON claims(invoice_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_stage ON claims(stage);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on claims"
  ON claims FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Staff manage claims"
  ON claims FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'admin')));

CREATE POLICY "Doctors view claims"
  ON claims FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'));

CREATE TRIGGER set_claims_updated_at
  BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER audit_claims
  AFTER INSERT OR UPDATE OR DELETE ON claims
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();
