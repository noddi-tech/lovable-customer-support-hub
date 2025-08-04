-- Create a function to trigger email sending when a new message is created
CREATE OR REPLACE FUNCTION public.send_email_on_message_insert()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER trigger_send_email_on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_email_on_message_insert();