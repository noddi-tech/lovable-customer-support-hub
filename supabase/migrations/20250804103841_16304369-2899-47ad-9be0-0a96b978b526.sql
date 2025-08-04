-- Fix security issues by setting proper search_path for functions

-- Update get_email_accounts function
CREATE OR REPLACE FUNCTION public.get_email_accounts()
 RETURNS TABLE(id uuid, email_address text, provider text, is_active boolean, last_sync_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT id, email_address, provider, is_active, last_sync_at, created_at
  FROM public.email_accounts
  WHERE organization_id = public.get_user_organization_id()
  ORDER BY created_at DESC;
$function$;

-- Update get_conversations function  
CREATE OR REPLACE FUNCTION public.get_conversations()
 RETURNS TABLE(id uuid, subject text, status text, priority text, is_read boolean, channel text, updated_at timestamp with time zone, customer jsonb, assigned_to jsonb)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT 
    c.id,
    c.subject,
    c.status,
    c.priority,
    c.is_read,
    c.channel::TEXT,
    c.updated_at,
    CASE 
      WHEN cu.id IS NOT NULL 
      THEN jsonb_build_object('id', cu.id, 'full_name', cu.full_name, 'email', cu.email)
      ELSE NULL 
    END as customer,
    CASE 
      WHEN p.id IS NOT NULL 
      THEN jsonb_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url)
      ELSE NULL 
    END as assigned_to
  FROM public.conversations c
  LEFT JOIN public.customers cu ON c.customer_id = cu.id
  LEFT JOIN public.profiles p ON c.assigned_to_id = p.user_id
  WHERE c.organization_id = public.get_user_organization_id()
  ORDER BY c.updated_at DESC;
$function$;

-- Update delete_email_account function
CREATE OR REPLACE FUNCTION public.delete_email_account(account_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  DELETE FROM public.email_accounts 
  WHERE id = account_id 
  AND organization_id = public.get_user_organization_id();
$function$;