-- Set sender_display_name for imported HelpScout inboxes to ensure proper agent email attribution

UPDATE inboxes 
SET sender_display_name = 'hei@noddi.no'
WHERE id IN (
  '5ecee2f6-5628-4049-be7a-560c4c67f936', -- Noddi Admin Customer Support
  '0a4a06a4-498d-4d4b-97e3-87b5bb636ec7', -- Noddi Recruitment
  'ad066717-3a36-4aa8-ab0c-bc61c62d6934'  -- Noddi Bedrift
);