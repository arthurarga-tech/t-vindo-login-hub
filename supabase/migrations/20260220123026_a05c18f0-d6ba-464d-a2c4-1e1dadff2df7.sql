-- Rate limit logs: only service role access (via supabase_admin or edge functions)
-- Add a deny-all policy for regular users to satisfy linter
-- Service role bypasses RLS automatically, so edge functions still work
CREATE POLICY "No user access to rate limit logs"
  ON public.rate_limit_logs
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);