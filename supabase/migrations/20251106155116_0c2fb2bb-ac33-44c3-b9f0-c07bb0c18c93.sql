-- Migration: Fix search_path vulnerability in service ticket functions
-- Issue: SECURITY DEFINER functions without SET search_path are vulnerable to schema hijacking
-- Fix: Add SET search_path = 'public' to protect against search path manipulation attacks

-- Fix generate_ticket_number function
CREATE OR REPLACE FUNCTION public.generate_ticket_number(org_id UUID)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'  -- Protection against search path manipulation
AS $$
DECLARE
  ticket_count INTEGER;
  new_ticket_number TEXT;
BEGIN
  SELECT COUNT(*) INTO ticket_count
  FROM public.service_tickets
  WHERE organization_id = org_id;
  
  new_ticket_number := 'ST-' || LPAD((ticket_count + 1)::TEXT, 6, '0');
  
  RETURN new_ticket_number;
END;
$$;

-- Fix log_service_ticket_event trigger function
CREATE OR REPLACE FUNCTION public.log_service_ticket_event()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'  -- Protection against search path manipulation
AS $$
BEGIN
  -- Log status changes
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.service_ticket_events (ticket_id, event_type, old_value, new_value, triggered_by_id)
    VALUES (NEW.id, 'status_changed', OLD.status::TEXT, NEW.status::TEXT, auth.uid());
  END IF;
  
  -- Log assignment changes
  IF (TG_OP = 'UPDATE' AND OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id) THEN
    INSERT INTO public.service_ticket_events (ticket_id, event_type, old_value, new_value, triggered_by_id)
    VALUES (NEW.id, 'assigned', OLD.assigned_to_id::TEXT, NEW.assigned_to_id::TEXT, auth.uid());
  END IF;
  
  -- Log priority changes
  IF (TG_OP = 'UPDATE' AND OLD.priority IS DISTINCT FROM NEW.priority) THEN
    INSERT INTO public.service_ticket_events (ticket_id, event_type, old_value, new_value, triggered_by_id)
    VALUES (NEW.id, 'priority_changed', OLD.priority::TEXT, NEW.priority::TEXT, auth.uid());
  END IF;
  
  -- Log creation
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.service_ticket_events (ticket_id, event_type, new_value, triggered_by_id)
    VALUES (NEW.id, 'created', NEW.status::TEXT, NEW.created_by_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION public.generate_ticket_number(UUID) IS 
'Generates sequential ticket numbers with search_path protection against schema hijacking attacks';

COMMENT ON FUNCTION public.log_service_ticket_event() IS 
'Logs service ticket events (status, assignment, priority changes) with search_path protection against schema hijacking attacks';