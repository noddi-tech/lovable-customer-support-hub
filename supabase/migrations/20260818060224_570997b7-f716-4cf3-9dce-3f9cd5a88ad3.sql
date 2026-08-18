DO $$
DECLARE
  r record;
  policy_fn boolean;
  internal_names text[] := ARRAY[
    'auto_abandon_inactive_chat_sessions','auto_close_inactive_conversations',
    'calculate_sla_breach','claim_queue_row','cleanup_old_email_ingestion_logs',
    'count_old_audit_logs','create_test_notification','detect_suspicious_audit_activity',
    'dispatch_action','enqueue_initial_scoring_for_position','extract_email_date',
    'finalize_queue_row','gdpr_erase_applicant','generate_ticket_number',
    'get_conversations_monitored','get_organization_by_email_domain','get_inbox_for_email',
    'log_audit_export','reap_stuck_queue_rows','relink_calls_to_customers',
    'render_email_template','position_has_resolvable_rubric','get_user_org_cache',
    'check_rate_limit'
  ];
BEGIN
  FOR r IN
    SELECT p.oid, p.oid::regprocedure AS sig, p.proname,
           pg_get_function_result(p.oid) = 'trigger' AS is_trigger
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);

    IF r.is_trigger THEN
      CONTINUE;
    END IF;

    -- functions referenced by RLS policies must stay callable by API roles
    SELECT EXISTS (
      SELECT 1 FROM pg_policies pol
      WHERE (coalesce(pol.qual::text,'') || coalesce(pol.with_check::text,'')) LIKE '%' || r.proname || '(%'
    ) INTO policy_fn;

    IF policy_fn OR r.proname = 'get_online_agent_count' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', r.sig);
    ELSIF NOT (r.proname = ANY(internal_names)) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END IF;
  END LOOP;
END $$;