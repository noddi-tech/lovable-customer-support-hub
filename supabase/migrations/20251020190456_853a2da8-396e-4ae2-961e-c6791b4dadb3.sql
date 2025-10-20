-- Add SLA tracking columns to conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS first_response_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS sla_breach_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS auto_close_days integer DEFAULT 7;

-- Create index for performance on SLA queries
CREATE INDEX IF NOT EXISTS idx_conversations_first_response ON public.conversations(first_response_at);
CREATE INDEX IF NOT EXISTS idx_conversations_sla_breach ON public.conversations(sla_breach_at);
CREATE INDEX IF NOT EXISTS idx_conversations_auto_close ON public.conversations(status, updated_at) WHERE status IN ('pending', 'open');

-- Function to set first_response_at when agent first replies
CREATE OR REPLACE FUNCTION public.set_first_response_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only process agent messages (non-internal)
  IF NEW.sender_type = 'agent' AND NEW.is_internal = false THEN
    -- Update conversation first_response_at if not already set
    UPDATE public.conversations
    SET first_response_at = NEW.created_at
    WHERE id = NEW.conversation_id 
      AND first_response_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically set first_response_at
DROP TRIGGER IF EXISTS trigger_set_first_response ON public.messages;
CREATE TRIGGER trigger_set_first_response
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_first_response_time();

-- Function to calculate SLA breach time (24 hour SLA by default)
CREATE OR REPLACE FUNCTION public.calculate_sla_breach()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Update conversations that should have SLA breach time set
  -- Standard SLA: 24 hours for first response
  UPDATE public.conversations
  SET sla_breach_at = COALESCE(received_at, created_at) + interval '24 hours'
  WHERE sla_breach_at IS NULL
    AND status IN ('open', 'pending')
    AND first_response_at IS NULL;
    
  -- Clear SLA breach for conversations that were responded to
  UPDATE public.conversations
  SET sla_breach_at = NULL
  WHERE sla_breach_at IS NOT NULL
    AND first_response_at IS NOT NULL;
END;
$$;

-- Function to auto-close inactive conversations
CREATE OR REPLACE FUNCTION public.auto_close_inactive_conversations()
RETURNS TABLE(closed_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  count_closed bigint;
BEGIN
  -- Close conversations that have been pending for longer than auto_close_days
  WITH closed AS (
    UPDATE public.conversations
    SET 
      status = 'closed',
      updated_at = now()
    WHERE status = 'pending'
      AND updated_at < (now() - (auto_close_days || ' days')::interval)
      AND auto_close_days IS NOT NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO count_closed FROM closed;
  
  -- Log the auto-close action
  RAISE LOG 'Auto-closed % inactive conversations', count_closed;
  
  RETURN QUERY SELECT count_closed;
END;
$$;

-- Function to validate status transitions
CREATE OR REPLACE FUNCTION public.validate_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Allow any transition if no previous status (new conversation)
  IF OLD.status IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Validate status transitions based on business rules
  -- open -> pending, closed, archived (agent replies or closes)
  -- pending -> open, closed, archived (customer replies or agent closes)
  -- closed -> open, archived (customer replies or moved to archive)
  -- archived -> (no transitions allowed, must be unarchived first)
  
  IF OLD.status = 'archived' AND NEW.status != 'archived' THEN
    RAISE EXCEPTION 'Cannot change status of archived conversation. Unarchive first.';
  END IF;
  
  -- Log status changes for audit purposes
  RAISE LOG 'Status transition: % -> % for conversation %', OLD.status, NEW.status, NEW.id;
  
  RETURN NEW;
END;
$$;

-- Trigger for status transition validation
DROP TRIGGER IF EXISTS trigger_validate_status_transition ON public.conversations;
CREATE TRIGGER trigger_validate_status_transition
  BEFORE UPDATE OF status ON public.conversations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.validate_status_transition();

-- Create a helper function to get SLA status
CREATE OR REPLACE FUNCTION public.get_sla_status(
  first_response timestamp with time zone,
  sla_breach timestamp with time zone,
  conv_status text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- If already responded, SLA is met
  IF first_response IS NOT NULL THEN
    RETURN 'met';
  END IF;
  
  -- If closed/archived without response, mark as breached
  IF conv_status IN ('closed', 'archived') AND first_response IS NULL AND sla_breach IS NOT NULL THEN
    RETURN 'breached';
  END IF;
  
  -- If no SLA breach time set, return null
  IF sla_breach IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check if we're approaching breach (within 2 hours)
  IF now() > (sla_breach - interval '2 hours') AND now() < sla_breach THEN
    RETURN 'at_risk';
  END IF;
  
  -- Check if breached
  IF now() > sla_breach THEN
    RETURN 'breached';
  END IF;
  
  -- Otherwise on track
  RETURN 'on_track';
END;
$$;