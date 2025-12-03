-- Mark all closed conversations as read to remove incorrect "New" badges
-- These conversations were imported from HelpScout with is_read = false
UPDATE public.conversations 
SET is_read = true, updated_at = now()
WHERE status = 'closed' AND is_read = false;