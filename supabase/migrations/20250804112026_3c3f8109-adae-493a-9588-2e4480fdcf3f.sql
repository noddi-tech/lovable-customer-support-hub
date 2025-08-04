-- Add forwarding_address field to email_accounts for the unique forwarding email
ALTER TABLE public.email_accounts 
ADD COLUMN forwarding_address text;

-- Add index for faster lookups
CREATE INDEX idx_email_accounts_forwarding_address ON public.email_accounts(forwarding_address);

-- Update the get_email_accounts function to include forwarding_address
CREATE OR REPLACE FUNCTION public.get_email_accounts()
RETURNS TABLE(id uuid, email_address text, provider text, is_active boolean, last_sync_at timestamp with time zone, created_at timestamp with time zone, forwarding_address text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT id, email_address, provider, is_active, last_sync_at, created_at, forwarding_address
  FROM public.email_accounts
  WHERE organization_id = public.get_user_organization_id()
  ORDER BY created_at DESC;
$$;