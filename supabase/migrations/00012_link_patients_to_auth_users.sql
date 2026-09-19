-- Migration 00012: Link patients to auth users + Auto-create patient record on signup

-- Add user_id column to patients to link with auth user
ALTER TABLE patients ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX idx_patients_user_id ON patients(user_id);

-- Update the auth trigger to auto-create patient records
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Always create a profile
  INSERT INTO public.profiles (id, full_name, role, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email
  );

  -- If role is patient, also auto-create a patient record
  IF COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient') = 'patient' THEN
    INSERT INTO public.patients (user_id, name, dob, gender, phone, address)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Patient'),
      COALESCE((NEW.raw_user_meta_data->>'dob')::date, '2000-01-01'),
      COALESCE(NEW.raw_user_meta_data->>'gender', 'other'),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      ''
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy for patients to access via user_id
CREATE POLICY "Patients can view own record via user_id"
  ON patients FOR SELECT
  USING (
    user_id = auth.uid()
  );
