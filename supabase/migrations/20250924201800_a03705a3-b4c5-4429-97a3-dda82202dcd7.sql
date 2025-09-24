-- Move existing conversations from "Noddi Bedrift" to "Noddi" inbox
-- This will make all recent conversations visible in the main inbox
UPDATE public.conversations 
SET 
  inbox_id = '7641f399-9e93-4005-a35c-ff27114e5f9e', -- Noddi inbox
  updated_at = now()
WHERE 
  inbox_id = '9255819b-e8a5-44e9-bcbd-38ca5445663f' -- Noddi Bedrift inbox
  AND organization_id = (SELECT id FROM public.organizations WHERE slug = 'noddi');