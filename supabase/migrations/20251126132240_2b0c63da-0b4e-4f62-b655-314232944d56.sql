-- Delete messages for orphaned conversations (inbox that no longer exists)
DELETE FROM public.messages 
WHERE conversation_id IN (
  SELECT id FROM public.conversations 
  WHERE inbox_id = '9255819b-e8a5-44e9-bcbd-38ca5445663f'
);

-- Delete the orphaned conversations
DELETE FROM public.conversations 
WHERE inbox_id = '9255819b-e8a5-44e9-bcbd-38ca5445663f';