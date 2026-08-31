ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS desktop_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS desktop_on_new_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS desktop_on_chat_message boolean NOT NULL DEFAULT true;