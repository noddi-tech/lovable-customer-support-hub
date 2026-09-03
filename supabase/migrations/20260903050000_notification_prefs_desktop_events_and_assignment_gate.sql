-- Expand personal desktop notification prefs and gate assignment inserts on app_on_conversation_assigned.

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS desktop_on_assignment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS desktop_on_mention boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS desktop_on_incoming_call boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS desktop_on_missed_call boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS desktop_on_voicemail boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS desktop_on_sla_breach boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.notify_conversation_assignment()
RETURNS TRIGGER AS $$
DECLARE
  pref_enabled boolean;
BEGIN
  -- Only trigger on assignment changes (not initial insert with NULL)
  IF TG_OP = 'UPDATE' AND NEW.assigned_to_id IS NOT NULL
     AND (OLD.assigned_to_id IS NULL OR OLD.assigned_to_id != NEW.assigned_to_id) THEN

    SELECT COALESCE(np.app_on_conversation_assigned, true)
    INTO pref_enabled
    FROM public.notification_preferences np
    WHERE np.user_id = NEW.assigned_to_id
      AND np.organization_id = NEW.organization_id;

    IF NOT FOUND THEN
      pref_enabled := true;
    END IF;

    IF NOT pref_enabled THEN
      RETURN NEW;
    END IF;

    -- Get conversation details for notification
    INSERT INTO public.notifications (user_id, title, message, type, data)
    SELECT
      NEW.assigned_to_id,
      'New Assignment: ' || COALESCE(NEW.subject, 'Conversation'),
      'You have been assigned to a conversation' ||
        CASE WHEN c.full_name IS NOT NULL THEN ' from ' || c.full_name ELSE '' END,
      'assignment',
      jsonb_build_object(
        'conversation_id', NEW.id,
        'subject', NEW.subject,
        'customer_name', c.full_name,
        'customer_email', c.email,
        'previous_assignee_id', OLD.assigned_to_id,
        'inbox_id', NEW.inbox_id,
        'urgency', 'high'
      )
    FROM public.customers c
    WHERE c.id = NEW.customer_id;

    -- If no customer, still create notification
    IF NOT FOUND THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        NEW.assigned_to_id,
        'New Assignment: ' || COALESCE(NEW.subject, 'Conversation'),
        'You have been assigned to a conversation',
        'assignment',
        jsonb_build_object(
          'conversation_id', NEW.id,
          'subject', NEW.subject,
          'previous_assignee_id', OLD.assigned_to_id,
          'inbox_id', NEW.inbox_id,
          'urgency', 'high'
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
