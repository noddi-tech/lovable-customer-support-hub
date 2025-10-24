-- Function to create notification when conversation is assigned
CREATE OR REPLACE FUNCTION public.notify_conversation_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  assigned_user_name TEXT;
  conversation_subject TEXT;
  customer_name TEXT;
BEGIN
  -- Only send notification if conversation is being assigned (not unassigned)
  IF NEW.assigned_to_id IS NOT NULL THEN
    -- Check if this is a new assignment or a change in assignment
    IF (OLD IS NULL) OR (OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id) THEN
      -- Get the assigned user's name
      SELECT full_name INTO assigned_user_name
      FROM public.profiles 
      WHERE user_id = NEW.assigned_to_id;
      
      -- Get conversation subject
      conversation_subject := COALESCE(NEW.subject, 'Untitled conversation');
      
      -- Get customer name
      SELECT full_name INTO customer_name
      FROM public.customers
      WHERE id = NEW.customer_id;
      
      -- Insert notification
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        data
      ) VALUES (
        NEW.assigned_to_id,
        'Conversation Assigned',
        'You have been assigned: ' || conversation_subject || ' from ' || COALESCE(customer_name, 'Unknown Customer'),
        'info',
        jsonb_build_object(
          'conversation_id', NEW.id,
          'channel', NEW.channel,
          'priority', NEW.priority,
          'customer_id', NEW.customer_id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for conversation assignments
DROP TRIGGER IF EXISTS notify_conversation_assignment_trigger ON public.conversations;
CREATE TRIGGER notify_conversation_assignment_trigger
AFTER INSERT OR UPDATE OF assigned_to_id ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.notify_conversation_assignment();

-- Enable realtime for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Add to realtime publication (only if not already added)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;