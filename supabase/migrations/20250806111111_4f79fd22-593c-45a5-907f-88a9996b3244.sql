-- Update the send_note_edit_notification function to ensure notifications are properly created/updated
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
  existing_notification_id UUID;
  notification_count INTEGER;
BEGIN
  -- Add debug logging
  RAISE NOTICE 'Trigger fired: is_internal=%, OLD IS NULL=%, content changed=%', 
    NEW.is_internal, 
    (OLD IS NULL), 
    (OLD.content IS DISTINCT FROM NEW.content);
  
  -- Only process if this is an internal note being updated
  IF NEW.is_internal = true AND OLD IS NOT NULL THEN
    RAISE NOTICE 'Processing internal note update...';
    
    -- Check if the content has actually changed
    IF OLD.content IS DISTINCT FROM NEW.content THEN
      RAISE NOTICE 'Content changed, updating notifications...';
      
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
      
      RAISE NOTICE 'Looking for existing notification for message_id: %', NEW.id;
      
      -- Always create a new notification for the editor (current user)
      -- This ensures notifications appear immediately
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
        false  -- Mark as unread so it appears in the notification bell
      );
      
      RAISE NOTICE 'Created new notification for editor: %', auth.uid();
      
      -- If the note is assigned to someone different from the editor, create a notification for them too
      IF NEW.assigned_to_id IS NOT NULL AND NEW.assigned_to_id != auth.uid() THEN
        RAISE NOTICE 'Creating notification for assigned user: %', NEW.assigned_to_id;
        
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
          false  -- Mark as unread so it appears in the notification bell
        );
        
        RAISE NOTICE 'Created new notification for assigned user: %', NEW.assigned_to_id;
      END IF;
      
      -- Count total notifications created
      SELECT COUNT(*) INTO notification_count
      FROM public.notifications 
      WHERE (data->>'message_id')::uuid = NEW.id
      AND (data->>'edit_timestamp')::bigint = extract(epoch from now())::bigint;
      
      RAISE NOTICE 'Total notifications created for this edit: %', notification_count;
      
    ELSE
      RAISE NOTICE 'Content has not changed, skipping notification';
    END IF;
  ELSE
    RAISE NOTICE 'Not an internal note or OLD is NULL, skipping';
  END IF;
  
  RETURN NEW;
END;
$function$;