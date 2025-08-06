-- Fix notification duplication by properly handling the assignment trigger
DROP TRIGGER IF EXISTS send_assignment_notification_trigger ON public.messages;
DROP TRIGGER IF EXISTS trigger_send_assignment_notification ON public.messages;

-- Update the edit notification function to handle ALL scenarios including assignments
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
  current_user_id UUID;
  deleted_count INTEGER;
  is_new_note BOOLEAN;
BEGIN
  -- Only process internal notes
  IF NEW.is_internal = true THEN
    
    -- Determine if this is a new note (INSERT) or an edit (UPDATE)
    is_new_note := (OLD IS NULL);
    
    RAISE LOG 'START: Processing note notification for message: %, is_new_note: %', NEW.id, is_new_note;
    
    -- Get the current user ID (should be set by the before trigger for updates)
    current_user_id := COALESCE(NEW.sender_id, auth.uid());
    
    -- Get the editor's name
    SELECT full_name INTO editor_user_name
    FROM public.profiles 
    WHERE user_id = current_user_id;
    
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
    IF NOT is_new_note AND OLD.assigned_to_id IS NOT NULL THEN
      SELECT full_name INTO old_assignee_name
      FROM public.profiles WHERE user_id = OLD.assigned_to_id;
    END IF;
    
    IF NEW.assigned_to_id IS NOT NULL THEN
      SELECT full_name INTO new_assignee_name
      FROM public.profiles WHERE user_id = NEW.assigned_to_id;
    END IF;
    
    -- For updates, delete old notifications for this message to avoid duplicates
    IF NOT is_new_note THEN
      DELETE FROM public.notifications 
      WHERE data->>'message_id' = NEW.id::text;
      
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      RAISE LOG 'Deleted % old notifications for message: %', deleted_count, NEW.id;
    END IF;
    
    -- Handle new note creation with assignment
    IF is_new_note AND NEW.assigned_to_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        user_id, title, message, type, data
      ) VALUES (
        NEW.assigned_to_id,
        'Internal Note Assigned',
        'You have been assigned an internal note in: ' || COALESCE(conversation_subject, 'Untitled Conversation'),
        'info',
        jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'message_id', NEW.id,
          'note_preview', note_content_preview,
          'action_type', 'new_assignment'
        )
      );
      RAISE LOG 'CREATED: New assignment notification for user: %', NEW.assigned_to_id;
      
    -- Handle updates
    ELSIF NOT is_new_note THEN
      
      -- Check if assignment changed
      IF OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id THEN
        
        RAISE LOG 'ASSIGNMENT CHANGE: from % to %', OLD.assigned_to_id, NEW.assigned_to_id;
        
        -- Case 1: Note was unassigned (had assignee, now doesn't)
        IF OLD.assigned_to_id IS NOT NULL AND NEW.assigned_to_id IS NULL THEN
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
          RAISE LOG 'CREATED: Unassignment notification for user: %', OLD.assigned_to_id;
          
        -- Case 2: Note was newly assigned (no assignee, now has one)
        ELSIF OLD.assigned_to_id IS NULL AND NEW.assigned_to_id IS NOT NULL THEN
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
          RAISE LOG 'CREATED: Assignment notification for user: %', NEW.assigned_to_id;
          
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
          RAISE LOG 'CREATED: Reassignment notifications for users: % and %', OLD.assigned_to_id, NEW.assigned_to_id;
        END IF;
        
      -- Handle content changes (when assignment didn't change but content did)
      ELSIF OLD.content IS DISTINCT FROM NEW.content THEN
        
        RAISE LOG 'CONTENT CHANGE: by user %', current_user_id;
        
        -- Always notify the editor about their own edit
        INSERT INTO public.notifications (
          user_id, title, message, type, data
        ) VALUES (
          current_user_id,
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
        RAISE LOG 'CREATED: Content update notification for editor: %', current_user_id;
        
        -- If assigned to someone else, notify them too
        IF NEW.assigned_to_id IS NOT NULL AND NEW.assigned_to_id != current_user_id THEN
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
          RAISE LOG 'CREATED: Content update notification for assignee: %', NEW.assigned_to_id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate triggers
DROP TRIGGER IF EXISTS trigger_send_note_edit_notification ON public.messages;
CREATE TRIGGER trigger_send_note_edit_notification
AFTER INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.send_note_edit_notification();

-- Clean up all existing duplicate notifications
DELETE FROM public.notifications 
WHERE data->>'message_id' = 'c8d01fe5-34d4-407c-81eb-ce4b5850b1f6';