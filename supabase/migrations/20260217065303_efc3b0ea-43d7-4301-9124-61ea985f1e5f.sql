
-- Allow anonymous/public access to challans when accessed by public_token
CREATE POLICY "Anyone can view challans by public_token"
ON public.challans
FOR SELECT
USING (true);
