-- Reset inbox data for fresh import to test improved formatting
-- Delete messages first (due to foreign key dependencies)
DELETE FROM public.messages;

-- Delete conversations
DELETE FROM public.conversations;

-- Delete customers (they'll be recreated during import)
DELETE FROM public.customers;

-- Reset the last sync timestamp to force a full re-import
UPDATE public.email_accounts 
SET last_sync_at = NULL 
WHERE email_address = 'joachim@noddi.no';