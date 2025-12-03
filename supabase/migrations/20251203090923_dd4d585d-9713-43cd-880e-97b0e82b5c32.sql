-- Fix Noddi Admin Customer Support inbox sender_display_name
UPDATE public.inboxes 
SET sender_display_name = 'Noddi Admin Customer Support'
WHERE name = 'Noddi Admin Customer Support' 
  AND (sender_display_name = 'hei@noddi.no' OR sender_display_name IS NULL);