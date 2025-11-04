-- Phase 7: Audit Log Security & Performance Enhancements

-- ============================================
-- PERFORMANCE OPTIMIZATION: Add Indexes
-- ============================================

-- Index for querying by actor (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_id 
ON public.admin_audit_logs(actor_id);

-- Index for querying by action type
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type 
ON public.admin_audit_logs(action_type);

-- Index for querying by organization
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_organization_id 
ON public.admin_audit_logs(organization_id);

-- Index for querying by time (most queries filter by date)
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at 
ON public.admin_audit_logs(created_at DESC);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_org_created 
ON public.admin_audit_logs(organization_id, created_at DESC);

-- Index for action category filtering
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_category 
ON public.admin_audit_logs(action_category);


-- ============================================
-- SECURITY: Make Audit Logs Immutable
-- ============================================

-- Drop existing update/delete policies if they exist
DROP POLICY IF EXISTS "Prevent audit log updates" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Prevent audit log deletes" ON public.admin_audit_logs;

-- Create policy to prevent all updates (audit logs should never be modified)
CREATE POLICY "Prevent audit log updates"
ON public.admin_audit_logs
FOR UPDATE
TO authenticated
USING (false);

-- Create policy to prevent all deletes (audit logs should never be deleted)
CREATE POLICY "Prevent audit log deletes"
ON public.admin_audit_logs
FOR DELETE
TO authenticated
USING (false);


-- ============================================
-- SECURITY: Data Validation Trigger
-- ============================================

-- Function to validate audit log data on insert
CREATE OR REPLACE FUNCTION public.validate_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure actor information is present
  IF NEW.actor_id IS NULL OR NEW.actor_email IS NULL OR NEW.actor_role IS NULL THEN
    RAISE EXCEPTION 'Audit log must include complete actor information';
  END IF;

  -- Ensure action information is present
  IF NEW.action_type IS NULL OR NEW.action_category IS NULL THEN
    RAISE EXCEPTION 'Audit log must include action type and category';
  END IF;

  -- Ensure target information is present
  IF NEW.target_type IS NULL OR NEW.target_identifier IS NULL THEN
    RAISE EXCEPTION 'Audit log must include target information';
  END IF;

  -- Ensure changes object is present
  IF NEW.changes IS NULL THEN
    NEW.changes = '{}'::jsonb;
  END IF;

  -- Ensure metadata object is present
  IF NEW.metadata IS NULL THEN
    NEW.metadata = '{}'::jsonb;
  END IF;

  -- Add server timestamp to metadata
  NEW.metadata = jsonb_set(
    NEW.metadata,
    '{server_timestamp}',
    to_jsonb(now()::text),
    true
  );

  RETURN NEW;
END;
$$;

-- Create trigger to validate audit logs on insert
DROP TRIGGER IF EXISTS validate_audit_log_trigger ON public.admin_audit_logs;
CREATE TRIGGER validate_audit_log_trigger
  BEFORE INSERT ON public.admin_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_audit_log();


-- ============================================
-- MONITORING: Suspicious Activity Detection
-- ============================================

-- Function to detect suspicious patterns (for future alerting)
CREATE OR REPLACE FUNCTION public.detect_suspicious_audit_activity(
  time_window_minutes INTEGER DEFAULT 5,
  action_threshold INTEGER DEFAULT 50
)
RETURNS TABLE (
  actor_id UUID,
  actor_email TEXT,
  action_count BIGINT,
  first_action TIMESTAMP WITH TIME ZONE,
  last_action TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    actor_id,
    actor_email,
    COUNT(*) as action_count,
    MIN(created_at) as first_action,
    MAX(created_at) as last_action
  FROM admin_audit_logs
  WHERE created_at > now() - (time_window_minutes || ' minutes')::interval
  GROUP BY actor_id, actor_email
  HAVING COUNT(*) > action_threshold
  ORDER BY action_count DESC;
$$;


-- ============================================
-- RETENTION: Auto-archive old logs (optional)
-- ============================================

-- Function to count old audit logs (for monitoring)
CREATE OR REPLACE FUNCTION public.count_old_audit_logs(days_old INTEGER DEFAULT 365)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM admin_audit_logs
  WHERE created_at < now() - (days_old || ' days')::interval;
$$;

-- Note: Actual archival/deletion should be done through a scheduled job
-- and should comply with your organization's data retention policies


-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permission on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.detect_suspicious_audit_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_old_audit_logs TO authenticated;