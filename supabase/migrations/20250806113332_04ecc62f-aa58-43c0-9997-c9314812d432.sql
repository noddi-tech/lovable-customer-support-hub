-- Fix the trigger function security and recreate it with proper permissions
DROP FUNCTION IF EXISTS public.send_note_edit_notification() CASCADE;

CREATE OR REPLACE FUNCTION public.send_note_edit_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- This is crucial for the function to bypass RLS
SET search_path TO ''
AS $function$
DECLARE
  editor_user_name TEXT;
  conversation_subject TEXT;
  note_content_preview TEXT;
  notification_count INTEGER;
BEGIN
  -- Only process if this is an internal note being updated and content changed
  IF NEW.is_internal = true AND OLD IS NOT NULL AND OLD.content IS DISTINCT FROM NEW.content THEN
    
    -- Get the editor's name
    SELECT full_name INTO editor_user_name
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    -- Get conversation subject
    SELECT subject INTO conversation_subject
    FROM public.conversations
    WHERE id = NEW.conversation_id;
    
    -- Create a preview of the updated note content (first 100 chars)
    note_content_preview := LEFT(NEW.content, 100);
    IF LENGTH(NEW.content) > 100 THEN
      note_content_preview := note_content_preview || '...';
    END IF;
    
    -- Always create a new notification for the editor (current user)
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      data,
      is_read
    ) VALUES (
      auth.uid(),
      'Internal Note Updated',
      'You updated your internal note in "' || COALESCE(conversation_subject, 'Untitled Conversation') || '"',
      'info',
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id,
        'note_preview', note_content_preview,
        'edited_by', auth.uid(),
        'edit_timestamp', extract(epoch from now())
      ),
      false
    );
    
    -- If the note is assigned to someone different from the editor, create a notification for them too
    IF NEW.assigned_to_id IS NOT NULL AND NEW.assigned_to_id != auth.uid() THEN
      INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        data,
        is_read
      ) VALUES (
        NEW.assigned_to_id,
        'Assigned Note Updated',
        'An internal note assigned to you in "' || COALESCE(conversation_subject, 'Untitled Conversation') || '" was updated by ' || COALESCE(editor_user_name, 'Someone'),
        'info',
        jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'message_id', NEW.id,
          'note_preview', note_content_preview,
          'edited_by', auth.uid(),
          'edit_timestamp', extract(epoch from now())
        ),
        false
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_send_note_edit_notification ON public.messages;
CREATE TRIGGER trigger_send_note_edit_notification
AFTER UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.send_note_edit_notification();