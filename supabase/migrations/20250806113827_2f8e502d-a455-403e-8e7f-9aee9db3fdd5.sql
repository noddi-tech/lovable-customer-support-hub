-- Drop and recreate the trigger function with comprehensive logic
DROP FUNCTION IF EXISTS public.send_note_edit_notification() CASCADE;

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
  old_assignee_name TEXT;
  new_assignee_name TEXT;
BEGIN
  -- Only process internal notes
  IF NEW.is_internal = true AND OLD IS NOT NULL THEN
    
    -- Get the editor's name
    SELECT full_name INTO editor_user_name
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    -- Get conversation subject
    SELECT subject INTO conversation_subject
    FROM public.conversations
    WHERE id = NEW.conversation_id;
    
    -- Create a preview of the note content
    note_content_preview := LEFT(NEW.content, 100);
    IF LENGTH(NEW.content) > 100 THEN
      note_content_preview := note_content_preview || '...';
    END IF;
    
    -- Get assignee names if they exist
    IF OLD.assigned_to_id IS NOT NULL THEN
      SELECT full_name INTO old_assignee_name
      FROM public.profiles WHERE user_id = OLD.assigned_to_id;
    END IF;
    
    IF NEW.assigned_to_id IS NOT NULL THEN
      SELECT full_name INTO new_assignee_name
      FROM public.profiles WHERE user_id = NEW.assigned_to_id;
    END IF;
    
    -- Handle assignment changes
    IF OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id THEN
      
      -- Delete old notifications for this message to avoid duplicates
      DELETE FROM public.notifications 
      WHERE data->>'message_id' = NEW.id::text;
      
      -- Case 1: Note was unassigned (had assignee, now doesn't)
      IF OLD.assigned_to_id IS NOT NULL AND NEW.assigned_to_id IS NULL THEN
        -- Notify the person who was unassigned
        INSERT INTO public.notifications (
          user_id, title, message, type, data
        ) VALUES (
          OLD.assigned_to_id,
          'Note Unassigned',
          'You were unassigned from a note in "' || COALESCE(conversation_subject, 'Untitled Conversation') || '"',
          'info',
          jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id,
            'note_preview', note_content_preview,
            'action_type', 'unassigned'
          )
        );
        
      -- Case 2: Note was newly assigned (no assignee, now has one)
      ELSIF OLD.assigned_to_id IS NULL AND NEW.assigned_to_id IS NOT NULL THEN
        -- Notify the newly assigned person
        INSERT INTO public.notifications (
          user_id, title, message, type, data
        ) VALUES (
          NEW.assigned_to_id,
          'Note Assigned',
          'You were assigned a note in "' || COALESCE(conversation_subject, 'Untitled Conversation') || '"',
          'info',
          jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id,
            'note_preview', note_content_preview,
            'action_type', 'assigned'
          )
        );
        
      -- Case 3: Note was reassigned (different assignee)
      ELSIF OLD.assigned_to_id IS NOT NULL AND NEW.assigned_to_id IS NOT NULL THEN
        -- Notify the old assignee
        INSERT INTO public.notifications (
          user_id, title, message, type, data
        ) VALUES (
          OLD.assigned_to_id,
          'Note Reassigned',
          'A note you were assigned in "' || COALESCE(conversation_subject, 'Untitled Conversation') || '" was reassigned to ' || COALESCE(new_assignee_name, 'someone else'),
          'info',
          jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id,
            'note_preview', note_content_preview,
            'action_type', 'reassigned_from'
          )
        );
        
        -- Notify the new assignee
        INSERT INTO public.notifications (
          user_id, title, message, type, data
        ) VALUES (
          NEW.assigned_to_id,
          'Note Assigned',
          'You were assigned a note in "' || COALESCE(conversation_subject, 'Untitled Conversation') || '" (reassigned from ' || COALESCE(old_assignee_name, 'someone') || ')',
          'info',
          jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id,
            'note_preview', note_content_preview,
            'action_type', 'reassigned_to'
          )
        );
      END IF;
      
    -- Handle content changes (when assignment didn't change)
    ELSIF OLD.content IS DISTINCT FROM NEW.content THEN
      
      -- Delete old notifications for this message to avoid duplicates
      DELETE FROM public.notifications 
      WHERE data->>'message_id' = NEW.id::text;
      
      -- Notify the editor
      INSERT INTO public.notifications (
        user_id, title, message, type, data
      ) VALUES (
        auth.uid(),
        'Note Updated',
        'You updated a note in "' || COALESCE(conversation_subject, 'Untitled Conversation') || '"',
        'info',
        jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'message_id', NEW.id,
          'note_preview', note_content_preview,
          'action_type', 'content_updated'
        )
      );
      
      -- If assigned to someone else, notify them too
      IF NEW.assigned_to_id IS NOT NULL AND NEW.assigned_to_id != auth.uid() THEN
        INSERT INTO public.notifications (
          user_id, title, message, type, data
        ) VALUES (
          NEW.assigned_to_id,
          'Assigned Note Updated',
          'A note assigned to you in "' || COALESCE(conversation_subject, 'Untitled Conversation') || '" was updated by ' || COALESCE(editor_user_name, 'someone'),
          'info',
          jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id,
            'note_preview', note_content_preview,
            'action_type', 'content_updated_assigned'
          )
        );
      END IF;
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