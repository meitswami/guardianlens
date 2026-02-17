
-- Fix profiles RLS: restrict SELECT to own profile + admins
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

-- Make evidence bucket private
UPDATE storage.buckets SET public = false WHERE id = 'evidence';

-- Fix evidence storage policies: remove public access, add role-based
DROP POLICY IF EXISTS "Anyone can view evidence" ON storage.objects;
DROP POLICY IF EXISTS "Staff can view evidence" ON storage.objects;
CREATE POLICY "Staff can view evidence"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'evidence' AND (is_admin() OR is_operator()));

-- Tighten challan_payments: restrict insert to authenticated users only (not anon)
DROP POLICY IF EXISTS "Anyone can insert payments" ON public.challan_payments;
CREATE POLICY "Authenticated users can insert payments"
  ON public.challan_payments FOR INSERT TO authenticated
  WITH CHECK (true);

-- Tighten processing_queue SELECT: staff only
DROP POLICY IF EXISTS "Authenticated users can view queue" ON public.processing_queue;
CREATE POLICY "Staff can view queue"
  ON public.processing_queue FOR SELECT
  USING (is_admin() OR is_operator());

-- Tighten system_settings SELECT: staff only
DROP POLICY IF EXISTS "Anyone authenticated can view settings" ON public.system_settings;
CREATE POLICY "Staff can view settings"
  ON public.system_settings FOR SELECT
  USING (is_admin() OR is_operator());
