-- Backfill sender_id for agent messages from response_tracking (high confidence)
UPDATE messages m
SET sender_id = rt.agent_id
FROM response_tracking rt
WHERE rt.message_id = m.id
  AND m.sender_id IS NULL
  AND m.sender_type = 'agent'
  AND rt.agent_id IS NOT NULL;

-- Backfill sender_id for remaining agent messages from conversation assignment
-- This assumes the assigned agent likely wrote the message
UPDATE messages m
SET sender_id = p.user_id
FROM conversations c
JOIN profiles p ON p.id = c.assigned_to_id
WHERE m.conversation_id = c.id
  AND m.sender_id IS NULL
  AND m.sender_type = 'agent'
  AND c.assigned_to_id IS NOT NULL;