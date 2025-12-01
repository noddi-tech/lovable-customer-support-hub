-- Part 1: Update original Noddi inbox sender_display_name
UPDATE inboxes 
SET sender_display_name = 'hei@noddi.no'
WHERE id = '7641f399-9e93-4005-a35c-ff27114e5f9e';

-- Part 2: Clean up orphaned email_accounts (set inbox_id to NULL for non-existent inboxes)
UPDATE email_accounts
SET inbox_id = NULL
WHERE inbox_id IS NOT NULL 
  AND inbox_id NOT IN (SELECT id FROM inboxes);

-- Part 3: Add missing foreign key constraint for email_accounts.inbox_id
ALTER TABLE email_accounts 
ADD CONSTRAINT email_accounts_inbox_id_fkey 
FOREIGN KEY (inbox_id) REFERENCES inboxes(id) ON DELETE SET NULL;