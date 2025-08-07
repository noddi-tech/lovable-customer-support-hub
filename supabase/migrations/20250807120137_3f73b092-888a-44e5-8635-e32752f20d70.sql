-- Force delete all conversations and customers
-- Use a more direct approach
DO $$
DECLARE
    org_id uuid;
BEGIN
    -- Get the organization ID for the current user
    SELECT organization_id INTO org_id
    FROM public.profiles 
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    -- Log the organization ID for debugging
    RAISE NOTICE 'Organization ID: %', org_id;
    
    -- Delete all messages first (due to foreign key constraints)
    DELETE FROM public.messages 
    WHERE conversation_id IN (
        SELECT id FROM public.conversations 
        WHERE organization_id = org_id
    );
    
    -- Delete all conversations for this organization
    DELETE FROM public.conversations 
    WHERE organization_id = org_id;
    
    -- Delete all customers for this organization
    DELETE FROM public.customers 
    WHERE organization_id = org_id;
    
    -- Log results
    RAISE NOTICE 'Deletion completed for organization: %', org_id;
END $$;