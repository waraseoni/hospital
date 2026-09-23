-- Migration 00040: Fix profiles.phone unique constraint
-- phone is NOT unique in a hospital (family members share phones, staff share)
-- Dropping UNIQUE to prevent "Database error creating new user" on duplicate phone=''

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%_phone_key%'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_phone_key;
  END IF;
END $$;
