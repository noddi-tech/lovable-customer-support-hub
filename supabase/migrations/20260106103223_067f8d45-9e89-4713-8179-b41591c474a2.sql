-- Update handle_new_user trigger to look for 'invited' status instead of 'pending'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_email text;
  email_domain text;
  org_id uuid;
  invited_membership RECORD;
BEGIN
  user_email := NEW.email;
  email_domain := split_part(user_email, '@', 2);
  
  -- PRIORITY 1: Check for invited organization membership
  SELECT * INTO invited_membership
  FROM public.organization_memberships
  WHERE email = user_email
    AND status = 'invited'
    AND invite_expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF invited_membership.id IS NOT NULL THEN
    -- Accept the invite: activate the membership
    UPDATE public.organization_memberships
    SET 
      user_id = NEW.id,
      status = 'active',
      joined_at = NOW(),
      updated_at = NOW(),
      email = NULL,
      invite_token = NULL
    WHERE id = invited_membership.id;
    
    org_id := invited_membership.organization_id;
    
    -- Create profile with role from invite
    INSERT INTO public.profiles (
      user_id, 
      email, 
      full_name, 
      organization_id,
      role,
      is_active
    )
    VALUES (
      NEW.id, 
      user_email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(user_email, '@', 1)),
      org_id,
      invited_membership.role,
      true
    );
    
    RAISE LOG 'User % accepted invite to organization %', user_email, org_id;
    
  ELSE
    -- PRIORITY 2: Email domain-based assignment (existing logic)
    org_id := public.get_organization_by_email_domain(email_domain);
    
    INSERT INTO public.profiles (
      user_id, 
      email, 
      full_name, 
      organization_id,
      role,
      is_active
    )
    VALUES (
      NEW.id, 
      user_email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(user_email, '@', 1)),
      org_id,
      'agent',
      true
    );
    
    INSERT INTO public.organization_memberships (
      user_id,
      organization_id,
      role,
      status,
      is_default,
      joined_at
    )
    VALUES (
      NEW.id,
      org_id,
      'agent',
      'active',
      true,
      NOW()
    );
    
    RAISE LOG 'User % assigned to organization % via domain %', user_email, org_id, email_domain;
  END IF;
  
  RETURN NEW;
END;
$$;