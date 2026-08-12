-- Google employee login: only Noddi staff have company Google accounts.
-- Treat as Support Hub super_admin for RLS + full org access.

create or replace function public.user_has_google_identity(uid uuid)
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
  )
  or exists (
    select 1
    from auth.users u
    where u.id = uid
      and (
        coalesce(u.raw_app_meta_data ->> 'provider', '') = 'google'
        or coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'google'
      )
  );
$$;

comment on function public.user_has_google_identity(uuid) is
  'True when the auth user signed in via Google OAuth.';

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
  'Idempotent bootstrap: Google OAuth (Noddi employees) → profiles + super_admin. Unrestricted org scope.';

revoke all on function public.user_has_google_identity(uuid) from public;
revoke all on function public.ensure_google_employee_support_hub_access() from public;

grant execute on function public.user_has_google_identity(uuid) to authenticated;
grant execute on function public.ensure_google_employee_support_hub_access() to authenticated;
