CREATE OR REPLACE FUNCTION public.notify_conversation_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_auth_uid uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.assigned_to_id IS NOT NULL
     AND (OLD.assigned_to_id IS NULL OR OLD.assigned_to_id != NEW.assigned_to_id) THEN

    -- assigned_to_id is a ProfileId; notifications.user_id must be the auth user id (RLS uses auth.uid())
    SELECT p.user_id INTO target_auth_uid FROM public.profiles p WHERE p.id = NEW.assigned_to_id;
    IF target_auth_uid IS NULL THEN
      target_auth_uid := NEW.assigned_to_id;
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type, data)
    SELECT
      target_auth_uid,
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

    IF NOT FOUND THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        target_auth_uid,
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
$$;

UPDATE public.notifications n
SET user_id = p.user_id
FROM public.profiles p
WHERE n.type = 'assignment'
  AND n.user_id = p.id
  AND p.user_id IS NOT NULL
  AND n.created_at > now() - interval '7 days';
