-- Create function to validate database session context
CREATE OR REPLACE FUNCTION public.validate_session_context()
RETURNS TABLE(
  auth_uid uuid,
  session_valid boolean,
  organization_id uuid,
  profile_exists boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_uid uuid;
  org_id uuid;
  profile_count integer;
BEGIN
  -- Get current auth uid
  current_uid := auth.uid();
  
  -- Check if we have an organization
  IF current_uid IS NOT NULL THEN
    SELECT p.organization_id INTO org_id
    FROM public.profiles p 
    WHERE p.user_id = current_uid;
    
    -- Count profiles to verify existence
    SELECT COUNT(*) INTO profile_count
    FROM public.profiles p
    WHERE p.user_id = current_uid;
  END IF;
  
  RETURN QUERY SELECT 
    current_uid,
    current_uid IS NOT NULL,
    org_id,
    profile_count > 0;
END;
$$;