UPDATE job_positions
SET scoring_enabled = true,
    scoring_rubric = '{"criteria":[{"key":"experience","label":"Relevant experience","weight":0.5,"description":"Years and depth of relevant experience"},{"key":"availability","label":"Availability","weight":0.3,"description":"Ability to start soon and work required hours"},{"key":"language","label":"Language fit","weight":0.2,"description":"Norwegian or English communication ability"}],"scale":{"min":1,"max":5}}'::jsonb
WHERE id = '05deb373-a9fb-4bb9-9fce-ff331cba2e74';

INSERT INTO application_scoring_queue (application_id, organization_id, trigger_reason, status)
VALUES ('14e8e047-d007-4e1b-93aa-1c86bfcbf819', 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b', 'manual', 'pending');