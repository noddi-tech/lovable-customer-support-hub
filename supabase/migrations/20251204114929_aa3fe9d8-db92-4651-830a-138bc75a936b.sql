-- =============================================
-- NOTIFICATION TRIGGERS FOR COMPLETE NOTIFICATION SYSTEM
-- =============================================

-- 1. CONVERSATION ASSIGNMENT NOTIFICATION TRIGGER
-- Notifies users when they are assigned to a conversation
CREATE OR REPLACE FUNCTION public.notify_conversation_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on assignment changes (not initial insert with NULL)
  IF TG_OP = 'UPDATE' AND NEW.assigned_to_id IS NOT NULL 
     AND (OLD.assigned_to_id IS NULL OR OLD.assigned_to_id != NEW.assigned_to_id) THEN
    
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

DROP TRIGGER IF EXISTS trigger_notify_conversation_assignment ON public.conversations;
CREATE TRIGGER trigger_notify_conversation_assignment
  AFTER UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_conversation_assignment();

-- 2. CUSTOMER REPLY NOTIFICATION TRIGGER
-- Notifies assigned agent when customer replies to a conversation
CREATE OR REPLACE FUNCTION public.notify_customer_reply()
RETURNS TRIGGER AS $$
DECLARE
  conv_record RECORD;
BEGIN
  -- Only trigger for customer messages (not agent messages)
  IF NEW.sender_type = 'customer' AND NEW.is_internal = false THEN
    
    -- Get conversation and assigned agent
    SELECT 
      c.id as conv_id,
      c.subject,
      c.assigned_to_id,
      c.inbox_id,
      cust.full_name as customer_name,
      cust.email as customer_email,
      i.name as inbox_name
    INTO conv_record
    FROM public.conversations c
    LEFT JOIN public.customers cust ON c.customer_id = cust.id
    LEFT JOIN public.inboxes i ON c.inbox_id = i.id
    WHERE c.id = NEW.conversation_id;
    
    -- Only notify if there's an assigned agent
    IF conv_record.assigned_to_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        conv_record.assigned_to_id,
        'New Reply: ' || COALESCE(conv_record.subject, 'Conversation'),
        COALESCE(conv_record.customer_name, conv_record.customer_email, 'Customer') || ' replied to your conversation',
        'customer_reply',
        jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'message_id', NEW.id,
          'subject', conv_record.subject,
          'customer_name', conv_record.customer_name,
          'customer_email', conv_record.customer_email,
          'inbox_id', conv_record.inbox_id,
          'inbox_name', conv_record.inbox_name,
          'preview_text', LEFT(NEW.content, 200),
          'urgency', 'normal'
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_customer_reply ON public.messages;
CREATE TRIGGER trigger_notify_customer_reply
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_customer_reply();

-- 3. @MENTION DETECTION AND NOTIFICATION TRIGGER
-- Detects @mentions in internal notes and notifies mentioned users
CREATE OR REPLACE FUNCTION public.notify_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_user RECORD;
  mention_pattern TEXT;
  conv_record RECORD;
  sender_name TEXT;
BEGIN
  -- Only process internal messages that might contain mentions
  IF NEW.is_internal = true AND NEW.content LIKE '%@%' THEN
    
    -- Get conversation details
    SELECT 
      c.id as conv_id,
      c.subject,
      c.organization_id,
      cust.full_name as customer_name
    INTO conv_record
    FROM public.conversations c
    LEFT JOIN public.customers cust ON c.customer_id = cust.id
    WHERE c.id = NEW.conversation_id;
    
    -- Get sender name
    SELECT full_name INTO sender_name
    FROM public.profiles
    WHERE user_id = NEW.sender_id;
    
    -- Find all users in the organization whose names are mentioned
    FOR mentioned_user IN
      SELECT DISTINCT p.user_id, p.full_name, p.email
      FROM public.profiles p
      JOIN public.organization_memberships om ON p.user_id = om.user_id
      WHERE om.organization_id = conv_record.organization_id
        AND om.status = 'active'
        AND p.user_id != NEW.sender_id  -- Don't notify the sender
        AND (
          -- Match @Full Name (case insensitive)
          NEW.content ILIKE '%@' || p.full_name || '%'
          -- Match @firstname (case insensitive, just first word of name)
          OR NEW.content ILIKE '%@' || split_part(p.full_name, ' ', 1) || '%'
        )
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        mentioned_user.user_id,
        'Mentioned by ' || COALESCE(sender_name, 'Someone'),
        'You were mentioned in "' || COALESCE(conv_record.subject, 'a conversation') || '"',
        'mention',
        jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'message_id', NEW.id,
          'subject', conv_record.subject,
          'customer_name', conv_record.customer_name,
          'mentioned_by_id', NEW.sender_id,
          'mentioned_by_name', sender_name,
          'preview_text', LEFT(NEW.content, 200),
          'urgency', 'high'
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_mentions ON public.messages;
CREATE TRIGGER trigger_notify_mentions
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_mentions();

-- 4. NEW CONVERSATION NOTIFICATION (for unassigned conversations)
-- Notifies inbox members when a new conversation is created without assignment
CREATE OR REPLACE FUNCTION public.notify_new_conversation()
RETURNS TRIGGER AS $$
DECLARE
  inbox_member RECORD;
  customer_name TEXT;
BEGIN
  -- Only trigger for new email conversations without assignment
  IF NEW.assigned_to_id IS NULL AND NEW.channel = 'email' THEN
    
    -- Get customer name
    SELECT full_name INTO customer_name
    FROM public.customers
    WHERE id = NEW.customer_id;
    
    -- Notify all agents with access to this inbox (or all in org if no inbox)
    FOR inbox_member IN
      SELECT DISTINCT om.user_id
      FROM public.organization_memberships om
      WHERE om.organization_id = NEW.organization_id
        AND om.status = 'active'
        AND om.role IN ('agent', 'admin', 'super_admin')
      LIMIT 10  -- Limit to prevent spam for large orgs
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, data)
      VALUES (
        inbox_member.user_id,
        'New Conversation: ' || COALESCE(NEW.subject, 'No subject'),
        'New email from ' || COALESCE(customer_name, 'Unknown'),
        'new_conversation',
        jsonb_build_object(
          'conversation_id', NEW.id,
          'subject', NEW.subject,
          'customer_name', customer_name,
          'inbox_id', NEW.inbox_id,
          'channel', NEW.channel,
          'urgency', 'normal'
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_new_conversation ON public.conversations;
CREATE TRIGGER trigger_notify_new_conversation
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_conversation();