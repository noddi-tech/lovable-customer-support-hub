-- Self-healing account linking: collapse duplicate auth.users that share the
-- caller's email into the caller's current account, so Google + Navio logins
-- for the same email converge on one account.
--
-- Supabase GoTrue already auto-links a new provider identity to an existing user
-- by *verified* email (both Google and the Navio product IdP emit
-- email_verified: true). This RPC is the belt-and-suspenders that heals any
-- legacy/edge-case duplicate: after it runs once, the extra user is gone and the
-- next login of the other provider auto-links onto the single remaining account.
--
-- SECURITY: this deletes auth.users rows, so it is tightly scoped:
--   * only rows whose email == the CALLER's own email,
--   * never the caller's own row,
--   * caller must hold a TRUSTED external identity (google/navio OAuth), not just
--     an email/password row. This project has mailer_autoconfirm=true, so an
--     email/password signup is "confirmed" without proving control of the inbox;
--     requiring an OAuth identity stops a password-squatter from deleting the
--     real OAuth account for someone else's email.

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
begin
  if me is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select lower(email) into my_email from auth.users where id = me;
  if my_email is null or my_email = '' then
    return jsonb_build_object('merged', 0, 'reason', 'no_email');
  end if;

  -- Caller must control the email via an external OAuth identity.
  select exists (
    select 1 from auth.identities i
    where i.user_id = me
      and i.provider not in ('email', 'phone')
  ) into is_trusted;
  if not is_trusted then
    return jsonb_build_object('merged', 0, 'reason', 'caller_not_trusted');
  end if;

  -- Collapse every OTHER auth user sharing this email into the caller.
  for dup in
    select u.id
    from auth.users u
    where u.id <> me
      and lower(u.email) = my_email
  loop
    -- Move the duplicate's public app data onto the caller (conflict-safe).
    perform public.admin_merge_user_records(dup.id, me);
    -- Remove the now-empty duplicate; cascades its auth.identities/sessions.
    delete from auth.users where id = dup.id;
    merged := merged + 1;
    removed := removed || to_jsonb(dup.id);
  end loop;

  return jsonb_build_object('merged', merged, 'into', me, 'removed', removed);
end;
$$;

comment on function public.reconcile_my_duplicate_accounts() is
  'Collapse other auth.users sharing the caller''s email into the caller (requires a trusted OAuth identity). Heals Google+Navio duplicates so same-email logins share one account.';

revoke all on function public.reconcile_my_duplicate_accounts() from public, anon;
grant execute on function public.reconcile_my_duplicate_accounts() to authenticated;
