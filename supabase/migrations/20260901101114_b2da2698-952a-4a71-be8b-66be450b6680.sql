CREATE OR REPLACE FUNCTION public.run_background_job_now(_jobid bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $fn$
DECLARE
  v_command text;
  v_jobname text;
  v_active boolean;
  v_start timestamptz := clock_timestamp();
  v_error text;
  v_ok boolean := true;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
       OR public.has_role(auth.uid(), 'super_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT j.command, j.jobname, j.active
    INTO v_command, v_jobname, v_active
  FROM cron.job j
  WHERE j.jobid = _jobid;

  IF v_command IS NULL THEN
    RAISE EXCEPTION 'Job % not found', _jobid;
  END IF;

  BEGIN
    EXECUTE v_command;
  EXCEPTION WHEN OTHERS THEN
    v_ok := false;
    v_error := SQLERRM;
  END;

  RETURN jsonb_build_object(
    'success', v_ok,
    'jobid', _jobid,
    'jobname', v_jobname,
    'duration_ms', round(EXTRACT(EPOCH FROM (clock_timestamp() - v_start)) * 1000),
    'error', v_error
  );
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.run_background_job_now(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.run_background_job_now(bigint) TO authenticated;