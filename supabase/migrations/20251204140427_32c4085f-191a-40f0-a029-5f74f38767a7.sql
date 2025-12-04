-- Add conversation/email notification columns
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS email_on_conversation_assigned BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_on_new_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_on_customer_reply BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS app_on_conversation_assigned BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS app_on_new_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS app_on_customer_reply BOOLEAN DEFAULT true;

-- Add call notification columns
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS email_on_missed_call BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_on_voicemail BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS app_on_incoming_call BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS app_on_missed_call BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS app_on_voicemail BOOLEAN DEFAULT true;

-- Add mention notification columns
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS email_on_mention BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS app_on_mention BOOLEAN DEFAULT true;