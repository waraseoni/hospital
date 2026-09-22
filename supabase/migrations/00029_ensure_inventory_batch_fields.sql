-- Migration 00029: Ensure inventory batch/expiry/supplier fields exist

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'supplier') THEN
    ALTER TABLE inventory_items ADD COLUMN supplier TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'expiry_date') THEN
    ALTER TABLE inventory_items ADD COLUMN expiry_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_items' AND column_name = 'batch_number') THEN
    ALTER TABLE inventory_items ADD COLUMN batch_number TEXT;
  END IF;
END $$;
