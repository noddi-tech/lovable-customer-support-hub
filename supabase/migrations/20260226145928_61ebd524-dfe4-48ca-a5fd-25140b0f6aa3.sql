-- Merge split conversations into the original thread
-- Move messages from conversation 53504a1c to 98e53a37
UPDATE messages 
SET conversation_id = '98e53a37-0ec2-456c-8fbc-ef2f476f49f9'
WHERE conversation_id = '53504a1c-6f94-49dc-b137-f349c8047b6a';

-- Move messages from conversation 75a89ca0 to 98e53a37
UPDATE messages 
SET conversation_id = '98e53a37-0ec2-456c-8fbc-ef2f476f49f9'
WHERE conversation_id = '75a89ca0-8f8c-4f6b-9290-845f9cb7acb5';

-- Reopen the original conversation since there are new messages
UPDATE conversations 
SET status = 'open', is_read = false, updated_at = now(), received_at = now()
WHERE id = '98e53a37-0ec2-456c-8fbc-ef2f476f49f9';

-- Delete the now-empty split conversations
DELETE FROM conversations WHERE id IN (
  '53504a1c-6f94-49dc-b137-f349c8047b6a',
  '75a89ca0-8f8c-4f6b-9290-845f9cb7acb5'
);