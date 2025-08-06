-- Update trigger to modify existing notifications instead of creating new ones
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
      
      -- Look for existing notification for this message
      SELECT id INTO existing_notification_id
      FROM public.notifications
      WHERE (data->>'message_id')::uuid = NEW.id
      AND user_id = auth.uid()
      LIMIT 1;
      
      IF existing_notification_id IS NOT NULL THEN
        RAISE NOTICE 'Found existing notification: %, updating it', existing_notification_id;
        
        -- Update existing notification
        UPDATE public.notifications 
        SET 
          message = 'You updated your internal note in "' || COALESCE(conversation_subject, 'Untitled Conversation') || '"',
          data = jsonb_set(
            data, 
            '{note_preview}', 
            to_jsonb(note_content_preview)
          ),
          updated_at = now()
        WHERE id = existing_notification_id;
        
      ELSE
        RAISE NOTICE 'No existing notification found, creating new one';
        
        -- Create new notification if none exists
        INSERT INTO public.notifications (
          user_id,
          title,
          message,
          type,
          data
        ) VALUES (
          auth.uid(),
          'Internal Note Updated',
          'You updated your internal note in "' || COALESCE(conversation_subject, 'Untitled Conversation') || '"',
          'info',
          jsonb_build_object(
            'conversation_id', NEW.conversation_id,
            'message_id', NEW.id,
            'note_preview', note_content_preview,
            'edited_by', auth.uid()
          )
        );
      END IF;
      
      -- Also update notification for assigned user if different from editor
      IF NEW.assigned_to_id IS NOT NULL AND NEW.assigned_to_id != auth.uid() THEN
        RAISE NOTICE 'Checking for assigned user notification for user: %', NEW.assigned_to_id;
        
        -- Look for existing notification for the assigned user
        SELECT id INTO existing_notification_id
        FROM public.notifications
        WHERE (data->>'message_id')::uuid = NEW.id
        AND user_id = NEW.assigned_to_id
        LIMIT 1;
        
        IF existing_notification_id IS NOT NULL THEN
          RAISE NOTICE 'Found existing assigned notification: %, updating it', existing_notification_id;
          
          -- Update existing notification for assigned user
          UPDATE public.notifications 
          SET 
            message = 'An internal note assigned to you in "' || COALESCE(conversation_subject, 'Untitled Conversation') || '" was updated by ' || COALESCE(editor_user_name, 'Someone'),
            data = jsonb_set(
              data, 
              '{note_preview}', 
              to_jsonb(note_content_preview)
            ),
            updated_at = now()
          WHERE id = existing_notification_id;
          
        ELSE
          RAISE NOTICE 'No existing assigned notification found, creating new one';
          
          -- Create new notification for assigned user if none exists
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
    ELSE
      RAISE NOTICE 'Content has not changed, skipping notification';
    END IF;
  ELSE
    RAISE NOTICE 'Not an internal note or OLD is NULL, skipping';
  END IF;
  
  RETURN NEW;
END;
$function$;