-- Migration: Add invite functionality to organization_memberships

-- 1. Add invite columns
ALTER TABLE public.organization_memberships
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS invite_token UUID UNIQUE DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
ADD COLUMN IF NOT EXISTS invited_by_id UUID REFERENCES auth.users(id);

-- 2. Allow NULL user_id for pending invites
ALTER TABLE public.organization_memberships
ALTER COLUMN user_id DROP NOT NULL;

-- 3. Create indexes for invite lookups
CREATE INDEX IF NOT EXISTS idx_org_memberships_invite_token 
ON public.organization_memberships(invite_token)
WHERE invite_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_memberships_email_pending
ON public.organization_memberships(email, status)
WHERE status = 'pending';

-- 4. Add check constraints for data integrity
ALTER TABLE public.organization_memberships
DROP CONSTRAINT IF EXISTS check_pending_has_email,
DROP CONSTRAINT IF EXISTS check_active_has_user;

ALTER TABLE public.organization_memberships
ADD CONSTRAINT check_pending_has_email 
CHECK (status != 'pending' OR email IS NOT NULL);

ALTER TABLE public.organization_memberships
ADD CONSTRAINT check_active_has_user 
CHECK (status != 'active' OR user_id IS NOT NULL);

-- 5. Update handle_new_user function to prioritize invites
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = 'public'
AS $$
DECLARE
  user_email text;
  email_domain text;
  org_id uuid;
  pending_invite RECORD;
BEGIN
  user_email := NEW.email;
  email_domain := split_part(user_email, '@', 2);
  
  -- PRIORITY 1: Check for pending organization invite
  SELECT * INTO pending_invite
  FROM public.organization_memberships
  WHERE email = user_email
    AND status = 'pending'
    AND invite_expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF pending_invite.id IS NOT NULL THEN
    -- Accept the invite: activate the membership
    UPDATE public.organization_memberships
    SET 
      user_id = NEW.id,
      status = 'active',
      joined_at = NOW(),
      updated_at = NOW(),
      email = NULL,
      invite_token = NULL
    WHERE id = pending_invite.id;
    
    org_id := pending_invite.organization_id;
    
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
      pending_invite.role,
      true
    );
    
    -- Log invite acceptance
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
    
    -- Create default membership entry
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
    
    -- Log domain-based assignment
    RAISE LOG 'User % assigned to organization % via domain %', user_email, org_id, email_domain;
  END IF;
  
  RETURN NEW;
END;
$$;