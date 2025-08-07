-- Delete all conversations and their associated messages for the current organization
DELETE FROM public.messages 
WHERE conversation_id IN (
  SELECT id FROM public.conversations 
  WHERE organization_id = (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

DELETE FROM public.conversations 
WHERE organization_id = (
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
);

-- Also delete any customers that might have been created during email import
DELETE FROM public.customers 
WHERE organization_id = (
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
);