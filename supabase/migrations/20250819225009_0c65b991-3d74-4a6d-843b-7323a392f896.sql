-- Create function to get the last call event timestamp for an organization
CREATE OR REPLACE FUNCTION public.get_last_call_event(org_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT created_at::text
  FROM public.call_events
  WHERE organization_id = org_id
  ORDER BY created_at DESC
  LIMIT 1;
$$;