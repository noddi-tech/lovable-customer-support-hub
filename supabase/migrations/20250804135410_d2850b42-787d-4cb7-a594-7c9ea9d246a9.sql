-- Add email status tracking to messages table
ALTER TABLE public.messages 
ADD COLUMN email_status TEXT DEFAULT 'pending' CHECK (email_status IN ('pending', 'sending', 'sent', 'failed'));

-- Add index for better performance
CREATE INDEX idx_messages_email_status ON public.messages(email_status);

-- Update existing messages to have 'sent' status for non-internal messages from agents
UPDATE public.messages 
SET email_status = CASE 
  WHEN is_internal = true THEN 'sent'  -- Internal notes don't need email sending
  WHEN sender_type = 'customer' THEN 'sent'  -- Customer messages are already received
  ELSE 'pending'  -- Agent messages that might need sending
END;