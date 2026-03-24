-- Temporarily disable the auto-update trigger
ALTER TABLE public.conversations DISABLE TRIGGER update_conversations_updated_at;

-- Backfill updated_at from the latest message
UPDATE public.conversations c
SET updated_at = sub.latest_msg
FROM (
  SELECT conversation_id, MAX(created_at) AS latest_msg
  FROM public.messages
  GROUP BY conversation_id
) sub
WHERE c.id = sub.conversation_id
  AND sub.latest_msg IS NOT NULL;

-- Re-enable the trigger
ALTER TABLE public.conversations ENABLE TRIGGER update_conversations_updated_at;