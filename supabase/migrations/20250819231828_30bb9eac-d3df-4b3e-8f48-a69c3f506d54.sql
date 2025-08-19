-- Create a function to automatically close callback requests when outbound calls are made
CREATE OR REPLACE FUNCTION public.auto_close_callback_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only process outbound call events
  IF NEW.event_type = 'call_started' AND NEW.event_data->>'direction' = 'outbound' THEN
    
    -- Update any pending callback requests for this phone number to completed
    UPDATE public.internal_events 
    SET 
      status = 'completed',
      processed_at = now(),
      updated_at = now()
    WHERE 
      event_type = 'callback_requested' 
      AND status IN ('pending', 'processed')
      AND customer_phone = NEW.event_data->>'customer_phone'
      AND organization_id = NEW.organization_id;
    
    -- Log the auto-closure for debugging
    IF FOUND THEN
      RAISE LOG 'Auto-closed callback requests for phone: % due to outbound call: %', 
        NEW.event_data->>'customer_phone', NEW.id;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically close callback requests on outbound calls
DROP TRIGGER IF EXISTS trigger_auto_close_callback_requests ON public.call_events;
CREATE TRIGGER trigger_auto_close_callback_requests
  AFTER INSERT ON public.call_events
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_close_callback_requests();

-- Also handle calls inserted directly into the calls table
DROP TRIGGER IF EXISTS trigger_auto_close_callback_requests_calls ON public.calls;
CREATE TRIGGER trigger_auto_close_callback_requests_calls
  AFTER INSERT ON public.calls
  FOR EACH ROW
  WHEN (NEW.direction = 'outbound')
  EXECUTE FUNCTION public.auto_close_callback_requests_from_calls();

-- Function for calls table
CREATE OR REPLACE FUNCTION public.auto_close_callback_requests_from_calls()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Update any pending callback requests for this phone number to completed
  UPDATE public.internal_events 
  SET 
    status = 'completed',
    processed_at = now(),
    updated_at = now()
  WHERE 
    event_type = 'callback_requested' 
    AND status IN ('pending', 'processed')
    AND customer_phone = NEW.customer_phone
    AND organization_id = NEW.organization_id;
  
  -- Log the auto-closure for debugging
  IF FOUND THEN
    RAISE LOG 'Auto-closed callback requests for phone: % due to outbound call: %', 
      NEW.customer_phone, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;