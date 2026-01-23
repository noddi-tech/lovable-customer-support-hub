-- Function to auto-abandon inactive chat sessions (no activity for 2 minutes)
CREATE OR REPLACE FUNCTION auto_abandon_inactive_chat_sessions()
RETURNS TABLE(abandoned_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count_abandoned bigint;
BEGIN
  WITH abandoned_sessions AS (
    UPDATE widget_chat_sessions
    SET 
      status = 'abandoned',
      ended_at = NOW(),
      updated_at = NOW()
    WHERE status IN ('waiting', 'active')
      AND last_seen_at < NOW() - INTERVAL '2 minutes'
    RETURNING id, conversation_id, visitor_email
  )
  SELECT COUNT(*) INTO count_abandoned FROM abandoned_sessions;
  
  RETURN QUERY SELECT count_abandoned;
END;
$$;

-- Trigger function to handle when a chat session is abandoned
-- Ensures the conversation stays open for follow-up if visitor had an email
CREATE OR REPLACE FUNCTION handle_chat_session_abandonment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a chat session is abandoned or ended, ensure the conversation is properly updated
  IF NEW.status IN ('abandoned', 'ended') AND OLD.status NOT IN ('abandoned', 'ended') THEN
    -- Update conversation to mark it for follow-up if it was abandoned (not manually ended)
    IF NEW.status = 'abandoned' THEN
      UPDATE conversations
      SET 
        status = 'open',
        preview_text = CASE 
          WHEN preview_text IS NULL OR preview_text = '' THEN '[Chat abandoned - follow up needed]'
          ELSE preview_text || ' [Chat abandoned]'
        END,
        updated_at = NOW()
      WHERE id = NEW.conversation_id
        AND status = 'open';
    END IF;
    
    -- If ended normally, close the conversation
    IF NEW.status = 'ended' THEN
      UPDATE conversations
      SET 
        status = 'closed',
        updated_at = NOW()
      WHERE id = NEW.conversation_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for chat session status changes
DROP TRIGGER IF EXISTS trigger_chat_session_status_change ON widget_chat_sessions;
CREATE TRIGGER trigger_chat_session_status_change
  AFTER UPDATE OF status ON widget_chat_sessions
  FOR EACH ROW
  WHEN (NEW.status IN ('abandoned', 'ended') AND OLD.status NOT IN ('abandoned', 'ended'))
  EXECUTE FUNCTION handle_chat_session_abandonment();