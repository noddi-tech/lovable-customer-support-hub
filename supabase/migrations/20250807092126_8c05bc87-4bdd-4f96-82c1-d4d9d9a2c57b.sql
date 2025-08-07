-- Create a simple debug table to track message insertion attempts
CREATE TABLE IF NOT EXISTS public.debug_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a trigger to log message insertions
CREATE OR REPLACE FUNCTION public.log_message_insertion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.debug_logs (event, data)
  VALUES ('message_insert_attempt', jsonb_build_object(
    'conversation_id', NEW.conversation_id,
    'sender_type', NEW.sender_type,
    'email_subject', NEW.email_subject,
    'content_length', LENGTH(NEW.content),
    'external_id', NEW.external_id
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS log_message_insertions ON public.messages;
CREATE TRIGGER log_message_insertions
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.log_message_insertion();