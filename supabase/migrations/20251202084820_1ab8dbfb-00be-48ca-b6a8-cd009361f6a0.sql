-- Clean up orphaned conversations referencing deleted inboxes
UPDATE conversations
SET inbox_id = NULL
WHERE inbox_id IS NOT NULL 
  AND inbox_id NOT IN (SELECT id FROM inboxes);

-- Add foreign key constraint to enable PostgREST nested queries
ALTER TABLE conversations 
ADD CONSTRAINT conversations_inbox_id_fkey 
FOREIGN KEY (inbox_id) REFERENCES inboxes(id) ON DELETE SET NULL;