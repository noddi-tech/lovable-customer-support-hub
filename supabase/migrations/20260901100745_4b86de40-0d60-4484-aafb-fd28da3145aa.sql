CREATE OR REPLACE FUNCTION public.get_background_jobs()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  command text,
  active boolean,
  last_status text,
  last_start timestamptz,
  last_end timestamptz,
  last_duration_ms numeric,
  last_message text,
  avg_duration_ms numeric,
  runs_24h bigint,
  failures_24h bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
  WITH allowed AS (
    SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
        OR public.has_role(auth.uid(), 'super_admin'::public.app_role) AS ok
  ),
  last_run AS (
    SELECT DISTINCT ON (d.jobid)
      d.jobid, d.status, d.start_time, d.end_time, d.return_message
    FROM cron.job_run_details d
    ORDER BY d.jobid, d.start_time DESC
  ),
  stats AS (
    SELECT d.jobid,
      avg(EXTRACT(EPOCH FROM (d.end_time - d.start_time)) * 1000) AS avg_ms,
      count(*) AS runs,
      count(*) FILTER (WHERE d.status <> 'succeeded') AS failures
    FROM cron.job_run_details d
    WHERE d.start_time > now() - interval '24 hours'
    GROUP BY d.jobid
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
  LEFT JOIN last_run lr ON lr.jobid = j.jobid
  LEFT JOIN stats s ON s.jobid = j.jobid
  CROSS JOIN allowed a
  WHERE a.ok
  ORDER BY j.jobname;
$$;

REVOKE EXECUTE ON FUNCTION public.get_background_jobs() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_background_jobs() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_background_job_runs(_jobid bigint DEFAULT NULL, _limit integer DEFAULT 50)
RETURNS TABLE (
  runid bigint,
  jobid bigint,
  jobname text,
  status text,
  start_time timestamptz,
  end_time timestamptz,
  duration_ms numeric,
  return_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
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
    AND (_jobid IS NULL OR d.jobid = _jobid)
  ORDER BY d.start_time DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 50), 1), 500);
$$;

REVOKE EXECUTE ON FUNCTION public.get_background_job_runs(bigint, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_background_job_runs(bigint, integer) TO authenticated;