-- Revoke anon SELECT from all user-data tables.
-- Anon has no business reading any of these tables at any time.
REVOKE SELECT ON public.ai_recommendations FROM anon;
REVOKE SELECT ON public.audits FROM anon;
REVOKE SELECT ON public.page_results FROM anon;
REVOKE SELECT ON public.user_api_keys FROM anon;
REVOKE SELECT ON public.users FROM anon;

-- Revoke authenticated SELECT from tables that are only accessed via the
-- server (service-role key). The client never queries these directly.
REVOKE SELECT ON public.ai_recommendations FROM authenticated;
REVOKE SELECT ON public.audits FROM authenticated;
REVOKE SELECT ON public.page_results FROM authenticated;
REVOKE SELECT ON public.user_api_keys FROM authenticated;

-- Keep SELECT on public.users for authenticated: the client auth-store
-- queries this table directly with the user's JWT to load the profile.

-- Remove public RPC access to handle_new_user.
-- It must only be invoked by the internal trigger (runs as the definer),
-- never exposed via PostgREST.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
