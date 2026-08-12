-- Fix + prevent GoTrue "Multiple accounts with the same email address in the
-- same linking domain detected" on Navio (custom:navio) login when a Google
-- account with the same email already exists.
--
-- Cause: 2+ auth.users rows share one email. GoTrue auto-links a new OIDC
-- identity to an existing user *by verified email*; with several candidates it
-- cannot choose and aborts the callback with server_error. The durable fix is
-- one auth user per email — then Google + Navio identities auto-link onto it.
--
-- These are admin-only SECURITY DEFINER helpers, callable by service_role only
-- (the admin-cleanup-users edge function). They are NOT granted to authenticated.

-- ---------------------------------------------------------------------------
-- 1. List duplicate-email auth users with enough footprint to pick a canonical.
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_duplicate_auth_emails()
returns table (email text, user_ids uuid[], details jsonb)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    lower(u.email) as email,
    array_agg(u.id order by u.created_at) as user_ids,
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'providers', (
          select coalesce(array_agg(distinct i.provider), '{}')
          from auth.identities i where i.user_id = u.id
        ),
        'has_profile', exists (select 1 from public.profiles p where p.user_id = u.id),
        'roles', (
          select coalesce(array_agg(distinct r.role::text), '{}')
          from public.user_roles r where r.user_id = u.id
        )
      )
      order by u.created_at
    ) as details
  from auth.users u
  where u.email is not null and u.email <> ''
  group by lower(u.email)
  having count(*) > 1;
$$;

comment on function public.admin_list_duplicate_auth_emails() is
  'Admin: emails with >1 auth.users row, with per-user provider/profile/role footprint to choose a canonical for merge.';

-- ---------------------------------------------------------------------------
-- 2. Merge one duplicate user into a canonical user.
--    Repoints every public.* uuid column that references a user (by explicit FK
--    to auth.users(id)/profiles(user_id), or by conventional name) from p_from
--    to p_to. On a unique conflict, the losing p_from row is dropped (canonical
--    wins). Does NOT touch auth.* rows — the caller deletes p_from via the admin
--    API afterwards, which cascades auth.identities/sessions for p_from.
-- ---------------------------------------------------------------------------
create or replace function public.admin_merge_user_records(p_from uuid, p_to uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  r record;
  moved jsonb := '{}'::jsonb;
  cnt bigint;
begin
  if p_from is null or p_to is null then
    raise exception 'both p_from and p_to are required';
  end if;
  if p_from = p_to then
    raise exception 'p_from and p_to must differ';
  end if;

  for r in
    with fk_cols as (
      -- Columns that are explicit FKs to auth.users(id) or public.profiles(user_id)
      select chns.nspname as sch, chrel.relname as tbl, att.attname as col
      from pg_constraint con
      join pg_class      chrel on chrel.oid = con.conrelid
      join pg_namespace  chns  on chns.oid = chrel.relnamespace
      join pg_class      prel  on prel.oid = con.confrelid
      join pg_namespace  pns   on pns.oid = prel.relnamespace
      join unnest(con.conkey) with ordinality as k(attnum, ord) on true
      join pg_attribute  att on att.attrelid = con.conrelid and att.attnum = k.attnum
      where con.contype = 'f'
        and chns.nspname = 'public'
        and (
          (pns.nspname = 'auth' and prel.relname = 'users')
          or (pns.nspname = 'public' and prel.relname = 'profiles')
        )
    ),
    name_cols as (
      -- Loose uuid columns (no FK) that conventionally hold a user id.
      select c.table_schema as sch, c.table_name as tbl, c.column_name as col
      from information_schema.columns c
      join information_schema.tables t
        on t.table_schema = c.table_schema and t.table_name = c.table_name
      where c.table_schema = 'public'
        and t.table_type = 'BASE TABLE'
        and c.data_type = 'uuid'
        and c.column_name in (
          'user_id','created_by_id','updated_by_id','assigned_to_id',
          'reviewer_id','owner_id','resolved_by_id','author_id',
          'sender_id','actor_id','deleted_by_id'
        )
    )
    select distinct sch, tbl, col from (
      select * from fk_cols union select * from name_cols
    ) s
    -- profiles is 1:1 on user_id; handle it via the generic path too.
    order by 1,2,3
  loop
    begin
      execute format('update %I.%I set %I = $1 where %I = $2', r.sch, r.tbl, r.col, r.col)
        using p_to, p_from;
      get diagnostics cnt = row_count;
      if cnt > 0 then
        moved := moved || jsonb_build_object(r.tbl || '.' || r.col, cnt);
      end if;
    exception when unique_violation or check_violation then
      -- Canonical already owns the unique slot; drop p_from's colliding rows.
      execute format('delete from %I.%I where %I = $1', r.sch, r.tbl, r.col)
        using p_from;
      get diagnostics cnt = row_count;
      moved := moved || jsonb_build_object(r.tbl || '.' || r.col, 'conflict_deleted:' || cnt);
    end;
  end loop;

  return jsonb_build_object('from', p_from, 'to', p_to, 'moved', moved);
end;
$$;

comment on function public.admin_merge_user_records(uuid, uuid) is
  'Admin: repoint public user-ref columns from p_from to p_to (canonical). Caller deletes p_from via auth admin API after. Destructive on unique conflicts.';

-- service_role only (edge function). Never expose to authenticated users.
revoke all on function public.admin_list_duplicate_auth_emails() from public, authenticated, anon;
revoke all on function public.admin_merge_user_records(uuid, uuid) from public, authenticated, anon;
grant execute on function public.admin_list_duplicate_auth_emails() to service_role;
grant execute on function public.admin_merge_user_records(uuid, uuid) to service_role;
