CREATE OR REPLACE FUNCTION public.is_external_action_type(p_action_type text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT p_action_type IN ('send_email', 'webhook', 'send_sms', 'send_candidate_form');
$function$;