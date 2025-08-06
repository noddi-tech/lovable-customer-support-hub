-- Fix trigger to handle NULL sender_id
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
      RAISE NOTICE 'Content changed, sending notifications...';
      
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
      
      -- Get the original author ID (use current user if sender_id is null)
      original_author_id := COALESCE(OLD.sender_id, auth.uid());
      
      RAISE NOTICE 'Editor: %, Original author: %, Assigned to: %', 
        auth.uid(), 
        original_author_id, 
        NEW.assigned_to_id;
      
      -- Always send notification to the current user when they edit a note
      RAISE NOTICE 'Creating notification for editor/author...';
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
      
      -- If the note is assigned to someone different from the editor, also notify them
      IF NEW.assigned_to_id IS NOT NULL AND NEW.assigned_to_id != auth.uid() THEN
        RAISE NOTICE 'Creating notification for assigned user: %', NEW.assigned_to_id;
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
    ELSE
      RAISE NOTICE 'Content has not changed, skipping notification';
    END IF;
  ELSE
    RAISE NOTICE 'Not an internal note or OLD is NULL, skipping';
  END IF;
  
  RETURN NEW;
END;
$function$;