-- Merge duplicate inboxes by moving conversations to older inboxes

-- Merge Noddi Recruitment (move from newer to older)
UPDATE conversations SET inbox_id = '0a4a06a4-498d-4d4b-97e3-87b5bb636ec7' 
WHERE inbox_id = '00c1ce6c-d1cd-46c8-be43-9987b10bbcbf';

-- Merge Noddi Bedrift (move from newer to older)
UPDATE conversations SET inbox_id = 'ad066717-3a36-4aa8-ab0c-bc61c62d6934' 
WHERE inbox_id = '0f7407f1-4dce-4665-97f8-29567de0ca4a';

-- Merge Noddi Admin Customer Support (move from newer to older)
UPDATE conversations SET inbox_id = '5ecee2f6-5628-4049-be7a-560c4c67f936' 
WHERE inbox_id = '89323f81-9fcd-420b-a25d-8a5a627983fd';

-- Delete the now-empty duplicate inboxes
DELETE FROM inboxes WHERE id IN (
  '00c1ce6c-d1cd-46c8-be43-9987b10bbcbf',
  '0f7407f1-4dce-4665-97f8-29567de0ca4a',
  '89323f81-9fcd-420b-a25d-8a5a627983fd'
);