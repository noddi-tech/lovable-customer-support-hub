-- Add columns to store enriched call termination details
ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS end_reason TEXT,
ADD COLUMN IF NOT EXISTS webhook_event_type TEXT,
ADD COLUMN IF NOT EXISTS ivr_interaction JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS availability_status TEXT,
ADD COLUMN IF NOT EXISTS hangup_cause TEXT,
ADD COLUMN IF NOT EXISTS enriched_details JSONB DEFAULT '{}';

-- Create function to enrich call data from call events
CREATE OR REPLACE FUNCTION public.enrich_call_from_events()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process call_ended events
  IF NEW.event_type = 'call_ended' THEN
    
    -- Extract key information from event data
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically enrich calls when events are inserted
DROP TRIGGER IF EXISTS enrich_call_data_trigger ON public.call_events;
CREATE TRIGGER enrich_call_data_trigger
  AFTER INSERT ON public.call_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enrich_call_from_events();

-- Backfill existing data by processing existing call_ended events
DO $$
DECLARE
  event_record RECORD;
BEGIN
  FOR event_record IN 
    SELECT id, call_id, event_data, event_type
    FROM public.call_events 
    WHERE event_type = 'call_ended'
  LOOP
    -- Extract and update call data
    UPDATE public.calls 
    SET 
      end_reason = COALESCE(
        event_record.event_data->'callData'->>'missed_call_reason',
        CASE 
          WHEN event_record.event_data->'webhookEvent' = '"call.hungup"' THEN 'hung_up'
          WHEN event_record.event_data->'callData'->>'status' = 'done' AND event_record.event_data->'callData'->'answered_at' IS NOT NULL THEN 'completed_normally'
          WHEN event_record.event_data->'callData'->>'status' = 'done' AND event_record.event_data->'callData'->'answered_at' IS NULL THEN 'not_answered'
          ELSE 'unknown'
        END
      ),
      webhook_event_type = event_record.event_data->>'webhookEvent',
      ivr_interaction = COALESCE(event_record.event_data->'callData'->'ivr_options', '[]'::jsonb),
      availability_status = event_record.event_data->'callData'->'number'->>'availability_status',
      hangup_cause = event_record.event_data->'callData'->>'hangup_cause',
      enriched_details = jsonb_build_object(
        'aircall_id', event_record.event_data->'callData'->'id',
        'call_uuid', event_record.event_data->'callData'->>'call_uuid',
        'raw_digits', event_record.event_data->'callData'->>'raw_digits',
        'user_email', event_record.event_data->'callData'->'user'->>'email',
        'user_name', event_record.event_data->'callData'->'user'->>'name',
        'number_name', event_record.event_data->'callData'->'number'->>'name',
        'cost', event_record.event_data->'callData'->'cost'
      )
    WHERE id = event_record.call_id;
  END LOOP;
END $$;