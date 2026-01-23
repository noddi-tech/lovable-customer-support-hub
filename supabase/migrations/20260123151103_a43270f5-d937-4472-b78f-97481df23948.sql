-- Fix 1: Update send_email_on_message_insert to skip widget channel conversations
CREATE OR REPLACE FUNCTION public.send_email_on_message_insert()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO ''
AS $$
DECLARE
  conv_channel TEXT;
BEGIN
  -- Only trigger for non-internal messages from agents
  IF NEW.is_internal = false AND NEW.sender_type = 'agent' THEN
    -- Check conversation channel - skip widget/chat conversations
    SELECT channel INTO conv_channel 
    FROM public.conversations 
    WHERE id = NEW.conversation_id;
    
    -- Only send email for email channel conversations (skip widget)
    IF conv_channel IS NULL OR conv_channel = 'email' THEN
      PERFORM pg_notify('send_email', json_build_object(
        'message_id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'content', NEW.content
      )::text);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix 2: Update handle_chat_session_abandonment to NOT auto-close on ended status
-- Only mark abandoned sessions for follow-up, keep ended sessions open for agent to close manually
CREATE OR REPLACE FUNCTION handle_chat_session_abandonment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a chat session is abandoned or ended, update the conversation
  IF NEW.status IN ('abandoned', 'ended') AND OLD.status NOT IN ('abandoned', 'ended') THEN
    -- If abandoned, mark conversation for follow-up (keep open)
    IF NEW.status = 'abandoned' THEN
      UPDATE conversations
      SET 
        status = 'open',
        preview_text = CASE 
          WHEN preview_text IS NULL OR preview_text = '' THEN '[Chat abandoned - follow up needed]'
          ELSE preview_text
        END,
        updated_at = NOW()
      WHERE id = NEW.conversation_id;
    END IF;
    
    -- If ended normally, KEEP conversation open (don't auto-close!)
    -- Agent can manually close when ready via the UI
    IF NEW.status = 'ended' THEN
      UPDATE conversations
      SET 
        preview_text = '[Chat ended]',
        updated_at = NOW()
      WHERE id = NEW.conversation_id;
      -- NOTE: Intentionally NOT changing status to 'closed' here
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;