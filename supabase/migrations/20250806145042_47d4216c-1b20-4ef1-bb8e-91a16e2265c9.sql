-- Update the get_email_accounts function to include inbox_id
CREATE OR REPLACE FUNCTION public.get_email_accounts()
 RETURNS TABLE(id uuid, email_address text, provider text, is_active boolean, last_sync_at timestamp with time zone, created_at timestamp with time zone, forwarding_address text, inbox_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT id, email_address, provider, is_active, last_sync_at, created_at, forwarding_address, inbox_id
  FROM public.email_accounts
  WHERE organization_id = public.get_user_organization_id()
  ORDER BY created_at DESC;
$function$