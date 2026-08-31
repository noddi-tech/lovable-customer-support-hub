CREATE OR REPLACE FUNCTION public.ensure_google_employee_support_hub_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  uid uuid := auth.uid();
  jwt jsonb := auth.jwt();
  user_email text;
  email_domain text;
  org_id uuid;
  full_name text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  user_email := lower(coalesce(jwt ->> 'email', (jwt -> 'user_metadata' ->> 'email')));
  IF user_email IS NULL OR position('@' in user_email) = 0 THEN
    RAISE EXCEPTION 'no email on token';
  END IF;
  email_domain := split_part(user_email, '@', 2);

  IF email_domain NOT IN ('noddi.no', 'noddi.co') THEN
    RAISE EXCEPTION 'not an employee google account';
  END IF;

  full_name := coalesce(
    jwt -> 'user_metadata' ->> 'full_name',
    jwt -> 'user_metadata' ->> 'name',
    split_part(user_email, '@', 1)
  );

  org_id := public.get_organization_by_email_domain(email_domain);

  INSERT INTO public.profiles (user_id, email, full_name, organization_id, role, is_active)
  VALUES (uid, user_email, full_name, org_id, 'admin', true)
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        is_active = true,
        organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id),
        updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF org_id IS NOT NULL THEN
    INSERT INTO public.organization_memberships (user_id, organization_id, role, status, is_default, joined_at)
    VALUES (uid, org_id, 'admin', 'active', true, now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('user_id', uid, 'email', user_email, 'organization_id', org_id, 'role', 'super_admin');
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_google_employee_support_hub_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_google_employee_support_hub_access() TO authenticated;