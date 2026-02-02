-- =====================================================
-- Fix Slack Preview Text: strip first, then truncate
-- =====================================================

-- 1. Improve strip_html_tags to handle complex HTML (Outlook, Gmail, etc.)
CREATE OR REPLACE FUNCTION public.strip_html_tags(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  result := input_text;
  
  -- Remove DOCTYPE, XML declarations
  result := regexp_replace(result, '<!DOCTYPE[^>]*>', '', 'gi');
  result := regexp_replace(result, '<\?xml[^>]*\?>', '', 'gi');
  
  -- Remove entire HEAD section (contains CSS/fonts, no readable text)
  result := regexp_replace(result, '<head[^>]*>.*?</head>', '', 'gis');
  
  -- Remove style, script, title sections (multi-line mode)
  result := regexp_replace(result, '<style[^>]*>.*?</style>', '', 'gis');
  result := regexp_replace(result, '<script[^>]*>.*?</script>', '', 'gis');
  result := regexp_replace(result, '<title[^>]*>.*?</title>', '', 'gis');
  
  -- Remove HTML comments and conditional comments
  result := regexp_replace(result, '<!--.*?-->', '', 'gs');
  result := regexp_replace(result, '<!\[if[^>]*\]>.*?<!\[endif\]>', '', 'gis');
  
  -- Remove namespaced tags (o:p, v:shape, w:*, m:*)
  result := regexp_replace(result, '<[a-z]+:[^>]*>.*?</[a-z]+:[^>]*>', '', 'gis');
  result := regexp_replace(result, '<[a-z]+:[^>]*/>', '', 'gi');
  result := regexp_replace(result, '</?[a-z]+:[^>]*>', '', 'gi');
  
  -- Strip all remaining HTML tags
  result := regexp_replace(result, '<[^>]*>', '', 'g');
  
  -- Remove leftover angle brackets
  result := regexp_replace(result, '[<>]', ' ', 'g');
  
  -- Decode common HTML entities
  result := replace(result, '&nbsp;', ' ');
  result := replace(result, '&amp;', '&');
  result := replace(result, '&lt;', '<');
  result := replace(result, '&gt;', '>');
  result := replace(result, '&quot;', '"');
  result := replace(result, '&#39;', '''');
  result := replace(result, '&apos;', '''');
  
  -- Clean up excessive whitespace
  result := regexp_replace(result, E'[\\r\\n\\t]+', ' ', 'g');
  result := regexp_replace(result, '\\s+', ' ', 'g');
  result := trim(result);
  
  RETURN result;
END;
$$;

-- 2. Update notify_slack_on_new_message: FIX order - strip THEN truncate
CREATE OR REPLACE FUNCTION public.notify_slack_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation RECORD;
  v_customer RECORD;
  v_inbox RECORD;
  v_organization_id uuid;
  body jsonb;
  v_event_type text;
  v_supabase_url text;
  v_supabase_anon_key text;
BEGIN
  -- Only trigger for customer messages
  IF NEW.sender_type != 'customer' THEN
    RETURN NEW;
  END IF;

  -- Get conversation details
  SELECT c.*, c.organization_id, c.inbox_id, c.channel
  INTO v_conversation
  FROM conversations c
  WHERE c.id = NEW.conversation_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_organization_id := v_conversation.organization_id;

  -- Get customer details
  SELECT * INTO v_customer
  FROM customers
  WHERE id = v_conversation.customer_id;

  -- Get inbox details
  SELECT * INTO v_inbox
  FROM inboxes
  WHERE id = v_conversation.inbox_id;

  -- Determine if this is a new conversation or a reply
  -- Check if there are any previous customer messages in this conversation
  IF EXISTS (
    SELECT 1 FROM messages 
    WHERE conversation_id = NEW.conversation_id 
    AND sender_type = 'customer'
    AND id != NEW.id
  ) THEN
    v_event_type := 'customer_reply';
  ELSE
    v_event_type := 'new_conversation';
  END IF;

  -- Build payload - FIX: strip HTML first, THEN truncate
  body := jsonb_build_object(
    'organization_id', v_organization_id,
    'event_type', v_event_type,
    'conversation_id', NEW.conversation_id,
    'inbox_id', v_conversation.inbox_id,
    'customer_name', COALESCE(v_customer.full_name, v_customer.email, 'Unknown'),
    'customer_email', v_customer.email,
    'subject', v_conversation.subject,
    'preview_text', LEFT(strip_html_tags(NEW.content), 200),
    'inbox_name', v_inbox.name,
    'channel', v_conversation.channel
  );

  -- Get Supabase URL and anon key from environment
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);

  -- If not set via app.settings, use the known values
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://qgfaycwsangsqzpveoup.supabase.co';
  END IF;
  
  IF v_supabase_anon_key IS NULL OR v_supabase_anon_key = '' THEN
    v_supabase_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzIwMDMsImV4cCI6MjA2OTYwODAwM30.Q5dNwdnAxCDwhaEluhFnCO1hbTY4rZ1uhEy284FLhTE';
  END IF;

  -- Call the edge function via pg_net
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-slack-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_supabase_anon_key
    ),
    body := body
  );

  RETURN NEW;
