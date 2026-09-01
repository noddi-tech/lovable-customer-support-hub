DO $$
DECLARE fn text; sig text;
  app_fns text[] := ARRAY[
    'acknowledge_execution','admin_list_duplicate_auth_emails','auto_abandon_inactive_chat_sessions',
    'auto_close_inactive_conversations','calculate_sla_breach','check_rate_limit','claim_queue_row',
    'claim_scoring_queue_batch','cleanup_expired_audit_events','delete_email_account','execute_automation_rules',
    'extract_email_date','finalize_queue_row','find_duplicate_customers','find_large_conversations',
    'find_similar_memory','gdpr_erase_applicant','get_all_counts','get_conversations',
    'get_conversations_with_session_recovery','get_critical_alert_count','get_database_size','get_email_accounts',
    'get_inbox_counts','get_inbox_for_email','get_inbox_outstanding_counts','get_inboxes','get_online_agent_count',
    'get_user_department_id','get_user_organization_id','hybrid_search_knowledge','increment_pattern_count',
    'log_audit_export','mark_all_notifications_read','mark_notification_read','match_automation_rules',
    'move_application_stage','reassign_applications_to_stage','reconcile_my_duplicate_accounts',
    'render_email_template','update_pipeline_stages','validate_session_context'
  ];
BEGIN
  FOREACH fn IN ARRAY app_fns LOOP
    FOR sig IN
      SELECT format('public.%I(%s)', p.proname, pg_get_function_identity_arguments(p.oid))
      FROM pg_proc p
      WHERE p.pronamespace = 'public'::regnamespace AND p.proname = fn
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', sig);
    END LOOP;
  END LOOP;
END $$;