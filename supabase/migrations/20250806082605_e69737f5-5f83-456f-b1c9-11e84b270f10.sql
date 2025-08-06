-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
  is_read BOOLEAN NOT NULL DEFAULT false,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid());

-- Create function to send notification when note is assigned
CREATE OR REPLACE FUNCTION public.send_assignment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  assigned_user_name TEXT;
  conversation_subject TEXT;
  note_content_preview TEXT;
BEGIN
  -- Only send notification for internal notes that are being assigned (not unassigned)
  IF NEW.is_internal = true AND NEW.assigned_to_id IS NOT NULL THEN
    -- Check if this is a new assignment or a change in assignment
    IF (OLD IS NULL) OR (OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id) THEN
      -- Get the assigned user's name
      SELECT full_name INTO assigned_user_name
      FROM public.profiles 
      WHERE user_id = NEW.assigned_to_id;
      
      -- Get conversation subject
      SELECT subject INTO conversation_subject
      FROM public.conversations
      WHERE id = NEW.conversation_id;
      
      -- Create a preview of the note content (first 100 chars)
      note_content_preview := LEFT(NEW.content, 100);
      IF LENGTH(NEW.content) > 100 THEN
        note_content_preview := note_content_preview || '...';
      END IF;
      
      -- Insert notification
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        data
      ) VALUES (
        NEW.assigned_to_id,
        'Internal Note Assigned',
        'You have been assigned an internal note in: ' || COALESCE(conversation_subject, 'Untitled Conversation'),
        'info',
        jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'message_id', NEW.id,
          'note_preview', note_content_preview
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for assignment notifications
CREATE TRIGGER send_assignment_notification_trigger
AFTER INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.send_assignment_notification();

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.notifications 
  SET is_read = true, updated_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
$$;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.notifications 
  SET is_read = true, updated_at = now()
  WHERE user_id = auth.uid() AND is_read = false;
$$;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();