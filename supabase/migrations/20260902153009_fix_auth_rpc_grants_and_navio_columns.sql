-- Repair production drift that causes console auth errors:
-- 1) ensure_google_employee_support_hub_access → 42501 (missing EXECUTE grant)
-- 2) reconcile_my_duplicate_accounts → PGRST202 (function missing)
-- 3) organizations.navio_organization_id / departments.slug+navio_department_id → 42703

-- ---------------------------------------------------------------------------
-- Columns expected by useAuth scope queries
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists navio_organization_id integer;

create unique index if not exists organizations_navio_organization_id_key
  on public.organizations (navio_organization_id)
  where navio_organization_id is not null;

alter table public.departments
  add column if not exists navio_department_id integer,
  add column if not exists slug text;

create unique index if not exists departments_navio_department_id_key
  on public.departments (navio_department_id)
  where navio_department_id is not null;

create unique index if not exists departments_org_slug_key
  on public.departments (organization_id, slug)
  where slug is not null;

-- ---------------------------------------------------------------------------
-- Google employee provision RPC: restore EXECUTE for authenticated
-- ---------------------------------------------------------------------------
revoke all on function public.ensure_google_employee_support_hub_access() from public, anon;
grant execute on function public.ensure_google_employee_support_hub_access() to authenticated;

-- ---------------------------------------------------------------------------
-- Duplicate-account reconcile RPC (no-op-safe if admin_merge is missing)
-- ---------------------------------------------------------------------------
create or replace function public.reconcile_my_duplicate_accounts()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  me uuid := auth.uid();
  my_email text;
  is_trusted boolean;
  dup record;
  merged int := 0;
  removed jsonb := '[]'::jsonb;
  merge_fn_exists boolean;
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select lower(email) into my_email from auth.users where id = me;
  if my_email is null or my_email = '' then
    return jsonb_build_object('merged', 0, 'reason', 'no_email');
  end if;

  select exists (
    select 1 from auth.identities i
    where i.user_id = me
      and (i.provider = 'google' or i.provider ilike '%navio%')
      and lower(i.identity_data ->> 'email') = my_email
      and coalesce(lower(i.identity_data ->> 'email_verified'), 'false') in ('true', 't', '1')
  ) into is_trusted;
  if not is_trusted then
    return jsonb_build_object('merged', 0, 'reason', 'caller_not_trusted');
  end if;

  select exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_merge_user_records'
  ) into merge_fn_exists;

  if not merge_fn_exists then
    return jsonb_build_object('merged', 0, 'reason', 'merge_fn_missing');
  end if;

  for dup in
    select u.id
    from auth.users u
    where u.id <> me
      and lower(u.email) = my_email
  loop
    perform public.admin_merge_user_records(dup.id, me);
    delete from auth.users where id = dup.id;
    merged := merged + 1;
    removed := removed || to_jsonb(dup.id);
  end loop;

  return jsonb_build_object('merged', merged, 'into', me, 'removed', removed);
end;
$$;

comment on function public.reconcile_my_duplicate_accounts() is
  'Collapse other auth.users sharing the caller''s email into the caller (requires a trusted OAuth identity).';

revoke all on function public.reconcile_my_duplicate_accounts() from public, anon;
grant execute on function public.reconcile_my_duplicate_accounts() to authenticated;

notify pgrst, 'reload schema';
