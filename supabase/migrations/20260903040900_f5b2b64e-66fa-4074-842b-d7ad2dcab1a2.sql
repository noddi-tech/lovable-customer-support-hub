-- Default desktop (browser) notifications ON for new and existing users.
ALTER TABLE public.notification_preferences
  ALTER COLUMN desktop_enabled SET DEFAULT true;

UPDATE public.notification_preferences
SET desktop_enabled = true
WHERE desktop_enabled = false;
