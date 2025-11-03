-- Drop and recreate validate_session_context with new signature
DROP FUNCTION IF EXISTS public.validate_session_context();

CREATE FUNCTION public.validate_session_context()
RETURNS TABLE(
  auth_uid uuid, 
  session_valid boolean, 
  organization_id uuid, 
  profile_exists boolean,
  has_memberships boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_uid uuid;
  org_id uuid;
  profile_count integer;
  membership_count integer;
BEGIN
  -- Get current auth uid
  current_uid := auth.uid();
  
  -- Check if we have valid session
  IF current_uid IS NULL THEN
    RETURN QUERY SELECT 
      NULL::uuid,
      false,
      NULL::uuid,
      false,
      false;
    RETURN;
  END IF;
  
  -- Check profile exists
  SELECT COUNT(*) INTO profile_count
  FROM public.profiles p
  WHERE p.user_id = current_uid;
  
  -- Get organization from profile (legacy support)
  SELECT p.organization_id INTO org_id
  FROM public.profiles p 
  WHERE p.user_id = current_uid;
  
  -- Check if user has any memberships (new multi-org support)
  SELECT COUNT(*) INTO membership_count
  FROM public.organization_memberships om
  WHERE om.user_id = current_uid
    AND om.status = 'active';
  
  -- If no legacy org_id, get from first active membership
  IF org_id IS NULL AND membership_count > 0 THEN
    SELECT om.organization_id INTO org_id
    FROM public.organization_memberships om
    WHERE om.user_id = current_uid
      AND om.status = 'active'
      AND om.is_default = true
    LIMIT 1;
    
    -- If no default, get first active
    IF org_id IS NULL THEN
      SELECT om.organization_id INTO org_id
      FROM public.organization_memberships om
      WHERE om.user_id = current_uid
        AND om.status = 'active'
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    current_uid,
    true,
    org_id,
    profile_count > 0,
    membership_count > 0 OR org_id IS NOT NULL;
END;
$$;