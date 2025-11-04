-- Fix Function Search Path Mutable warnings by adding SECURITY DEFINER
-- This ensures functions run with proper security context

-- Fix validate_audit_log function
CREATE OR REPLACE FUNCTION validate_audit_log()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure required fields are present
  IF NEW.actor_id IS NULL THEN
    RAISE EXCEPTION 'actor_id cannot be null';
  END IF;
  
  IF NEW.actor_email IS NULL OR NEW.actor_email = '' THEN
    RAISE EXCEPTION 'actor_email cannot be null or empty';
  END IF;
  
  IF NEW.action_type IS NULL OR NEW.action_type = '' THEN
    RAISE EXCEPTION 'action_type cannot be null or empty';
  END IF;
  
  IF NEW.target_type IS NULL OR NEW.target_type = '' THEN
    RAISE EXCEPTION 'target_type cannot be null or empty';
  END IF;
  
  -- Initialize changes if null
  IF NEW.changes IS NULL THEN
    NEW.changes := '{}'::jsonb;
  END IF;
  
  -- Initialize metadata if null and add server timestamp
  IF NEW.metadata IS NULL THEN
    NEW.metadata := '{}'::jsonb;
  END IF;
  
  NEW.metadata := NEW.metadata || jsonb_build_object(
    'server_timestamp', now(),
    'validated', true
  );
  
  RETURN NEW;
END;
$$;

-- Fix detect_suspicious_audit_activity function
CREATE OR REPLACE FUNCTION detect_suspicious_audit_activity(
  p_threshold integer DEFAULT 10,
  p_time_window interval DEFAULT '5 minutes'::interval
)
RETURNS TABLE (
  actor_id uuid,
  actor_email text,
  action_count bigint,
  first_action timestamp with time zone,
  last_action timestamp with time zone
)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.actor_id,
    a.actor_email,
    COUNT(*)::bigint as action_count,
    MIN(a.created_at) as first_action,
    MAX(a.created_at) as last_action
  FROM admin_audit_logs a
  WHERE a.created_at > (now() - p_time_window)
  GROUP BY a.actor_id, a.actor_email
  HAVING COUNT(*) > p_threshold
  ORDER BY action_count DESC;
END;
$$;

-- Fix count_old_audit_logs function
CREATE OR REPLACE FUNCTION count_old_audit_logs(
  p_age interval DEFAULT '90 days'::interval
)
RETURNS bigint
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
  log_count bigint;
BEGIN
  SELECT COUNT(*) INTO log_count
  FROM admin_audit_logs
  WHERE created_at < (now() - p_age);
  
  RETURN log_count;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION detect_suspicious_audit_activity(integer, interval) TO authenticated;
GRANT EXECUTE ON FUNCTION count_old_audit_logs(interval) TO authenticated;