-- Add unique index on external_id to prevent duplicate messages
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_id_unique 
ON public.messages (external_id) 
WHERE external_id IS NOT NULL;