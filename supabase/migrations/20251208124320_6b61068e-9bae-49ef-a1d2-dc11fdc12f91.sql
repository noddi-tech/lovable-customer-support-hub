-- Update the trigger to NOT bump updated_at when only is_read changes
-- This prevents old conversations from appearing as "recent" when simply viewed

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- For conversations table: Don't bump updated_at for just is_read changes
  -- This preserves the original activity timestamp when someone just views a conversation
  IF TG_TABLE_NAME = 'conversations' THEN
    -- Check if ONLY is_read changed (all other important fields stayed the same)
    IF (OLD.is_read IS DISTINCT FROM NEW.is_read) AND
       (OLD.status IS NOT DISTINCT FROM NEW.status) AND
       (OLD.assigned_to_id IS NOT DISTINCT FROM NEW.assigned_to_id) AND
       (OLD.subject IS NOT DISTINCT FROM NEW.subject) AND
       (OLD.priority IS NOT DISTINCT FROM NEW.priority) AND
       (OLD.is_archived IS NOT DISTINCT FROM NEW.is_archived) AND
       (OLD.snooze_until IS NOT DISTINCT FROM NEW.snooze_until)
    THEN
      -- Keep the old updated_at value - don't bump it
      NEW.updated_at = OLD.updated_at;
      RETURN NEW;
    END IF;
  END IF;
  
  -- For all other changes, update the timestamp normally
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;