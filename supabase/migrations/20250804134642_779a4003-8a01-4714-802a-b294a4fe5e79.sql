-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.send_email_on_message_insert()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO ''
AS $$
BEGIN
  -- Only trigger for non-internal messages from agents
  IF NEW.is_internal = false AND NEW.sender_type = 'agent' THEN
    -- Call the edge function asynchronously using pg_net (if available) or store in a queue table
    -- For now, we'll create a simple approach using a trigger
    PERFORM pg_notify('send_email', json_build_object(
      'message_id', NEW.id,
      'conversation_id', NEW.conversation_id,
      'content', NEW.content
    )::text);
  END IF;
  
  RETURN NEW;
END;
$$;