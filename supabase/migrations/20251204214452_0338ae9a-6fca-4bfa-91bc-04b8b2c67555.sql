-- Simplify Slack notification triggers - don't require service key
-- The send-slack-notification function validates organization_id internally

CREATE OR REPLACE FUNCTION public.notify_slack_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_conversation RECORD;
  v_customer RECORD;
  v_inbox RECORD;
  v_event_type TEXT;
  v_message_count INTEGER;
  v_supabase_url TEXT := 'https://qgfaycwsangsqzpveoup.supabase.co';
BEGIN
  -- Only trigger for customer messages (not agent replies or internal notes)
  IF NEW.sender_type != 'customer' OR COALESCE(NEW.is_internal, false) = true THEN
    RETURN NEW;
  END IF;
  
  -- Get conversation details
  SELECT * INTO v_conversation
  FROM conversations
  WHERE id = NEW.conversation_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Count messages to determine if this is a new conversation or reply
  SELECT COUNT(*) INTO v_message_count
  FROM messages
  WHERE conversation_id = NEW.conversation_id;
  
  -- Determine event type: new conversation (1 message) or customer reply (>1 messages)
  v_event_type := CASE WHEN v_message_count = 1 THEN 'new_conversation' ELSE 'customer_reply' END;
  
  -- Get customer details
  SELECT * INTO v_customer FROM customers WHERE id = v_conversation.customer_id;
  
  -- Get inbox details
  SELECT * INTO v_inbox FROM inboxes WHERE id = v_conversation.inbox_id;
  
  -- Call Slack notification edge function asynchronously (non-blocking) using pg_net
  -- Using anon key since function validates organization internally
  BEGIN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-slack-notification',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'organization_id', v_conversation.organization_id,
        'event_type', v_event_type,
        'conversation_id', v_conversation.id,
        'customer_name', COALESCE(v_customer.full_name, v_customer.email, 'Unknown'),
        'customer_email', v_customer.email,
        'subject', v_conversation.subject,
        'preview_text', LEFT(NEW.content, 200),
        'inbox_name', v_inbox.name
      )::text
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Slack notification failed (non-blocking): %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.notify_slack_on_conversation_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_customer RECORD;
  v_inbox RECORD;
  v_assigned_user RECORD;
  v_event_type TEXT;
  v_supabase_url TEXT := 'https://qgfaycwsangsqzpveoup.supabase.co';
BEGIN
  -- Get customer and inbox once (shared by both event types)
  SELECT * INTO v_customer FROM customers WHERE id = NEW.customer_id;
  SELECT * INTO v_inbox FROM inboxes WHERE id = NEW.inbox_id;
  
  -- Check for assignment change
  IF OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id AND NEW.assigned_to_id IS NOT NULL THEN
    v_event_type := 'assignment';
    
    -- Get assigned user details
    SELECT * INTO v_assigned_user FROM profiles WHERE user_id = NEW.assigned_to_id;
    
    BEGIN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-slack-notification',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'organization_id', NEW.organization_id,
          'event_type', v_event_type,
          'conversation_id', NEW.id,
          'customer_name', COALESCE(v_customer.full_name, v_customer.email, 'Unknown'),
          'customer_email', v_customer.email,
          'subject', NEW.subject,
          'assigned_to_name', v_assigned_user.full_name,
          'assigned_to_email', v_assigned_user.email,
          'inbox_name', v_inbox.name
        )::text
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Slack assignment notification failed: %', SQLERRM;
    END;
  END IF;
  
  -- Check for conversation closed
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'closed' THEN
    v_event_type := 'conversation_closed';
    
    BEGIN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/send-slack-notification',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'organization_id', NEW.organization_id,
          'event_type', v_event_type,
          'conversation_id', NEW.id,
          'customer_name', COALESCE(v_customer.full_name, v_customer.email, 'Unknown'),
          'customer_email', v_customer.email,
          'subject', NEW.subject,
          'inbox_name', v_inbox.name
        )::text
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Slack closed notification failed: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;