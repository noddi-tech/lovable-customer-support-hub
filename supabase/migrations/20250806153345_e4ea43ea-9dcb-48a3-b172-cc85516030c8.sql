-- Drop and recreate the get_email_accounts function with proper numeric return type
DROP FUNCTION public.get_email_accounts();

CREATE OR REPLACE FUNCTION public.get_email_accounts()
 RETURNS TABLE(id uuid, email_address text, provider text, is_active boolean, last_sync_at timestamp with time zone, created_at timestamp with time zone, forwarding_address text, inbox_id uuid, auto_sync_enabled boolean, sync_interval_minutes numeric)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT id, email_address, provider, is_active, last_sync_at, created_at, forwarding_address, inbox_id, auto_sync_enabled, sync_interval_minutes
  FROM public.email_accounts
  WHERE organization_id = public.get_user_organization_id()
  ORDER BY created_at DESC;
$function$