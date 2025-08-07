-- Delete all conversations for the specific organization
-- Using the organization ID directly since auth.uid() doesn't work in migrations

-- Delete all messages first
DELETE FROM public.messages 
WHERE conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b'
);

-- Delete all conversations
DELETE FROM public.conversations 
WHERE organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b';

-- Delete all customers  
DELETE FROM public.customers 
WHERE organization_id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b';