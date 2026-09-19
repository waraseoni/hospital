-- Migration 00013: Fix phone constraints for email-based auth

-- Fix profiles: phone should be nullable and not unique (email is primary now)
ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_phone_key;

-- Fix patients: phone should be nullable
ALTER TABLE patients ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE patients ALTER COLUMN phone SET DEFAULT '';

-- Drop and recreate the trigger with fixed logic
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Always create a profile
  INSERT INTO public.profiles (id, full_name, role, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient'),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email
  );

  -- If role is patient, also auto-create a patient record
  IF COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient') = 'patient' THEN
    INSERT INTO public.patients (user_id, name, dob, gender, phone, address)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Patient'),
      '2000-01-01',
      'other',
      NULLIF(NEW.raw_user_meta_data->>'phone', ''),
      ''
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
