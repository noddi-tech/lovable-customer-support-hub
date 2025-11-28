-- Clear corrupted noddi_customer_cache entries
-- These were created when phone numbers with spaces were sent to the API, causing "user_does_not_exist" responses
DELETE FROM public.noddi_customer_cache 
WHERE noddi_user_id IS NULL 
AND phone IS NOT NULL;