-- Step 1: add snooze columns and index
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS snooze_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snoozed_by_id UUID;

CREATE INDEX IF NOT EXISTS idx_conversations_snooze_until ON public.conversations (snooze_until);
