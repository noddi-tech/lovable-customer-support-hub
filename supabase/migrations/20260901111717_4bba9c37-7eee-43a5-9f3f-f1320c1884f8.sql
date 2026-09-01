CREATE OR REPLACE FUNCTION public.get_background_jobs()
 RETURNS TABLE(jobid bigint, jobname text, schedule text, command text, active boolean, last_status text, last_start timestamp with time zone, last_end timestamp with time zone, last_duration_ms numeric, last_message text, avg_duration_ms numeric, runs_24h bigint, failures_24h bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
  WITH allowed AS (
    SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role) AS ok
  ),
  recent AS (
    SELECT d.jobid, d.status, d.start_time, d.end_time, d.return_message
    FROM cron.job_run_details d
    WHERE d.start_time > now() - interval '7 days'
  ),
  last_run AS (
    SELECT DISTINCT ON (r.jobid) r.jobid, r.status, r.start_time, r.end_time, r.return_message
    FROM recent r
    ORDER BY r.jobid, r.start_time DESC
  ),
  stats AS (
    SELECT r.jobid,
      avg(EXTRACT(EPOCH FROM (r.end_time - r.start_time)) * 1000) AS avg_ms,
      count(*) AS runs,
      count(*) FILTER (WHERE r.status <> 'succeeded') AS failures
    FROM recent r
    WHERE r.start_time > now() - interval '24 hours'
    GROUP BY r.jobid
  )
  SELECT
    j.jobid,
    j.jobname::text,
    j.schedule::text,
    j.command::text,
    j.active,
    lr.status::text,
    lr.start_time,
    lr.end_time,
    EXTRACT(EPOCH FROM (lr.end_time - lr.start_time)) * 1000,
    left(lr.return_message, 500),
    round(s.avg_ms::numeric, 1),
    COALESCE(s.runs, 0),
    COALESCE(s.failures, 0)
  FROM cron.job j
  CROSS JOIN allowed a
  LEFT JOIN last_run lr ON lr.jobid = j.jobid
  LEFT JOIN stats s ON s.jobid = j.jobid
  WHERE a.ok
  ORDER BY j.jobname;
$function$;

CREATE OR REPLACE FUNCTION public.get_background_job_runs(_jobid bigint DEFAULT NULL::bigint, _limit integer DEFAULT 50)
 RETURNS TABLE(runid bigint, jobid bigint, jobname text, status text, start_time timestamp with time zone, end_time timestamp with time zone, duration_ms numeric, return_message text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'cron'
AS $function$
  WITH allowed AS (
    SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role) AS ok
  )
  SELECT
    d.runid,
    d.jobid,
    j.jobname::text,
    d.status::text,
    d.start_time,
    d.end_time,
    EXTRACT(EPOCH FROM (d.end_time - d.start_time)) * 1000,
    left(d.return_message, 500)
  FROM cron.job_run_details d
  LEFT JOIN cron.job j ON j.jobid = d.jobid
  CROSS JOIN allowed a
  WHERE a.ok
    AND d.start_time > now() - interval '30 days'
    AND (_jobid IS NULL OR d.jobid = _jobid)
  ORDER BY d.start_time DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 50), 1), 500);
$function$;

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

  IF email_domain NOT IN ('noddi.no', 'noddi.co', 'navio.no', 'navio.co', 'getnavio.com') THEN
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
  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF org_id IS NOT NULL THEN
    INSERT INTO public.organization_memberships (user_id, organization_id, role, status, is_default, joined_at)
    VALUES (uid, org_id, 'admin', 'active', true, now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('user_id', uid, 'email', user_email, 'organization_id', org_id, 'role', 'super_admin');
END;
$function$;