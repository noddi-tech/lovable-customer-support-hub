-- Update sender_display_name for existing Noddi inboxes
UPDATE public.inboxes SET sender_display_name = 'Noddi Bedrift' WHERE id = 'ad066717-3a36-4aa8-ab0c-bc61c62d6934';
UPDATE public.inboxes SET sender_display_name = 'Noddi Recruitment' WHERE id = '0a4a06a4-498d-4d4b-97e3-87b5bb636ec7';
UPDATE public.inboxes SET sender_display_name = 'Noddi Support' WHERE id = '7641f399-9e93-4005-a35c-ff27114e5f9e';