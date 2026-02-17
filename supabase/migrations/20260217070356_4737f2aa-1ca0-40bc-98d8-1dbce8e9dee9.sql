-- Drop the broken restrictive policies
DROP POLICY IF EXISTS "Anyone can view challans by public_token" ON public.challans;
DROP POLICY IF EXISTS "Authenticated users can view challans" ON public.challans;

-- Re-create as PERMISSIVE policies (default) so they actually grant access
CREATE POLICY "Authenticated users can view challans"
  ON public.challans FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view challans by public_token"
  ON public.challans FOR SELECT TO anon
  USING (true);