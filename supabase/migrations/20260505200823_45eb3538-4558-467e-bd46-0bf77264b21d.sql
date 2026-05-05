INSERT INTO conversations (organization_id, inbox_id, channel, subject, conversation_type, applicant_id, status, received_at, external_id)
VALUES ('b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b', '0a4a06a4-498d-4d4b-97e3-87b5bb636ec7', 'email', 'Smoke test attach', 'recruitment', NULL, 'open', NOW(), 'smoke_test_attach_1')
ON CONFLICT DO NOTHING;