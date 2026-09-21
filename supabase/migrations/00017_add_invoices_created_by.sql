-- Migration 00017: Add created_by to invoices
-- Links invoice to the staff member who created it

ALTER TABLE invoices ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_invoices_created_by ON invoices(created_by);

COMMENT ON COLUMN invoices.created_by IS 'Staff member (admin/nurse/reception) who created this invoice';
