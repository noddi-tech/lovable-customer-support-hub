-- acknowledge_execution: admin dismisses a failed (or any) execution row.
-- Idempotent by design: a second call on an already-acknowledged row
-- raises (to surface double-clicks in the UI). Org-scoped by profile lookup.

CREATE OR REPLACE FUNCTION public.acknowledge_execution(
  p_execution_id uuid
)
RETURNS recruitment_automation_executions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_profile_id uuid;
  v_org_id     uuid;
  v_role       text;
  v_row        public.recruitment_automation_executions;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  SELECT id, organization_id, role
    INTO v_profile_id, v_org_id, v_role
  FROM public.profiles
  WHERE user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'No profile found for user %', v_user_id;
  END IF;

  IF v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admins can acknowledge executions';
  END IF;

  UPDATE public.recruitment_automation_executions
  SET acknowledged_at = now(),
      acknowledged_by = v_profile_id
  WHERE id = p_execution_id
    AND organization_id = v_org_id
    AND acknowledged_at IS NULL
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Execution % not found, already acknowledged, or not in your org',
      p_execution_id;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.acknowledge_execution(uuid) TO authenticated;

COMMENT ON FUNCTION public.acknowledge_execution(uuid) IS
  'Admin-only: marks a recruitment_automation_executions row as acknowledged (sets acknowledged_at / acknowledged_by). Org-scoped. Raises if row is not found, already acknowledged, or belongs to another org. Callable by authenticated users; inner logic enforces role check against profiles.role IN (admin, super_admin).';
