-- Harden Google-employee superuser bootstrap (defense in depth).
--
-- The prior migration (20260812190000) granted super_admin to ANY Google OAuth
-- session, relying solely on the Supabase Google provider being configured with
-- an `hd=noddi.no` hosted-domain restriction. Provider misconfiguration (or a
-- future provider change) would let any gmail.com account escalate to
-- network-wide super_admin. Enforce the employee domain in the database too.
--
-- Requirement: a **verified** Google identity whose email is on an allowed
-- employee domain (noddi.no). The domain must come from the Google identity
-- itself, not auth.users.email (which could be set via another linked provider).

create or replace function public.user_is_noddi_google_employee(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.identities i
    where i.user_id = uid
      and i.provider = 'google'
      and lower(coalesce(i.identity_data ->> 'email', '')) like '%@noddi.no'
      and coalesce(i.identity_data ->> 'email_verified', 'false') in ('true', 't', '1', 'True')
  );
$$;

comment on function public.user_is_noddi_google_employee(uuid) is
  'True only for a verified Google identity on the noddi.no employee domain.';

create or replace function public.ensure_google_employee_support_hub_access()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  uemail text;
  ufullname text;
  org_id uuid;
  prow public.profiles;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not public.user_has_google_identity(uid) then
    raise exception
      'google_required: only Google OAuth sessions may use ensure_google_employee_support_hub_access'
      using errcode = '42501';
  end if;

  -- Defense in depth: require a verified Google identity on the employee domain.
  -- Do NOT trust the Supabase provider config alone for this authorization.
  if not public.user_is_noddi_google_employee(uid) then
    raise exception
      'not_employee: Google super_admin restricted to verified noddi.no accounts'
      using errcode = '42501';
  end if;

  select
    u.email,
    coalesce(
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      nullif(u.raw_user_meta_data ->> 'preferred_username', ''),
      split_part(coalesce(u.email, 'user'), '@', 1)
    )
  into uemail, ufullname
  from auth.users u
  where u.id = uid;

  if uemail is null or uemail = '' then
    select coalesce(
      nullif(u.email, ''),
      nullif(u.raw_user_meta_data ->> 'email', ''),
      (
        select nullif(i.identity_data ->> 'email', '')
        from auth.identities i
        where i.user_id = uid
        order by i.updated_at desc nulls last
        limit 1
      )
    )
    into uemail
    from auth.users u
    where u.id = uid;
  end if;

  if uemail is null or uemail = '' then
    raise exception 'email_required: Google user must have an email'
      using errcode = '22023';
  end if;

  -- Belt and suspenders: the resolved email must also be on the employee domain.
  if lower(split_part(uemail, '@', 2)) <> 'noddi.no' then
    raise exception
      'not_employee: Google super_admin restricted to noddi.no accounts'
      using errcode = '42501';
  end if;

  org_id := public.get_organization_by_email_domain(split_part(uemail, '@', 2));

  select * into prow from public.profiles where user_id = uid;

  if found then
    update public.profiles
    set email = uemail,
        full_name = coalesce(nullif(ufullname, ''), full_name),
        role = 'super_admin',
        primary_role = 'super_admin'::public.app_role,
        is_active = true,
        organization_id = coalesce(organization_id, org_id),
        updated_at = now()
    where user_id = uid
    returning * into prow;
  else
    insert into public.profiles (
      user_id,
      email,
      full_name,
      organization_id,
      role,
      primary_role,
      is_active
    )
    values (
      uid,
      uemail,
      ufullname,
      org_id,
      'super_admin',
      'super_admin'::public.app_role,
      true
    )
    returning * into prow;
  end if;

  insert into public.user_roles (user_id, role, created_by_id)
  values (uid, 'super_admin'::public.app_role, uid)
  on conflict (user_id, role) do nothing;

  -- Membership on domain org when available (optional convenience).
  if org_id is not null and not exists (
    select 1
    from public.organization_memberships m
    where m.user_id = uid
      and m.organization_id = org_id
      and m.status = 'active'
  ) then
    insert into public.organization_memberships (
      user_id,
      organization_id,
      role,
      status,
      is_default,
      joined_at
    )
    values (
      uid,
      org_id,
      'super_admin'::public.app_role,
      'active',
      true,
      now()
    );
  end if;

  return prow;
end;
$$;

comment on function public.ensure_google_employee_support_hub_access() is
  'Idempotent bootstrap: verified noddi.no Google identity → profiles + super_admin. Domain-guarded.';

revoke all on function public.user_is_noddi_google_employee(uuid) from public;
grant execute on function public.user_is_noddi_google_employee(uuid) to authenticated;
