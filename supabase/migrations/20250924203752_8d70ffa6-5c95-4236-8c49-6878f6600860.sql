-- Create a function to determine correct inbox based on email address
CREATE OR REPLACE FUNCTION public.get_inbox_for_email(recipient_email TEXT, org_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  target_inbox_id UUID;
BEGIN
  -- First try to find via email_accounts table (for synced accounts)
  SELECT ea.inbox_id INTO target_inbox_id
  FROM public.email_accounts ea
  WHERE ea.email_address = recipient_email
    AND ea.organization_id = org_id
    AND ea.inbox_id IS NOT NULL
  LIMIT 1;
  
  -- If found via email_accounts, return it
  IF target_inbox_id IS NOT NULL THEN
    RETURN target_inbox_id;
  END IF;
  
  -- Then try to find via inbound_routes table (for inbound routing)
  SELECT ir.inbox_id INTO target_inbox_id
  FROM public.inbound_routes ir
  WHERE ir.address = recipient_email
    AND ir.organization_id = org_id
    AND ir.inbox_id IS NOT NULL
    AND ir.is_active = true
  LIMIT 1;
  
  -- If found via inbound_routes, return it
  IF target_inbox_id IS NOT NULL THEN
    RETURN target_inbox_id;
  END IF;
  
  -- Fallback: return the default inbox for the organization
  SELECT i.id INTO target_inbox_id
  FROM public.inboxes i
  WHERE i.organization_id = org_id
    AND i.is_default = true
  LIMIT 1;
  
  RETURN target_inbox_id;
END;
$$;