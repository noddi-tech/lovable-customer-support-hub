UPDATE job_positions
SET scoring_rubric = '{"criteria":[{"id":"experience","name":"Relevant erfaring","description":"Years and depth of relevant experience","weight":50},{"id":"availability","name":"Tilgjengelighet","description":"Ability to start soon and work required hours","weight":30},{"id":"language","name":"Språk","description":"Norwegian or English communication ability","weight":20}]}'::jsonb
WHERE id = '05deb373-a9fb-4bb9-9fce-ff331cba2e74';

UPDATE application_scoring_queue
SET status = 'pending', attempts = 0, error_message = NULL, next_attempt_at = NULL
WHERE application_id = '14e8e047-d007-4e1b-93aa-1c86bfcbf819' AND status IN ('failed','pending','processing');