-- Migration 00011: Supabase Storage Buckets & Policies

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('prescriptions', 'prescriptions', false, 10485760, ARRAY['application/pdf']),
  ('lab-reports', 'lab-reports', false, 10485760, ARRAY['application/pdf']),
  ('invoices', 'invoices', false, 10485760, ARRAY['application/pdf']),
  ('scans', 'scans', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/dicom', 'application/dicom']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Prescriptions bucket policies
CREATE POLICY "Authenticated users can upload prescriptions"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'prescriptions');

CREATE POLICY "Users can read own prescriptions"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'prescriptions');

-- Lab reports bucket policies
CREATE POLICY "Authenticated users can upload lab reports"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'lab-reports');

CREATE POLICY "Users can read lab reports"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'lab-reports');

-- Invoices bucket policies
CREATE POLICY "Authenticated users can upload invoices"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Users can read invoices"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'invoices');

-- Scans bucket policies
CREATE POLICY "Lab staff can upload scans"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'scans');

CREATE POLICY "Medical staff can read scans"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'scans');

-- Avatars bucket policies
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');
