-- Create trigger for sending notification when internal notes are edited
CREATE OR REPLACE FUNCTION public.send_note_edit_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  editor_user_name TEXT;
  conversation_subject TEXT;
  note_content_preview TEXT;
  original_author_id UUID;
BEGIN
  -- Only process if this is an internal note being updated
  IF NEW.is_internal = true AND OLD IS NOT NULL THEN
    -- Check if the content has actually changed
    IF OLD.content IS DISTINCT FROM NEW.content THEN
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
      
      -- Get the original author ID
      original_author_id := OLD.sender_id;
      
      -- Send notification to the original author if they're not the editor
      IF original_author_id != auth.uid() THEN
        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          type,
          data
        ) VALUES (
          original_author_id,
          'Internal Note Updated',
          'Your internal note in "' || COALESCE(conversation_subject, 'Untitled Conversation') || '" was updated by ' || COALESCE(editor_user_name, 'Someone'),
          'info',
          jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id,
            'note_preview', note_content_preview,
            'edited_by', auth.uid()
          )
        );
      END IF;
      
      -- If the note is assigned to someone, also notify the assigned person (if different from editor and author)
      IF NEW.assigned_to_id IS NOT NULL AND NEW.assigned_to_id != auth.uid() AND NEW.assigned_to_id != original_author_id THEN
        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          type,
          data
        ) VALUES (
          NEW.assigned_to_id,
          'Assigned Note Updated',
          'An internal note assigned to you in "' || COALESCE(conversation_subject, 'Untitled Conversation') || '" was updated by ' || COALESCE(editor_user_name, 'Someone'),
          'info',
          jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id,
            'note_preview', note_content_preview,
            'edited_by', auth.uid()
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$