-- Delete all conversations (entire email threads) for the current organization
-- This will remove the conversation entries from the inbox
DELETE FROM public.conversations 
WHERE organization_id = (
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
);

-- Also delete any customers that were created during email import
DELETE FROM public.customers 
WHERE organization_id = (
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
);