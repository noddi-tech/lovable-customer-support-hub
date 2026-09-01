REVOKE EXECUTE ON FUNCTION public.get_inboxes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_inboxes() TO authenticated, service_role;