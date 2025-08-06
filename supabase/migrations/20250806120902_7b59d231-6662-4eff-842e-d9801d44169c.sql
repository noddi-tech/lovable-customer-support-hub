-- Fix notification cleanup and add comprehensive logging
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
BEGIN
  -- Only process internal notes that are being updated (not inserts)
  IF NEW.is_internal = true AND OLD IS NOT NULL THEN
    
    RAISE LOG 'START: Processing note edit notification for message: %, OLD content: "%" -> NEW content: "%"', 
      NEW.id, LEFT(OLD.content, 50), LEFT(NEW.content, 50);
    
    -- Get the current user ID (should be set by the before trigger)
    current_user_id := COALESCE(NEW.sender_id, auth.uid());
    
    RAISE LOG 'Current user ID: %, OLD assigned_to: %, NEW assigned_to: %', 
      current_user_id, OLD.assigned_to_id, NEW.assigned_to_id;
    
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
    IF OLD.assigned_to_id IS NOT NULL THEN
      SELECT full_name INTO old_assignee_name
      FROM public.profiles WHERE user_id = OLD.assigned_to_id;
    END IF;
    
    IF NEW.assigned_to_id IS NOT NULL THEN
      SELECT full_name INTO new_assignee_name
      FROM public.profiles WHERE user_id = NEW.assigned_to_id;
    END IF;
    
    -- Delete old notifications for this message to avoid duplicates
    -- Use more specific criteria to only delete edit-related notifications
    DELETE FROM public.notifications 
    WHERE data->>'message_id' = NEW.id::text 
    AND (
      data->>'action_type' IN ('content_updated', 'content_updated_assigned', 'assigned', 'unassigned', 'reassigned_from', 'reassigned_to')
      OR title IN ('Note Updated', 'Assigned Note Updated', 'Note Assigned', 'Note Unassigned', 'Note Reassigned')
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE LOG 'Deleted % old notifications for message: %', deleted_count, NEW.id;
    
    -- Check if assignment changed
    IF OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id THEN
      
      RAISE LOG 'ASSIGNMENT CHANGE: from % (%) to % (%)', 
        OLD.assigned_to_id, old_assignee_name, NEW.assigned_to_id, new_assignee_name;
      
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
            'action_type', 'unassigned',
            'editor_name', editor_user_name
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
            'action_type', 'assigned',
            'editor_name', editor_user_name
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
            'action_type', 'reassigned_from',
            'editor_name', editor_user_name,
            'new_assignee', new_assignee_name
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
            'action_type', 'reassigned_to',
            'editor_name', editor_user_name,
            'old_assignee', old_assignee_name
          )
        );
        RAISE LOG 'CREATED: Reassignment notifications for users: % and %', OLD.assigned_to_id, NEW.assigned_to_id;
      END IF;
      
    -- Handle content changes (when assignment didn't change but content did)
    ELSIF OLD.content IS DISTINCT FROM NEW.content THEN
      
      RAISE LOG 'CONTENT CHANGE: "%..." -> "%..." by user %', 
        LEFT(OLD.content, 30), LEFT(NEW.content, 30), current_user_id;
      
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
          'action_type', 'content_updated',
          'editor_name', editor_user_name
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
            'action_type', 'content_updated_assigned',
            'editor_name', editor_user_name
          )
        );
        RAISE LOG 'CREATED: Content update notification for assignee: %', NEW.assigned_to_id;
      END IF;
    ELSE
      RAISE LOG 'NO CHANGES DETECTED: content same=%, assignment same=%', 
        (OLD.content = NEW.content), (OLD.assigned_to_id = NEW.assigned_to_id);
    END IF;
  ELSE
    RAISE LOG 'SKIPPED: is_internal=%, OLD is null=%', NEW.is_internal, (OLD IS NULL);
  END IF;
  
  RAISE LOG 'END: Processing complete for message: %', NEW.id;
  RETURN NEW;
END;
$function$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_send_note_edit_notification ON public.messages;
CREATE TRIGGER trigger_send_note_edit_notification
AFTER UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.send_note_edit_notification();

-- Clean up existing duplicate notifications for the test message
DELETE FROM public.notifications 
WHERE data->>'message_id' = 'c8d01fe5-34d4-407c-81eb-ce4b5850b1f6'
AND title = 'Internal Note Assigned';