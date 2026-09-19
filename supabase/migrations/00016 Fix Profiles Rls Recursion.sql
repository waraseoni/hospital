-- Migration: Fix infinite recursion in profiles RLS policies
-- Problem: Policies were doing SELECT FROM profiles within profiles policies
-- which causes infinite recursion. Fix: use SECURITY DEFINER function.

-- Helper function to get current user's role without triggering RLS
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::TEXT FROM profiles WHERE id = auth.uid()),
    ''
  );
$$;

-- Drop all old recursive policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins have full access on profiles" ON profiles;
DROP POLICY IF EXISTS "Medical staff can view other profiles" ON profiles;

-- 1. Users can always read their own profile (no recursion)
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 2. Admins (admin + super_admin) have full access using SECURITY DEFINER function
CREATE POLICY "Admins have full access on profiles"
  ON profiles FOR ALL
  USING (get_my_role() IN ('admin', 'super_admin'));

-- 3. Medical staff can view other profiles
CREATE POLICY "Medical staff can view other profiles"
  ON profiles FOR SELECT
  USING (get_my_role() IN ('admin', 'super_admin', 'doctor', 'nurse', 'lab'));

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;