END;
$$;

-- 3. Update notify_slack_on_conversation_update: FIX order - strip THEN truncate
CREATE OR REPLACE FUNCTION public.notify_slack_on_conversation_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_assigned_to RECORD;
  v_inbox RECORD;
  v_latest_message RECORD;
  body jsonb;
  v_event_type text;
  v_supabase_url text;
  v_supabase_anon_key text;
BEGIN
  -- Get customer details
  SELECT * INTO v_customer
  FROM customers
  WHERE id = NEW.customer_id;

  -- Get inbox details
  SELECT * INTO v_inbox
  FROM inboxes
  WHERE id = NEW.inbox_id;

  -- Get the latest message for preview
  SELECT * INTO v_latest_message
  FROM messages
  WHERE conversation_id = NEW.id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check for assignment change
  IF OLD.assigned_to_id IS DISTINCT FROM NEW.assigned_to_id AND NEW.assigned_to_id IS NOT NULL THEN
    v_event_type := 'assignment';
    
    -- Get assigned user details
    SELECT * INTO v_assigned_to
    FROM profiles
    WHERE user_id = NEW.assigned_to_id;

    -- Build payload - FIX: strip HTML first, THEN truncate
    body := jsonb_build_object(
      'organization_id', NEW.organization_id,
      'event_type', v_event_type,
      'conversation_id', NEW.id,
      'inbox_id', NEW.inbox_id,
      'customer_name', COALESCE(v_customer.full_name, v_customer.email, 'Unknown'),
      'customer_email', v_customer.email,
      'subject', NEW.subject,
      'preview_text', COALESCE(LEFT(strip_html_tags(v_latest_message.content), 200), ''),
      'assigned_to_name', v_assigned_to.full_name,
      'assigned_to_email', v_assigned_to.email,
      'inbox_name', v_inbox.name,
      'channel', NEW.channel
    );

  -- Check for conversation closed
  ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'closed' THEN
    v_event_type := 'conversation_closed';

    -- Build payload - FIX: strip HTML first, THEN truncate
    body := jsonb_build_object(
      'organization_id', NEW.organization_id,
      'event_type', v_event_type,
      'conversation_id', NEW.id,
      'inbox_id', NEW.inbox_id,
      'customer_name', COALESCE(v_customer.full_name, v_customer.email, 'Unknown'),
      'customer_email', v_customer.email,
      'subject', NEW.subject,
      'preview_text', COALESCE(LEFT(strip_html_tags(v_latest_message.content), 200), ''),
      'inbox_name', v_inbox.name,
      'channel', NEW.channel
    );

  ELSE
    -- No relevant change
    RETURN NEW;
  END IF;

  -- Get Supabase URL and anon key
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);

  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://qgfaycwsangsqzpveoup.supabase.co';
  END IF;
  
  IF v_supabase_anon_key IS NULL OR v_supabase_anon_key = '' THEN
    v_supabase_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZmF5Y3dzYW5nc3F6cHZlb3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzIwMDMsImV4cCI6MjA2OTYwODAwM30.Q5dNwdnAxCDwhaEluhFnCO1hbTY4rZ1uhEy284FLhTE';
  END IF;

  -- Call the edge function via pg_net
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-slack-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_supabase_anon_key
    ),
    body := body
  );

  RETURN NEW;
END;
$$;