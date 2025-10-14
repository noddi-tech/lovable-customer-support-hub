-- Phase 1: Fix Function Search Paths and Debug Log Sanitization

-- 1. Fix search_path for set_voice_integration_organization_id
CREATE OR REPLACE FUNCTION public.set_voice_integration_organization_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_user_organization_id();
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Create sanitization utility function
CREATE OR REPLACE FUNCTION public.sanitize_debug_data(data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
DECLARE
  sanitized jsonb;
  sensitive_keys text[] := ARRAY[
    'password', 'token', 'apiKey', 'api_key', 'secret', 'access_token', 
    'refresh_token', 'ssn', 'credit_card', 'cvv', 'pin', 'authorization',
    'webhook_token', 'secret_token', 'private_key'
  ];
  key text;
BEGIN
  sanitized := data;
  
  -- Redact sensitive keys
  FOREACH key IN ARRAY sensitive_keys
  LOOP
    IF sanitized ? key THEN
      sanitized := jsonb_set(sanitized, ARRAY[key], '"[REDACTED]"'::jsonb);
    END IF;
  END LOOP;
  
  -- Redact email addresses in string values
  IF jsonb_typeof(sanitized) = 'object' THEN
    FOR key IN SELECT jsonb_object_keys(sanitized)
    LOOP
      IF jsonb_typeof(sanitized->key) = 'string' THEN
        sanitized := jsonb_set(
          sanitized, 
          ARRAY[key], 
          to_jsonb(regexp_replace(
            sanitized->>key, 
            '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', 
            '[EMAIL]', 
            'g'
          ))
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN sanitized;
END;
$function$;

-- 3. Fix log_message_insertion with sanitization
CREATE OR REPLACE FUNCTION public.log_message_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.debug_logs (event, data)
  VALUES ('message_insert_attempt', public.sanitize_debug_data(jsonb_build_object(
    'conversation_id', NEW.conversation_id,
    'sender_type', NEW.sender_type,
    'email_subject', NEW.email_subject,
    'content_length', LENGTH(NEW.content),
    'external_id', NEW.external_id
  )));
  RETURN NEW;
END;
$function$;

-- 4. Fix enrich_call_from_events search_path
CREATE OR REPLACE FUNCTION public.enrich_call_from_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.event_type = 'call_ended' THEN
    UPDATE public.calls 
    SET 
      end_reason = COALESCE(
        NEW.event_data->'callData'->>'missed_call_reason',
        CASE 
          WHEN NEW.event_data->'webhookEvent' = '"call.hungup"' THEN 'hung_up'
          WHEN NEW.event_data->'callData'->>'status' = 'done' AND NEW.event_data->'callData'->'answered_at' IS NOT NULL THEN 'completed_normally'
          WHEN NEW.event_data->'callData'->>'status' = 'done' AND NEW.event_data->'callData'->'answered_at' IS NULL THEN 'not_answered'
          ELSE 'unknown'
        END
      ),
      webhook_event_type = NEW.event_data->>'webhookEvent',
      ivr_interaction = COALESCE(NEW.event_data->'callData'->'ivr_options', '[]'::jsonb),
      availability_status = NEW.event_data->'callData'->'number'->>'availability_status',
      hangup_cause = NEW.event_data->'callData'->>'hangup_cause',
      enriched_details = jsonb_build_object(
        'aircall_id', NEW.event_data->'callData'->'id',
        'call_uuid', NEW.event_data->'callData'->>'call_uuid',
        'raw_digits', NEW.event_data->'callData'->>'raw_digits',
        'user_email', NEW.event_data->'callData'->'user'->>'email',
        'user_name', NEW.event_data->'callData'->'user'->>'name',
        'number_name', NEW.event_data->'callData'->'number'->>'name',
        'cost', NEW.event_data->'callData'->'cost'
      )
    WHERE id = NEW.call_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 5. Add RLS policy for auto-expiring debug logs (30 days retention)
DROP POLICY IF EXISTS "Auto-expire old debug logs" ON public.debug_logs;
CREATE POLICY "Auto-expire old debug logs"
ON public.debug_logs
FOR SELECT
USING (created_at > now() - interval '30 days');