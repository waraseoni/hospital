-- Migration 00039: Integration & Advanced — e-Signature + FHIR + Branches

-- ---------------------------------------------------------------------------
-- e-Prescription digital signature
--   * doctors upload their signature image to their profile
--   * prescriptions snapshot the signature_url used at generation time
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN signature_url TEXT;
ALTER TABLE prescriptions ADD COLUMN signature_url TEXT;

-- Signature images bucket (public, like avatars, so PDFs can embed them)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('signatures', 'signatures', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view signatures"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'signatures');

CREATE POLICY "Authenticated users can upload signatures"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'signatures');

-- ---------------------------------------------------------------------------
-- Multi-branch / Organization support (foundation)
--   * branches table — hospital branch locations
--   * settings.branch_id — single active branch for the hospital instance
--   Full row-level organization_id scoping across every table is the
--   documented future extension (docs/IMPLEMENTATION_PLAN.md Phase 7 #5).
-- ---------------------------------------------------------------------------
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_branches_active ON branches(is_active);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage branches"
  ON branches FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "All authenticated users can read branches"
  ON branches FOR SELECT
  TO authenticated
  USING (true);

-- Seed a default branch for existing installs
INSERT INTO branches (name)
SELECT 'Main Branch'
WHERE NOT EXISTS (SELECT 1 FROM branches);

ALTER TABLE settings ADD COLUMN branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

UPDATE settings SET branch_id = (SELECT id FROM branches ORDER BY created_at LIMIT 1)
WHERE branch_id IS NULL AND EXISTS (SELECT 1 FROM branches);