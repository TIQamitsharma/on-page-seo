-- Revoke ALL remaining privileges from anon on every user-data table.
-- Anon visitors must never be able to touch these tables.
REVOKE ALL ON public.ai_recommendations FROM anon;
REVOKE ALL ON public.audits FROM anon;
REVOKE ALL ON public.page_results FROM anon;
REVOKE ALL ON public.user_api_keys FROM anon;
REVOKE ALL ON public.users FROM anon;

-- Revoke write/admin privileges from authenticated on tables that are
-- only touched by the server via service-role key.
-- (SELECT was already revoked; clean up the rest too.)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.ai_recommendations FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.audits FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.page_results FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.user_api_keys FROM authenticated;

-- For public.users the client reads (SELECT kept) and updates its own row via
-- the RLS UPDATE policy, so keep INSERT/UPDATE for authenticated but drop the rest.
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.users FROM authenticated;
