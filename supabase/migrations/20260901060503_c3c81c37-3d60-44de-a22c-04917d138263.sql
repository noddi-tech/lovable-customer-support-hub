-- 1. customer_summaries: scope by active organization membership
DROP POLICY IF EXISTS "Users can view summaries in their org" ON public.customer_summaries;
DROP POLICY IF EXISTS "Users can insert summaries in their org" ON public.customer_summaries;
DROP POLICY IF EXISTS "Users can update summaries in their org" ON public.customer_summaries;

CREATE POLICY "Org members can view customer summaries"
ON public.customer_summaries FOR SELECT TO authenticated
USING (organization_id IN (
  SELECT om.organization_id FROM public.organization_memberships om
  WHERE om.user_id = auth.uid() AND om.status = 'active'
));

CREATE POLICY "Org members can insert customer summaries"
ON public.customer_summaries FOR INSERT TO authenticated
WITH CHECK (organization_id IN (
  SELECT om.organization_id FROM public.organization_memberships om
  WHERE om.user_id = auth.uid() AND om.status = 'active'
));

CREATE POLICY "Org members can update customer summaries"
ON public.customer_summaries FOR UPDATE TO authenticated
USING (organization_id IN (
  SELECT om.organization_id FROM public.organization_memberships om
  WHERE om.user_id = auth.uid() AND om.status = 'active'
))
WITH CHECK (organization_id IN (
  SELECT om.organization_id FROM public.organization_memberships om
  WHERE om.user_id = auth.uid() AND om.status = 'active'
));

-- 2. profiles: remove unscoped admin update policy (org-scoped + super admin policies remain)
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.profiles;

-- 3. widget_ai_feedback: no anonymous inserts; admins may rate within their org
DROP POLICY IF EXISTS "Anyone can submit AI feedback" ON public.widget_ai_feedback;
CREATE POLICY "Org members can submit AI feedback"
ON public.widget_ai_feedback FOR INSERT TO authenticated
WITH CHECK (organization_id IN (
  SELECT om.organization_id FROM public.organization_memberships om
  WHERE om.user_id = auth.uid() AND om.status = 'active'
));

-- 4. widget_sessions: created only by backend service role
DROP POLICY IF EXISTS "Anyone can create widget sessions" ON public.widget_sessions;

-- 5. log/system tables: writes are service-role only
DROP POLICY IF EXISTS "System can insert email ingestion logs" ON public.email_ingestion_logs;
DROP POLICY IF EXISTS "System can insert performance logs" ON public.query_performance_logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.system_events_log;
DROP POLICY IF EXISTS "System can insert ticket events" ON public.service_ticket_events;
DROP POLICY IF EXISTS "System can insert invite logs" ON public.invite_email_logs;
DROP POLICY IF EXISTS "System can update import jobs" ON public.import_jobs;

-- 6. SECURITY DEFINER functions: revoke execute from public/anon/authenticated
--    except the routines the app actually calls and the helpers used inside RLS policies.
DO $$
DECLARE
  r record;
  keep_all text[] := ARRAY[
    -- RLS helper functions (must stay callable by any role evaluating policies)
    'current_profile_id','get_user_organization_id','get_user_profile_id','get_user_profile_roles',
    'get_user_department_id','has_permission','has_role','is_super_admin','is_org_admin','is_org_member',
    'user_has_any_role',
    -- public-facing routines
    'get_meta_deletion_request_status','get_online_agent_count'
  ];
  keep_auth text[] := ARRAY[
    'acknowledge_execution','admin_list_duplicate_auth_emails','auto_abandon_inactive_chat_sessions',
    'auto_close_inactive_conversations','calculate_sla_breach','check_rate_limit','claim_scoring_queue_batch',
    'claim_queue_row','cleanup_expired_audit_events','delete_email_account','execute_automation_rules',
    'extract_email_date','finalize_queue_row','find_duplicate_customers','find_large_conversations',
    'find_similar_memory','find_similar_responses','gdpr_erase_applicant','get_all_counts','get_conversations',
    'get_conversations_with_session_recovery','get_critical_alert_count','get_database_size','get_email_accounts',
    'get_inbox_counts','get_inbox_for_email','get_inbox_outstanding_counts','get_inboxes',
    'hybrid_search_knowledge','increment_pattern_count','log_audit_export','mark_all_notifications_read',
    'mark_notification_read','match_automation_rules','move_application_stage','reassign_applications_to_stage',
    'reconcile_my_duplicate_accounts','render_email_template','update_pipeline_stages','validate_session_context'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    IF r.proname = ANY(keep_all) THEN
      CONTINUE;
    END IF;

    IF r.proname = ANY(keep_auth) THEN
      -- app-facing: signed-in users only, never anonymous
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
    ELSE
      -- internal/trigger routines: backend only
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    END IF;
  END LOOP;
END $$;