-- Fix inbox assignment for hei@inbound.noddi.no
-- Change from "Noddi Bedrift" inbox to "Noddi" inbox
UPDATE public.inbound_routes 
SET inbox_id = '7641f399-9e93-4005-a35c-ff27114e5f9e'
WHERE address = 'hei@inbound.noddi.no'
  AND inbox_id = '9255819b-e8a5-44e9-bcbd-38ca5445663f';