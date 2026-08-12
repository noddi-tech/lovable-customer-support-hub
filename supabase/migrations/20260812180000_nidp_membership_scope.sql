-- NIDP membership scope: map local orgs/depts to navio-core SO/SD ids,
-- provision Navio sessions without auto super_admin, sync memberships from claims.

-- ---------------------------------------------------------------------------
-- 1. Mapping columns
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column if not exists navio_organization_id integer;

create unique index if not exists organizations_navio_organization_id_key
  on public.organizations (navio_organization_id)
  where navio_organization_id is not null;

comment on column public.organizations.navio_organization_id is
  'navio-core ServiceOrganization.id; used to map product IdP membership claims to local orgs';

alter table public.departments
  add column if not exists navio_department_id integer,
  add column if not exists slug text;

create unique index if not exists departments_navio_department_id_key
  on public.departments (navio_department_id)
  where navio_department_id is not null;

create unique index if not exists departments_org_slug_key
  on public.departments (organization_id, slug)
  where slug is not null;

comment on column public.departments.navio_department_id is
  'navio-core ServiceDepartment.id; optional link for claim-scoped department access';

-- Ops: set organizations.navio_organization_id to the navio-core ServiceOrganization.id
-- for each Support Hub org (required for claim → local membership sync).

-- ---------------------------------------------------------------------------
-- 2. Provision: profile only (no auto super_admin)
-- ---------------------------------------------------------------------------

create or replace function public.ensure_authentik_support_hub_access()
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

  if not public.user_has_navio_authentik_identity(uid) then
    raise exception
      'authentik_required: only product IdP (Sign in with Navio / custom:navio) may auto-provision Support Hub access'
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
    raise exception 'email_required: Navio user must have an email claim'
      using errcode = '22023';
  end if;

  -- Optional domain default; membership sync is authoritative for multi-org.
  org_id := public.get_organization_by_email_domain(split_part(uemail, '@', 2));

  select * into prow from public.profiles where user_id = uid;

  if found then
    update public.profiles
    set email = uemail,
        full_name = coalesce(nullif(ufullname, ''), full_name),
        is_active = true,
        -- Keep existing role; do not force super_admin.
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
      'agent',
      'agent'::public.app_role,
      true
    )
    returning * into prow;
  end if;

  -- Ensure a baseline app role for UI (not super_admin).
  insert into public.user_roles (user_id, role, created_by_id)
  values (uid, 'agent'::public.app_role, uid)
  on conflict (user_id, role) do nothing;

  -- Strip auto-granted super_admin from the old provision path.
  -- Claim superusers re-gain it via sync_navio_organization_memberships.
  delete from public.user_roles
  where user_id = uid
    and role = 'super_admin'::public.app_role;

  if prow.role = 'super_admin' or prow.primary_role = 'super_admin'::public.app_role then
    update public.profiles
    set role = 'agent',
        primary_role = 'agent'::public.app_role,
        updated_at = now()
    where user_id = uid
    returning * into prow;
  end if;

  return prow;
end;
$$;

comment on function public.ensure_authentik_support_hub_access() is
  'Idempotent bootstrap: product IdP (custom:navio) session → profiles + agent role. No auto super_admin; SO/SD scope from navio membership claims + sync_navio_organization_memberships.';

-- ---------------------------------------------------------------------------
-- 3. Sync local organization_memberships from Navio SO ids (client passes claims)
-- ---------------------------------------------------------------------------

create or replace function public.sync_navio_organization_memberships(
  p_navio_org_ids integer[],
  p_is_claim_superuser boolean default false,
  p_default_navio_org_id integer default null,
  p_role text default 'agent'
)
returns setof public.organization_memberships
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  mapped_orgs uuid[];
  default_org uuid;
  app_role_val public.app_role;
  org_rec record;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Map claim roles onto Support Hub app_role.
  app_role_val := case
    when p_is_claim_superuser then 'super_admin'::public.app_role
    when lower(coalesce(p_role, 'agent')) in ('admin', 'org_admin') then 'admin'::public.app_role
    when lower(coalesce(p_role, 'agent')) = 'user' then 'user'::public.app_role
    else 'agent'::public.app_role
  end;

  if p_is_claim_superuser then
    select coalesce(array_agg(o.id), '{}'::uuid[])
    into mapped_orgs
    from public.organizations o
    where o.navio_organization_id is not null;

    insert into public.user_roles (user_id, role, created_by_id)
    values (uid, 'super_admin'::public.app_role, uid)
    on conflict (user_id, role) do nothing;

    update public.profiles
    set role = 'super_admin',
        primary_role = 'super_admin'::public.app_role,
        updated_at = now()
    where user_id = uid;
  else
    select coalesce(array_agg(o.id), '{}'::uuid[])
    into mapped_orgs
    from public.organizations o
    where o.navio_organization_id = any (coalesce(p_navio_org_ids, '{}'::integer[]));

    delete from public.user_roles
    where user_id = uid
      and role = 'super_admin'::public.app_role;

    -- Ensure non-super claim users keep a usable role.
    insert into public.user_roles (user_id, role, created_by_id)
    values (uid, app_role_val, uid)
    on conflict (user_id, role) do nothing;

    update public.profiles
    set role = app_role_val::text,
        primary_role = app_role_val,
        updated_at = now()
    where user_id = uid
      and (role is distinct from app_role_val::text
           or primary_role is distinct from app_role_val);
  end if;

  -- Upsert memberships for mapped orgs.
  for org_rec in
    select o.id as organization_id
    from public.organizations o
    where o.id = any (mapped_orgs)
  loop
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
      org_rec.organization_id,
      app_role_val,
      'active',
      false,
      now()
    )
    on conflict (user_id, organization_id) do update
      set role = excluded.role,
          status = 'active',
          updated_at = now();
  end loop;

  -- Drop memberships only for navio-mapped orgs no longer in claims
  -- (leave pure-local memberships alone for non-Navio invite flows).
  delete from public.organization_memberships m
  using public.organizations o
  where m.user_id = uid
    and m.organization_id = o.id
    and o.navio_organization_id is not null
    and not (m.organization_id = any (mapped_orgs));

  -- Default org: active claim SO, else first mapped.
  if p_default_navio_org_id is not null then
    select o.id into default_org
    from public.organizations o
    where o.navio_organization_id = p_default_navio_org_id
    limit 1;
  end if;

  if default_org is null and array_length(mapped_orgs, 1) is not null then
    default_org := mapped_orgs[1];
  end if;

  if default_org is not null then
    update public.organization_memberships
    set is_default = (organization_id = default_org),
        updated_at = now()
    where user_id = uid
      and status = 'active';

    update public.profiles
    set organization_id = default_org,
        updated_at = now()
    where user_id = uid;
  end if;

  return query
    select m.*
    from public.organization_memberships m
    where m.user_id = uid
      and m.status = 'active'
    order by m.is_default desc, m.created_at;
end;
$$;

comment on function public.sync_navio_organization_memberships(integer[], boolean, integer, text) is
  'Sync organization_memberships from product IdP SO ids (navio_organization_id). Claim superuser gets all mapped orgs + super_admin.';

revoke all on function public.sync_navio_organization_memberships(integer[], boolean, integer, text) from public;
grant execute on function public.sync_navio_organization_memberships(integer[], boolean, integer, text) to authenticated;

-- ensure grant still present on provision RPC
grant execute on function public.ensure_authentik_support_hub_access() to authenticated;
