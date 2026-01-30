-- Migration: Add channel field to Slack notifications and fetch preview for all events
-- This ensures all Slack notifications show the source (email/widget) and message preview

-- Update notify_slack_on_new_message to include channel
CREATE OR REPLACE FUNCTION public.notify_slack_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation RECORD;
  v_customer RECORD;
  v_inbox RECORD;
  v_existing_messages_count INTEGER;
  v_event_type TEXT;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Only trigger for customer messages
  IF NEW.sender_type != 'customer' THEN
    RETURN NEW;
  END IF;

  -- Get conversation details
  SELECT * INTO v_conversation
  FROM conversations
  WHERE id = NEW.conversation_id;

  IF v_conversation IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get customer details
  SELECT * INTO v_customer
  FROM customers
  WHERE id = v_conversation.customer_id;

  -- Get inbox details
  SELECT * INTO v_inbox
  FROM inboxes
  WHERE id = v_conversation.inbox_id;

  -- Determine if this is a new conversation or a reply
  SELECT COUNT(*) INTO v_existing_messages_count
  FROM messages
  WHERE conversation_id = NEW.conversation_id
    AND id != NEW.id
    AND sender_type = 'customer';

  IF v_existing_messages_count = 0 THEN
    v_event_type := 'new_conversation';
  ELSE
    v_event_type := 'customer_reply';
  END IF;

  -- Get Supabase URL and service role key
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- If settings are not available, try environment approach
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://qgfaycwsangsqzpveoup.supabase.co';
  END IF;

  -- Call the edge function via pg_net
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-slack-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'organization_id', v_conversation.organization_id,
      'event_type', v_event_type,
      'conversation_id', v_conversation.id,
      'inbox_id', v_conversation.inbox_id,
      'customer_name', COALESCE(v_customer.full_name, 'Unknown'),
      'customer_email', v_customer.email,
      'subject', v_conversation.subject,
      'preview_text', strip_html_tags(LEFT(NEW.content, 200)),
      'inbox_name', v_inbox.name,
      'channel', v_conversation.channel::TEXT
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error in notify_slack_on_new_message: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Update notify_slack_on_conversation_update to include channel and preview for all events
CREATE OR REPLACE FUNCTION public.notify_slack_on_conversation_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_inbox RECORD;
  v_assigned_user RECORD;
  v_event_type TEXT;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_latest_message RECORD;
BEGIN
  -- Get customer details
  SELECT * INTO v_customer
  FROM customers
  WHERE id = NEW.customer_id;

  -- Get inbox details
  SELECT * INTO v_inbox
  FROM inboxes
  WHERE id = NEW.inbox_id;

  -- Get Supabase URL and service role key
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://qgfaycwsangsqzpveoup.supabase.co';
  END IF;

  -- Fetch latest message for preview (used by assignment and closed events)
  SELECT content INTO v_latest_message
  FROM messages
  WHERE conversation_id = NEW.id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check for assignment changes
  IF OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id AND NEW.assigned_to_id IS NOT NULL THEN
    v_event_type := 'assignment';

    -- Get assigned user details
    SELECT * INTO v_assigned_user
    FROM profiles
    WHERE id = NEW.assigned_to_id;

    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-slack-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := jsonb_build_object(
        'organization_id', NEW.organization_id,
        'event_type', v_event_type,
        'conversation_id', NEW.id,
        'inbox_id', NEW.inbox_id,
        'customer_name', COALESCE(v_customer.full_name, 'Unknown'),
        'customer_email', v_customer.email,
        'subject', NEW.subject,
        'preview_text', COALESCE(strip_html_tags(LEFT(v_latest_message.content, 200)), ''),
        'inbox_name', v_inbox.name,
        'assigned_to_name', v_assigned_user.full_name,
        'assigned_to_email', v_assigned_user.email,
        'channel', NEW.channel::TEXT
      )
    );
  END IF;

  -- Check for status change to closed
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'closed' THEN
    v_event_type := 'conversation_closed';

    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/send-slack-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := jsonb_build_object(
        'organization_id', NEW.organization_id,
        'event_type', v_event_type,
        'conversation_id', NEW.id,
        'inbox_id', NEW.inbox_id,
        'customer_name', COALESCE(v_customer.full_name, 'Unknown'),
        'customer_email', v_customer.email,
        'subject', NEW.subject,
        'preview_text', COALESCE(strip_html_tags(LEFT(v_latest_message.content, 200)), ''),
        'inbox_name', v_inbox.name,
        'channel', NEW.channel::TEXT
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_slack_on_conversation_update: %', SQLERRM;
    RETURN NEW;
END;
$$;