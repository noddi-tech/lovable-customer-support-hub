-- 1. critical_alert_feedback: rename historic ai_category
UPDATE public.critical_alert_feedback
SET ai_category = 'app_failure'
WHERE ai_category = 'service_failure';

-- 2. notifications: rename ai_category inside JSONB data column
UPDATE public.notifications
SET data = jsonb_set(data, '{ai_category}', '"app_failure"'::jsonb, false)
WHERE type = 'critical_alert_sent'
  AND data->>'ai_category' = 'service_failure';

-- 3. slack_integrations.critical_category_routing: rename JSON key service_failure -> app_failure
UPDATE public.slack_integrations
SET critical_category_routing =
  (critical_category_routing - 'service_failure')
  || jsonb_build_object('app_failure', critical_category_routing->'service_failure')
WHERE critical_category_routing ? 'service_failure';